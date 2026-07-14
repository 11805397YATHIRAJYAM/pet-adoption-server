import crypto from 'crypto';
import User from '../models/User.model.js';
import Shelter from '../models/Shelter.model.js';
import { asyncHandler, createError } from '../utils/error.js';
import { sendTokenResponse, clearTokenCookies, generateAccessToken } from '../utils/jwt.js';
import {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../services/email.service.js';

// @POST /api/auth/register
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, phone } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) return next(createError(409, 'Email already registered.'));

  const allowedRoles = ['user', 'foster'];
  const userRole = allowedRoles.includes(role) ? role : 'user';

  const user = await User.create({ name, email, password, role: userRole, phone });

  // Send verification email
  const verificationToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  await sendVerificationEmail(user, verificationToken);
  await sendWelcomeEmail(user);

  sendTokenResponse(user, 201, res);
});

// @POST /api/auth/login
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) return next(createError(400, 'Email and password are required.'));

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) return next(createError(401, 'Invalid email or password.'));

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return next(createError(401, 'Invalid email or password.'));

  if (user.isSuspended) return next(createError(403, `Account suspended: ${user.suspendedReason}`));
  if (!user.isActive) return next(createError(401, 'Account deactivated.'));

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Include shelter info if shelter role
  let shelterData = null;
  if (user.role === 'shelter') {
    shelterData = await Shelter.findOne({ owner: user._id }).select('_id name isApproved');
  }

  const responseUser = user.toObject();
  delete responseUser.password;
  if (shelterData) responseUser.shelterInfo = shelterData;

  sendTokenResponse({ ...responseUser, toObject: () => responseUser }, 200, res);
});

// @POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  clearTokenCookies(res);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// @GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  let shelterData = null;
  if (user.role === 'shelter') {
    shelterData = await Shelter.findOne({ owner: user._id }).select('_id name isApproved logo');
  }
  const userData = user.toObject();
  if (shelterData) userData.shelterInfo = shelterData;
  res.json({ success: true, user: userData });
});

// @GET /api/auth/verify-email/:token
export const verifyEmail = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });
  if (!user) return next(createError(400, 'Invalid or expired verification token.'));

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Email verified successfully.' });
});

// @POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return next(createError(404, 'No account found with that email.'));

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });
  await sendPasswordResetEmail(user, resetToken);

  res.json({ success: true, message: 'Password reset email sent.' });
});

// @POST /api/auth/reset-password/:token
export const resetPassword = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) return next(createError(400, 'Invalid or expired reset token.'));

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @POST /api/auth/change-password
export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return next(createError(401, 'Current password is incorrect.'));

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @POST /api/auth/resend-verification
export const resendVerification = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (user.isEmailVerified) return next(createError(400, 'Email already verified.'));

  const token = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  await sendVerificationEmail(user, token);

  res.json({ success: true, message: 'Verification email resent.' });
});
