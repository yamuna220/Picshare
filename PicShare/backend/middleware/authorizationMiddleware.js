const { Follow } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Checks whether the requesting user is allowed to view posts or private media
 * belonging to targetUser.
 */
const canViewUserContent = async (viewerUser, targetUser) => {
  if (!targetUser) {
    return false;
  }

  if (!targetUser.isPrivate) {
    return true;
  }

  if (!viewerUser) {
    return false;
  }

  if (viewerUser._id.equals(targetUser._id)) {
    return true;
  }

  const approvedFollow = await Follow.findOne({
    follower: viewerUser._id,
    following: targetUser._id,
    status: 'accepted',
  }).lean();

  return Boolean(approvedFollow);
};

/**
 * Ensures the authenticated user owns the target resource.
 */
const assertOwnership = (ownerId, requesterId, resourceLabel = 'resource') => {
  if (!requesterId || !ownerId || !ownerId.equals(requesterId)) {
    throw new ApiError(403, `You do not have permission to modify this ${resourceLabel}.`);
  }
};

module.exports = {
  canViewUserContent,
  assertOwnership,
};
