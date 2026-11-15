const buildProfilePictureUrl = (req, filename) => {
  if (!filename) {
    return '';
  }
  if (
    filename.startsWith('http://') ||
    filename.startsWith('https://') ||
    filename.startsWith('/api/media/profiles/')
  ) {
    return filename;
  }
  return `/api/media/profiles/${encodeURIComponent(filename)}`;
};

const buildPostImageUrl = (req, filename) => {
  if (!filename) {
    return '';
  }
  if (
    filename.startsWith('http://') ||
    filename.startsWith('https://') ||
    filename.startsWith('/api/media/posts/')
  ) {
    return filename;
  }
  return `/api/media/posts/${encodeURIComponent(filename)}`;
};

const serializeUser = (userDoc, req, options = {}) => {
  if (!userDoc) {
    return null;
  }

  const serialized = {
    id: userDoc._id.toString(),
    username: userDoc.username,
    displayName: userDoc.displayName || '',
    bio: userDoc.bio || '',
    profilePicture: buildProfilePictureUrl(req, userDoc.profilePicture),
    isPrivate: Boolean(userDoc.isPrivate),
    postsCount: userDoc.postsCount || 0,
    followersCount: userDoc.followersCount || 0,
    followingCount: userDoc.followingCount || 0,
    createdAt: userDoc.createdAt,
  };

  if (options.includeEmail && userDoc.email) {
    serialized.email = userDoc.email;
  }

  return serialized;
};

const serializePost = (postDoc, req, currentUserId = null) => {
  const authorDoc = postDoc.author;
  const likesArray = Array.isArray(postDoc.likes) ? postDoc.likes : [];
  const isLiked = currentUserId
    ? likesArray.some((id) => id.toString() === currentUserId.toString())
    : false;

  return {
    id: postDoc._id.toString(),
    author: authorDoc && authorDoc._id
      ? {
          id: authorDoc._id.toString(),
          username: authorDoc.username,
          displayName: authorDoc.displayName || '',
          profilePicture: buildProfilePictureUrl(req, authorDoc.profilePicture),
        }
      : {
          id: postDoc.author ? postDoc.author.toString() : '',
          username: '',
          displayName: '',
          profilePicture: '',
        },
    imageUrl: buildPostImageUrl(req, postDoc.imagePath),
    caption: postDoc.caption || '',
    likesCount: postDoc.likesCount || 0,
    commentsCount: postDoc.commentsCount || 0,
    isLikedByCurrentUser: isLiked,
    createdAt: postDoc.createdAt,
  };
};

module.exports = {
  buildProfilePictureUrl,
  buildPostImageUrl,
  serializeUser,
  serializePost,
};
