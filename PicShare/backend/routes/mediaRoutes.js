const express = require('express');
const {
  serveProfilePicture,
  servePostImage,
} = require('../controllers/mediaController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/profiles/:filename', serveProfilePicture);
router.get('/posts/:filename', optionalAuth, servePostImage);

module.exports = router;
