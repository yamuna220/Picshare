const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const postRoutes = require('./postRoutes');
const followRoutes = require('./followRoutes');
const notificationRoutes = require('./notificationRoutes');
const mediaRoutes = require('./mediaRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/follows', followRoutes);
router.use('/notifications', notificationRoutes);
router.use('/media', mediaRoutes);

module.exports = router;
