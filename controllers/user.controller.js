import User from '../models/User.model.js';
import Application from '../models/Application.model.js';
import Favorite from '../models/Favorite.model.js';
import Notification from '../models/Notification.model.js';
import { asyncHandler, createError } from '../utils/error.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';
import { getPaginationParams, paginateResponse } from '../utils/pagination.js';

// @GET /api/users/profile
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
});

// @PUT /api/users/profile
export const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, phone, bio, address, preferences } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return next(createError(404, 'User not found.'));

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (bio !== undefined) user.bio = bio;
  if (address) user.address = { ...user.address, ...address };
  if (preferences) user.preferences = { ...user.preferences, ...preferences };

  // Avatar upload
  if (req.file) {
    if (user.avatar?.publicId) {
      await deleteFromCloudinary(user.avatar.publicId);
    }
    user.avatar = { url: req.file.path, publicId: req.file.filename };
  }

  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'Profile updated.', user });
});

// @DELETE /api/users
export const deleteAccount = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(createError(404, 'User not found.'));

  user.isActive = false;
  await user.save({ validateBeforeSave: false });

  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Account deactivated.' });
});

// @GET /api/users/favorites
export const getFavorites = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const [favorites, total] = await Promise.all([
    Favorite.find({ user: req.user._id })
      .populate({ path: 'pet', populate: { path: 'shelter', select: 'name' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Favorite.countDocuments({ user: req.user._id }),
  ]);
  res.json({ success: true, ...paginateResponse(favorites, total, page, limit) });
});

// @GET /api/users/applications
export const getUserApplications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = { applicant: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate('pet', 'name images species breed')
      .populate('shelter', 'name logo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Application.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginateResponse(applications, total, page, limit) });
});

// @GET /api/users/notifications
export const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = { recipient: req.user._id };
  if (req.query.unread === 'true') filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  res.json({ success: true, ...paginateResponse(notifications, total, page, limit), unreadCount });
});

// @PUT /api/users/notifications/:id/read
export const markNotificationRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
  if (!notification) return next(createError(404, 'Notification not found.'));

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();
  res.json({ success: true, notification });
});

// @PUT /api/users/notifications/read-all
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  res.json({ success: true, message: 'All notifications marked as read.' });
});

// @GET /api/users (admin)
export const getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginateResponse(users, total, page, limit) });
});

// @GET /api/users/:id (admin or self)
export const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(createError(404, 'User not found.'));
  res.json({ success: true, user });
});
