const express = require('express');
const {
  createPost,
  getHomeFeed,
  getExplorePosts,
  getPostById,
  deletePost,
  likePost,
  unlikePost,
  addComment,
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const { uploadPostImage } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);

router.get('/feed', getHomeFeed);
router.get('/explore', getExplorePosts);
router.post('/', uploadPostImage.single('image'), createPost);
router.get('/:id', getPostById);
router.delete('/:id', deletePost);
router.post('/:id/like', likePost);
router.delete('/:id/like', unlikePost);
router.post('/:id/comments', addComment);

module.exports = router;
