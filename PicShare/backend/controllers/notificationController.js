const { Notification, Follow } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { buildProfilePictureUrl, buildPostImageUrl } = require('../utils/mediaUrl');
const { isValidObjectId } = require('../utils/validators');

const serializeNotification = (doc, req) => {
  const actorDoc = doc.actor;
  const postDoc = doc.post;

  return {
    id: doc._id.toString(),
    type: doc.type,
    actor:
      actorDoc && actorDoc._id
        ? {
            id: actorDoc._id.toString(),
            username: actorDoc.username,
            displayName: actorDoc.displayName || '',
            profilePicture: buildProfilePictureUrl(req, actorDoc.profilePicture),
          }
        : {
            id: '',
            username: 'unknown',
            displayName: '',
            profilePicture: '',
          },
    postId: postDoc && postDoc._id ? postDoc._id.toString() : doc.post ? doc.post.toString() : null,
    postThumbnailUrl:
      postDoc && postDoc.imagePath ? buildPostImageUrl(req, postDoc.imagePath) : null,
    isRead: Boolean(doc.isRead),
    createdAt: doc.createdAt,
  };
};

const getNotifications = asyncHandler(async (req, res) => {
  const [docs, unreadCount, pendingRequestsCount] = await Promise.all([
    Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('actor', 'username displayName profilePicture')
      .populate('post', 'imagePath caption'),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    Follow.countDocuments({ following: req.user._id, status: 'pending' }),
  ]);

  res.status(200).json({
    success: true,
    data: docs.map((d) => serializeNotification(d, req)),
    meta: {
      unreadCount,
      pendingRequestsCount,
    },
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const [unreadCount, pendingRequestsCount] = await Promise.all([
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    Follow.countDocuments({ following: req.user._id, status: 'pending' }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      unreadCount,
      pendingRequestsCount,
    },
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid notification identifier.');
  }

  const notification = await Notification.findById(id)
    .populate('actor', 'username displayName profilePicture')
    .populate('post', 'imagePath caption');

  if (!notification) {
    throw new ApiError(404, 'Notification not found.');
  }

  if (!notification.recipient.equals(req.user._id)) {
    throw new ApiError(403, 'You are not authorized to update this notification.');
  }

  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    data: {
      notification: serializeNotification(notification, req),
      unreadCount,
    },
  });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read.',
    data: {
      unreadCount: 0,
    },
  });
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
