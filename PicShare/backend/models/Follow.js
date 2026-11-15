const mongoose = require('mongoose');

const FOLLOW_STATUSES = ['pending', 'accepted'];

const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Follower user reference is required'],
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Following user reference is required'],
    },
    status: {
      type: String,
      enum: {
        values: FOLLOW_STATUSES,
        message: 'Follow status must be either pending or accepted',
      },
      default: 'accepted',
    },
  },
  {
    timestamps: true,
  }
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, status: 1 });
followSchema.index({ follower: 1, status: 1 });

followSchema.pre('validate', function preventSelfFollow(next) {
  if (this.follower && this.following && this.follower.equals(this.following)) {
    this.invalidate('following', 'Users cannot follow themselves');
  }
  next();
});

module.exports = mongoose.model('Follow', followSchema);
