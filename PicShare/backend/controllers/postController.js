const fs = require('fs');
const path = require('path');
const { Post, Follow, Comment, Notification, User } = require('../models');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  canViewUserContent,
  assertOwnership,
} = require('../middleware/authorizationMiddleware');
const { serializePost, buildProfilePictureUrl } = require('../utils/mediaUrl');
const { isValidObjectId } = require('../utils/validators');

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

const createPost = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please select a JPG, JPEG, or PNG photograph to upload.');
  }

  const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() : '';
  if (caption.length > 2200) {
    removePostFile(req.file.filename);
    throw new ApiError(400, 'Caption cannot exceed 2200 characters.');
  }

  const post = await Post.create({
    author: req.user._id,
    imagePath: req.file.filename,
    caption,
  });

  await User.findByIdAndUpdate(req.user._id, {
    $inc: { postsCount: 1 },
  });

  const populatedPost = await Post.findById(post._id).populate(
    'author',
    'username displayName profilePicture'
  );

  res.status(201).json({
    success: true,
    message: 'Photograph published successfully.',
    data: serializePost(populatedPost, req, req.user._id),
  });
});

const getHomeFeed = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const acceptedFollows = await Follow.find({
    follower: req.user._id,
    status: 'accepted',
  })
    .select('following')
    .lean();

  const authorIds = [
    req.user._id,
    ...acceptedFollows.map((relation) => relation.following),
  ];

  const [posts, totalCount] = await Promise.all([
    Post.find({ author: { $in: authorIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName profilePicture'),
    Post.countDocuments({ author: { $in: authorIds } }),
  ]);

  const postIds = posts.map((p) => p._id);
  const comments = await Comment.find({ post: { $in: postIds } })
    .sort({ createdAt: 1 })
    .populate('author', 'username displayName profilePicture');

  const commentsByPostId = new Map();
  comments.forEach((comment) => {
    const key = comment.post.toString();
    if (!commentsByPostId.has(key)) {
      commentsByPostId.set(key, []);
    }
    commentsByPostId.get(key).push({
      id: comment._id.toString(),
      postId: key,
      author: {
        id: comment.author._id.toString(),
        username: comment.author.username,
        displayName: comment.author.displayName || '',
        profilePicture: buildProfilePictureUrl(req, comment.author.profilePicture),
      },
      text: comment.text,
      createdAt: comment.createdAt,
    });
  });

  const serializedPosts = posts.map((post) => {
    const base = serializePost(post, req, req.user._id);
    base.comments = commentsByPostId.get(base.id) || [];
    return base;
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  res.status(200).json({
    success: true,
    data: {
      posts: serializedPosts,
      page,
      limit,
      totalPages,
      totalCount,
      hasMore: page < totalPages,
    },
  });
});

const getExplorePosts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(36, Math.max(1, parseInt(req.query.limit, 10) || 24));
  const skip = (page - 1) * limit;

  const [publicUsers, acceptedFollows] = await Promise.all([
    User.find({ isPrivate: false }).select('_id').lean(),
    Follow.find({
      follower: req.user._id,
      status: 'accepted',
    })
      .select('following')
      .lean(),
  ]);

  const allowedIdMap = new Map();
  allowedIdMap.set(req.user._id.toString(), req.user._id);
  publicUsers.forEach((user) => {
    allowedIdMap.set(user._id.toString(), user._id);
  });
  acceptedFollows.forEach((relation) => {
    if (relation.following) {
      allowedIdMap.set(relation.following.toString(), relation.following);
    }
  });

  const allowedAuthorIds = Array.from(allowedIdMap.values());

  const [posts, totalCount] = await Promise.all([
    Post.find({ author: { $in: allowedAuthorIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName profilePicture'),
    Post.countDocuments({ author: { $in: allowedAuthorIds } }),
  ]);

  const serializedPosts = posts.map((post) =>
    serializePost(post, req, req.user._id)
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  res.status(200).json({
    success: true,
    data: {
      posts: serializedPosts,
      page,
      limit,
      totalPages,
      totalCount,
      hasMore: page < totalPages,
    },
  });
});

const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid post identifier.');
  }

  const post = await Post.findById(id);
  if (!post) {
    throw new ApiError(404, 'Post not found.');
  }

  assertOwnership(post.author, req.user._id, 'post');

  await Promise.all([
    Comment.deleteMany({ post: post._id }),
    Notification.deleteMany({ post: post._id }),
    Post.deleteOne({ _id: post._id }),
  ]);

  removePostFile(post.imagePath);

  const author = await User.findById(req.user._id);
  if (author && author.postsCount > 0) {
    author.postsCount -= 1;
    await author.save();
  }

  res.status(200).json({
    success: true,
    message: 'Post deleted successfully.',
  });
});

const likePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid post identifier.');
  }

  const post = await Post.findById(id).populate('author');
  if (!post) {
    throw new ApiError(404, 'Post not found.');
  }

  const allowed = await canViewUserContent(req.user, post.author);
  if (!allowed) {
    throw new ApiError(403, 'You do not have access to this post.');
  }

  const alreadyLiked = post.likes.some((uid) => uid.equals(req.user._id));
  if (!alreadyLiked) {
    post.likes.push(req.user._id);
    post.likesCount = post.likes.length;
    await post.save();

    if (!post.author._id.equals(req.user._id)) {
      await Notification.create({
        recipient: post.author._id,
        actor: req.user._id,
        type: 'like',
        post: post._id,
      });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      likesCount: post.likesCount,
      isLikedByCurrentUser: true,
    },
  });
});

const unlikePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid post identifier.');
  }

  const post = await Post.findById(id);
  if (!post) {
    throw new ApiError(404, 'Post not found.');
  }

  post.likes = post.likes.filter((uid) => !uid.equals(req.user._id));
  post.likesCount = post.likes.length;
  await post.save();

  res.status(200).json({
    success: true,
    data: {
      likesCount: post.likesCount,
      isLikedByCurrentUser: false,
    },
  });
});

const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid post identifier.');
  }

  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!text) {
    throw new ApiError(400, 'Comment text cannot be empty.');
  }
  if (text.length > 1000) {
    throw new ApiError(400, 'Comment cannot exceed 1000 characters.');
  }

  const post = await Post.findById(id).populate('author');
  if (!post) {
    throw new ApiError(404, 'Post not found.');
  }

  const allowed = await canViewUserContent(req.user, post.author);
  if (!allowed) {
    throw new ApiError(403, 'You do not have access to this post.');
  }

  const comment = await Comment.create({
    post: post._id,
    author: req.user._id,
    text,
  });

  post.commentsCount += 1;
  await post.save();

  if (!post.author._id.equals(req.user._id)) {
    await Notification.create({
      recipient: post.author._id,
      actor: req.user._id,
      type: 'comment',
      post: post._id,
      comment: comment._id,
    });
  }

  res.status(201).json({
    success: true,
    data: {
      id: comment._id.toString(),
      postId: post._id.toString(),
      author: {
        id: req.user._id.toString(),
        username: req.user.username,
        displayName: req.user.displayName || '',
        profilePicture: buildProfilePictureUrl(req, req.user.profilePicture),
      },
      text: comment.text,
      createdAt: comment.createdAt,
      commentsCount: post.commentsCount,
    },
  });
});

const getPostById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid post identifier.');
  }

  const post = await Post.findById(id).populate(
    'author',
    'username displayName profilePicture isPrivate'
  );
  if (!post) {
    throw new ApiError(404, 'Post not found.');
  }

  const allowed = await canViewUserContent(req.user, post.author);
  if (!allowed) {
    throw new ApiError(403, 'You do not have access to this private post.');
  }

  const comments = await Comment.find({ post: post._id })
    .sort({ createdAt: 1 })
    .populate('author', 'username displayName profilePicture');

  const base = serializePost(post, req, req.user._id);
  base.comments = comments.map((comment) => ({
    id: comment._id.toString(),
    postId: post._id.toString(),
    author: {
      id: comment.author._id.toString(),
      username: comment.author.username,
      displayName: comment.author.displayName || '',
      profilePicture: buildProfilePictureUrl(req, comment.author.profilePicture),
    },
    text: comment.text,
    createdAt: comment.createdAt,
  }));

  res.status(200).json({
    success: true,
    data: base,
  });
});

module.exports = {
  createPost,
  getHomeFeed,
  getExplorePosts,
  getPostById,
  deletePost,
  likePost,
  unlikePost,
  addComment,
};
