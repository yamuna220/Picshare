const { User, Follow, Notification } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { canViewUserContent } = require('../middleware/authorizationMiddleware');
const { serializeUser, buildProfilePictureUrl } = require('../utils/mediaUrl');
const { isValidObjectId } = require('../utils/validators');

const annotateFollowUsers = async (users, viewerId, req) => {
  if (!users.length) {
    return [];
  }

  const userIds = users.map((u) => u._id);

  const [viewerOutgoing, viewerIncoming] = await Promise.all([
    Follow.find({
      follower: viewerId,
      following: { $in: userIds },
    })
      .select('following status')
      .lean(),
    Follow.find({
      follower: { $in: userIds },
      following: viewerId,
      status: 'accepted',
    })
      .select('follower')
      .lean(),
  ]);

  const outgoingMap = new Map();
  viewerOutgoing.forEach((rel) => {
    outgoingMap.set(rel.following.toString(), rel.status);
  });

  const incomingSet = new Set(
    viewerIncoming.map((rel) => rel.follower.toString())
  );

  return users.map((u) => {
    const idStr = u._id.toString();
    const isOwnProfile = u._id.equals(viewerId);
    return {
      ...serializeUser(u, req),
      followStatus: isOwnProfile ? 'none' : outgoingMap.get(idStr) || 'none',
      isFollowingViewer: isOwnProfile ? false : incomingSet.has(idStr),
      isOwnProfile,
    };
  });
};

const followUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid user identifier.');
  }

  if (req.user._id.equals(userId)) {
    throw new ApiError(400, 'You cannot follow your own account.');
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(404, 'User not found.');
  }

  const [existing, reverseAccepted] = await Promise.all([
    Follow.findOne({ follower: req.user._id, following: targetUser._id }),
    Follow.findOne({
      follower: targetUser._id,
      following: req.user._id,
      status: 'accepted',
    }).lean(),
  ]);

  if (existing) {
    return res.status(200).json({
      success: true,
      message:
        existing.status === 'pending'
          ? 'Follow request is already pending.'
          : 'You are already following this user.',
      data: {
        followStatus: existing.status,
        isFollowingViewer: Boolean(reverseAccepted),
        followersCount: targetUser.followersCount || 0,
        followingCount: req.user.followingCount || 0,
        canViewPosts: !targetUser.isPrivate || existing.status === 'accepted',
      },
    });
  }

  const status = targetUser.isPrivate ? 'pending' : 'accepted';

  await Follow.create({
    follower: req.user._id,
    following: targetUser._id,
    status,
  });

  if (status === 'accepted') {
    targetUser.followersCount = (targetUser.followersCount || 0) + 1;
    await targetUser.save();

    const currentUser = await User.findById(req.user._id);
    if (currentUser) {
      currentUser.followingCount = (currentUser.followingCount || 0) + 1;
      await currentUser.save();
    }

    await Notification.create({
      recipient: targetUser._id,
      actor: req.user._id,
      type: 'follow',
    });

    return res.status(201).json({
      success: true,
      message: `You are now following @${targetUser.username}.`,
      data: {
        followStatus: 'accepted',
        isFollowingViewer: Boolean(reverseAccepted),
        followersCount: targetUser.followersCount,
        followingCount: currentUser ? currentUser.followingCount : req.user.followingCount || 0,
        canViewPosts: true,
      },
    });
  }

  await Notification.create({
    recipient: targetUser._id,
    actor: req.user._id,
    type: 'follow_request',
  });

  return res.status(201).json({
    success: true,
    message: `Follow request sent to @${targetUser.username}.`,
    data: {
      followStatus: 'pending',
      isFollowingViewer: Boolean(reverseAccepted),
      followersCount: targetUser.followersCount || 0,
      followingCount: req.user.followingCount || 0,
      canViewPosts: false,
    },
  });
});

const unfollowUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid user identifier.');
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(404, 'User not found.');
  }

  const [existing, reverseAccepted] = await Promise.all([
    Follow.findOne({ follower: req.user._id, following: targetUser._id }),
    Follow.findOne({
      follower: targetUser._id,
      following: req.user._id,
      status: 'accepted',
    }).lean(),
  ]);

  let currentFollowingCount = req.user.followingCount || 0;

  if (existing) {
    const wasAccepted = existing.status === 'accepted';
    await Follow.deleteOne({ _id: existing._id });

    if (wasAccepted) {
      if (targetUser.followersCount > 0) {
        targetUser.followersCount -= 1;
        await targetUser.save();
      }
      const currentUser = await User.findById(req.user._id);
      if (currentUser && currentUser.followingCount > 0) {
        currentUser.followingCount -= 1;
        await currentUser.save();
      }
      if (currentUser) {
        currentFollowingCount = currentUser.followingCount;
      }
    } else {
      await Notification.deleteMany({
        recipient: targetUser._id,
        actor: req.user._id,
        type: 'follow_request',
      });
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Follow relationship removed.',
    data: {
      followStatus: 'none',
      isFollowingViewer: Boolean(reverseAccepted),
      followersCount: targetUser.followersCount || 0,
      followingCount: currentFollowingCount,
      canViewPosts: !targetUser.isPrivate,
    },
  });
});

