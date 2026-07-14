import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'shelter', 'foster', 'user'],
      default: 'user',
    },
    avatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    phone: { type: String, trim: true },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'US' },
    },
    bio: { type: String, maxlength: [500, 'Bio cannot exceed 500 characters'] },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
    suspendedReason: String,

    // Preferences for notifications/matching
    preferences: {
      species: [String],
      breeds: [String],
      ageRange: { min: Number, max: Number },
      size: [String],
      notifications: {
        email: { type: Boolean, default: true },
        application: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        favorites: { type: Boolean, default: true },
      },
    },

    // Tokens
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    refreshToken: String,

    lastLogin: Date,
    shelter: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelter' },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return token;
};

// Hide sensitive fields in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.passwordResetToken;
  delete obj.refreshToken;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
