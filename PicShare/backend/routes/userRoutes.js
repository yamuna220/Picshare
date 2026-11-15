const express = require('express');
const {
  getMyProfile,
  updateMyProfile,
  uploadProfilePicture,
  searchUsers,
  getUserProfile,
  deleteMyAccount,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfileImage } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);

router.get('/me', getMyProfile);
router.put('/me', uploadProfileImage.single('profilePicture'), updateMyProfile);
router.delete('/me', deleteMyAccount);
router.put(
  '/me/profile-picture',
  uploadProfileImage.single('profilePicture'),
  uploadProfilePicture
);
router.get('/search', searchUsers);
router.get('/:username', getUserProfile);

module.exports = router;