const removeFollower = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid user identifier.');
  }

  const relation = await Follow.findOne({
    follower: userId,
    following: req.user._id,
    status: 'accepted',
  });

  if (!relation) {
    throw new ApiError(404, 'Follower relationship not found.');
  }

  await Follow.deleteOne({ _id: relation._id });

  const [currentUser, followerUser] = await Promise.all([
    User.findById(req.user._id),
    User.findById(userId),
  ]);

  if (currentUser && currentUser.followersCount > 0) {
    currentUser.followersCount -= 1;
    await currentUser.save();
  }
  if (followerUser && followerUser.followingCount > 0) {
    followerUser.followingCount -= 1;
    await followerUser.save();
  }

  res.status(200).json({
    success: true,
    message: 'Follower removed.',
    data: {
      followersCount: currentUser ? currentUser.followersCount : 0,
    },
  });
});

const getPendingRequests = asyncHandler(async (req, res) => {
  const pendingDocs = await Follow.find({
    following: req.user._id,
    status: 'pending',
  })
    .sort({ createdAt: -1 })
    .populate('follower', 'username displayName profilePicture');

  const items = pendingDocs
    .filter((doc) => doc.follower)
    .map((doc) => ({
      id: doc._id.toString(),
      requester: {
        id: doc.follower._id.toString(),
        username: doc.follower.username,
        displayName: doc.follower.displayName || '',
        profilePicture: buildProfilePictureUrl(req, doc.follower.profilePicture),
      },
      createdAt: doc.createdAt,
    }));

  res.status(200).json({
    success: true,
    data: items,
  });
});

const acceptFollowRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  if (!isValidObjectId(requestId)) {
    throw new ApiError(400, 'Invalid follow request identifier.');
  }

  const followDoc = await Follow.findById(requestId);
  if (!followDoc) {
    throw new ApiError(404, 'Follow request not found.');
  }

  if (!followDoc.following.equals(req.user._id)) {
    throw new ApiError(403, 'You are not authorized to accept this follow request.');
  }

  if (followDoc.status !== 'pending') {
    throw new ApiError(400, 'This follow request has already been processed.');
  }

  followDoc.status = 'accepted';
  await followDoc.save();

  const [currentUser, requester] = await Promise.all([
    User.findById(req.user._id),
    User.findById(followDoc.follower),
  ]);

  if (currentUser) {
    currentUser.followersCount = (currentUser.followersCount || 0) + 1;
    await currentUser.save();
  }
  if (requester) {
    requester.followingCount = (requester.followingCount || 0) + 1;
    await requester.save();
  }

  await Notification.updateMany(
    {
      recipient: req.user._id,
      actor: followDoc.follower,
      type: 'follow_request',
      isRead: false,
    },
    { $set: { isRead: true } }
  );

  await Notification.create({
    recipient: followDoc.follower,
    actor: req.user._id,
    type: 'follow_accept',
  });

  res.status(200).json({
    success: true,
    message: 'Follow request accepted.',
    data: {
      requestId: followDoc._id.toString(),
      followersCount: currentUser ? currentUser.followersCount : 0,
    },
  });
});

const rejectFollowRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  if (!isValidObjectId(requestId)) {
    throw new ApiError(400, 'Invalid follow request identifier.');
  }

  const followDoc = await Follow.findById(requestId);
  if (!followDoc) {
    throw new ApiError(404, 'Follow request not found.');
  }

  if (!followDoc.following.equals(req.user._id)) {
    throw new ApiError(403, 'You are not authorized to reject this follow request.');
  }

  if (followDoc.status !== 'pending') {
    throw new ApiError(400, 'This follow request has already been processed.');
  }

  await Follow.deleteOne({ _id: followDoc._id });

  await Notification.deleteMany({
    recipient: req.user._id,
    actor: followDoc.follower,
    type: 'follow_request',
  });

  res.status(200).json({
    success: true,
    message: 'Follow request declined.',
    data: {
      requestId: followDoc._id.toString(),
    },
  });
});

const resolveTargetUser = async (req) => {
  const rawUsername = req.params.username;
  if (!rawUsername) {
    return req.user;
  }

  const normalized = rawUsername.trim().toLowerCase();
  const targetUser = await User.findOne({ username: normalized });
  if (!targetUser) {
    throw new ApiError(404, `User @${normalized} was not found.`);
  }
  return targetUser;
};

const getFollowers = asyncHandler(async (req, res) => {
  const targetUser = await resolveTargetUser(req);
  const allowed = await canViewUserContent(req.user, targetUser);
  if (!allowed) {
    throw new ApiError(403, 'Follow this private account to see their followers.');
  }

  const followDocs = await Follow.find({
    following: targetUser._id,
    status: 'accepted',
  })
    .sort({ createdAt: -1 })
    .populate('follower');

  const followerUsers = followDocs.map((d) => d.follower).filter(Boolean);
  const annotated = await annotateFollowUsers(followerUsers, req.user._id, req);

  res.status(200).json({
    success: true,
    data: annotated,
  });
});

const getFollowing = asyncHandler(async (req, res) => {
  const targetUser = await resolveTargetUser(req);
  const allowed = await canViewUserContent(req.user, targetUser);
  if (!allowed) {
    throw new ApiError(403, 'Follow this private account to see who they follow.');
  }

  const followDocs = await Follow.find({
    follower: targetUser._id,
    status: 'accepted',
  })
    .sort({ createdAt: -1 })
    .populate('following');

  const followingUsers = followDocs.map((d) => d.following).filter(Boolean);
  const annotated = await annotateFollowUsers(followingUsers, req.user._id, req);

  res.status(200).json({
    success: true,
    data: annotated,
  });
});

module.exports = {
  followUser,
  unfollowUser,
  removeFollower,
  getPendingRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  getFollowers,
  getFollowing,
};
