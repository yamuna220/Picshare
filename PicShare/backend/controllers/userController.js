const fs = require('fs');
const path = require('path');
const { User, Post, Follow, Comment, Notification } = require('../models');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { canViewUserContent } = require('../middleware/authorizationMiddleware');
const { serializeUser, serializePost } = require('../utils/mediaUrl');

const removeOldProfileFile = (filename) => {
  if (!filename) {
    return;
  }
  const safeName = path.basename(filename);
  const fullPath = path.join(env.UPLOAD_ROOT, 'profiles', safeName);
  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, () => {});
  }
};

const removePostFile = (filename) => {
  if (!filename) {
    return;
  }
  const safeName = path.basename(filename);
  const fullPath = path.join(env.UPLOAD_ROOT, 'posts', safeName);
  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, () => {});
  }
};

const getMyProfile = asyncHandler(async (req, res) => {
  const posts = await Post.find({ author: req.user._id })
    .sort({ createdAt: -1 })
    .populate('author', 'username displayName profilePicture');

  res.status(200).json({
    success: true,
    data: {
      user: serializeUser(req.user, req, { includeEmail: true }),
      posts: posts.map((post) => serializePost(post, req, req.user._id)),
    },
  });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User account not found.');
  }

  const wasPrivate = Boolean(user.isPrivate);

  if (typeof req.body.displayName === 'string') {
    const trimmedName = req.body.displayName.trim();
    if (trimmedName.length > 50) {
      throw new ApiError(400, 'Display name cannot exceed 50 characters.');
    }
    user.displayName = trimmedName;
  }

  if (typeof req.body.bio === 'string') {
    const trimmedBio = req.body.bio.trim();
    if (trimmedBio.length > 150) {
      throw new ApiError(400, 'Bio cannot exceed 150 characters.');
    }
    user.bio = trimmedBio;
  }

  if (typeof req.body.isPrivate !== 'undefined') {
    if (typeof req.body.isPrivate === 'boolean') {
      user.isPrivate = req.body.isPrivate;
    } else if (typeof req.body.isPrivate === 'string') {
      user.isPrivate = req.body.isPrivate === 'true';
    }
  }

  if (req.file) {
    const previousFile = user.profilePicture;
    user.profilePicture = req.file.filename;
    if (previousFile && previousFile !== req.file.filename) {
      removeOldProfileFile(previousFile);
    }
  }

  // If switching from private to public, automatically accept pending follow requests
  if (wasPrivate && !user.isPrivate) {
    const pendingRequests = await Follow.find({
      following: user._id,
      status: 'pending',
    });

    if (pendingRequests.length > 0) {
      const requesterIds = pendingRequests.map((r) => r.follower);
      await Follow.updateMany(
        { following: user._id, status: 'pending' },
        { $set: { status: 'accepted' } }
      );
      user.followersCount = (user.followersCount || 0) + pendingRequests.length;
      await User.updateMany(
        { _id: { $in: requesterIds } },
        { $inc: { followingCount: 1 } }
      );
      await Notification.insertMany(
        requesterIds.map((requesterId) => ({
          recipient: requesterId,
          actor: user._id,
          type: 'follow_accept',
        }))
      );
    }
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: serializeUser(user, req, { includeEmail: true }),
  });
});

const uploadProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please select a JPG, JPEG, or PNG image file.');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User account not found.');
  }

  const previousFile = user.profilePicture;
  user.profilePicture = req.file.filename;
  await user.save();

  if (previousFile && previousFile !== req.file.filename) {
    removeOldProfileFile(previousFile);
  }

  res.status(200).json({
    success: true,
    message: 'Profile picture uploaded successfully.',
    data: serializeUser(user, req, { includeEmail: true }),
  });
});

