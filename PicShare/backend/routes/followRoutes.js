const express = require('express');
const {
  followUser,
  unfollowUser,
  removeFollower,
  getPendingRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  getFollowers,
  getFollowing,
} = require('../controllers/followController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Follow requests (account owner only)
router.get('/requests', getPendingRequests);
router.post('/requests/:requestId/accept', acceptFollowRequest);
router.post('/requests/:requestId/reject', rejectFollowRequest);

// Followers & following lists
router.get('/me/followers', getFollowers);
router.get('/me/following', getFollowing);
router.delete('/followers/:userId', removeFollower);
router.get('/:username/followers', getFollowers);
router.get('/:username/following', getFollowing);

// Follow / unfollow / cancel request
router.post('/:userId', followUser);
router.delete('/:userId', unfollowUser);

module.exports = router;
