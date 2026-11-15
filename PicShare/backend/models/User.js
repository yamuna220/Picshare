const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { EMAIL_REGEX, USERNAME_REGEX } = require('../utils/validators');

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [
        USERNAME_REGEX,
        'Username may only contain letters, numbers, periods, and underscores',
      ],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [150, 'Bio cannot exceed 150 characters'],
      default: '',
    },
    profilePicture: {
      type: String,
      default: '',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    postsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    followersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    return next();
  } catch (err) {
    return next(err);
  }
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicProfile = function toPublicProfile() {
  return {
    id: this._id,
    username: this.username,
    displayName: this.displayName,
    bio: this.bio,
    profilePicture: this.profilePicture,
    isPrivate: this.isPrivate,
    postsCount: this.postsCount,
    followersCount: this.followersCount,
    followingCount: this.followingCount,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