const searchUsers = asyncHandler(async (req, res) => {
  const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!rawQuery) {
    return res.status(200).json({
      success: true,
      data: [],
    });
  }

  const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const users = await User.find({
    username: { $regex: escaped, $options: 'i' },
  })
    .limit(25)
    .sort({ username: 1 });

  return res.status(200).json({
    success: true,
    data: users.map((u) => serializeUser(u, req)),
  });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const targetUsername =
    typeof req.params.username === 'string'
      ? req.params.username.trim().toLowerCase()
      : '';

  const targetUser = await User.findOne({ username: targetUsername });
  if (!targetUser) {
    throw new ApiError(404, `User @${targetUsername} was not found.`);
  }

  const isOwnProfile = Boolean(req.user && req.user._id.equals(targetUser._id));
  let followStatus = 'none';
  let isFollowingViewer = false;

  if (req.user && !isOwnProfile) {
    const [relation, reverseRelation] = await Promise.all([
      Follow.findOne({
        follower: req.user._id,
        following: targetUser._id,
      }).lean(),
      Follow.findOne({
        follower: targetUser._id,
        following: req.user._id,
        status: 'accepted',
      }).lean(),
    ]);

    if (relation) {
      followStatus = relation.status;
    }
    isFollowingViewer = Boolean(reverseRelation);
  }

  const canViewPosts = await canViewUserContent(req.user, targetUser);
  let posts = [];

  if (canViewPosts) {
    const postDocs = await Post.find({ author: targetUser._id })
      .sort({ createdAt: -1 })
      .populate('author', 'username displayName profilePicture');
    posts = postDocs.map((post) =>
      serializePost(post, req, req.user ? req.user._id : null)
    );
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        ...serializeUser(targetUser, req),
        followStatus,
        isFollowingViewer,
        isOwnProfile,
        canViewPosts,
      },
      posts,
    },
  });
});

const deleteMyAccount = asyncHandler(async (req, res) => {
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!password) {
    throw new ApiError(400, 'Please enter your password to confirm account deletion.');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new ApiError(404, 'User account not found.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(400, 'Incorrect password. Account was not deleted.');
  }

  const userId = user._id;

  // 1. Delete user's own posts and uploaded post files
  const ownPosts = await Post.find({ author: userId }).select('_id imagePath').lean();
  const ownPostIds = ownPosts.map((p) => p._id);
  ownPosts.forEach((p) => removePostFile(p.imagePath));

  if (ownPostIds.length > 0) {
    await Comment.deleteMany({ post: { $in: ownPostIds } });
    await Post.deleteMany({ _id: { $in: ownPostIds } });
  }

  // 2. Remove user's comments on other posts and decrement their commentsCount
  const otherComments = await Comment.find({ author: userId }).select('post').lean();
  if (otherComments.length > 0) {
    const commentCountsByPost = new Map();
    otherComments.forEach((c) => {
      const pid = c.post.toString();
      commentCountsByPost.set(pid, (commentCountsByPost.get(pid) || 0) + 1);
    });
    await Comment.deleteMany({ author: userId });
    await Promise.all(
      Array.from(commentCountsByPost.entries()).map(async ([pid, dec]) => {
        const postDoc = await Post.findById(pid);
        if (postDoc) {
          postDoc.commentsCount = Math.max(0, (postDoc.commentsCount || 0) - dec);
          await postDoc.save();
        }
      })
    );
  }

  // 3. Remove user's likes from other posts and recalculate likesCount
  const likedPosts = await Post.find({ likes: userId });
  await Promise.all(
    likedPosts.map(async (postDoc) => {
      postDoc.likes = postDoc.likes.filter((uid) => !uid.equals(userId));
      postDoc.likesCount = postDoc.likes.length;
      await postDoc.save();
    })
  );

  // 4. Clean up Follow relations and update connected users' follower/following counts
  const acceptedFollowing = await Follow.find({
    follower: userId,
    status: 'accepted',
  })
    .select('following')
    .lean();
  if (acceptedFollowing.length > 0) {
    const followedUserIds = acceptedFollowing.map((f) => f.following);
    await Promise.all(
      followedUserIds.map(async (targetId) => {
        const target = await User.findById(targetId);
        if (target && target.followersCount > 0) {
          target.followersCount -= 1;
          await target.save();
        }
      })
    );
  }

  const acceptedFollowers = await Follow.find({
    following: userId,
    status: 'accepted',
  })
    .select('follower')
    .lean();
  if (acceptedFollowers.length > 0) {
    const followerUserIds = acceptedFollowers.map((f) => f.follower);
    await Promise.all(
      followerUserIds.map(async (followerId) => {
        const followerUser = await User.findById(followerId);
        if (followerUser && followerUser.followingCount > 0) {
          followerUser.followingCount -= 1;
          await followerUser.save();
        }
      })
    );
  }

  await Follow.deleteMany({
    $or: [{ follower: userId }, { following: userId }],
  });

  // 5. Delete notifications involving this user
  await Notification.deleteMany({
    $or: [{ recipient: userId }, { actor: userId }],
  });

  // 6. Delete profile picture file and user document
  removeOldProfileFile(user.profilePicture);
  await User.deleteOne({ _id: userId });

  res.status(200).json({
    success: true,
    message: 'Your account and associated data have been permanently deleted.',
  });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadProfilePicture,
  searchUsers,
  getUserProfile,
  deleteMyAccount,
};
