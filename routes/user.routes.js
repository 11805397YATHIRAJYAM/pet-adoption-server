import express from 'express';
import {
  getProfile,
  updateProfile,
  deleteAccount,
  getFavorites,
  getUserApplications,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getAllUsers,
  getUserById,
} from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { uploadAvatar } from '../config/cloudinary.js';

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', uploadAvatar.single('avatar'), updateProfile);
router.delete('/', deleteAccount);

router.get('/favorites', getFavorites);
router.get('/applications', getUserApplications);

router.get('/notifications', getNotifications);
router.put('/notifications/read-all', markAllNotificationsRead);
router.put('/notifications/:id/read', markNotificationRead);

// Admin routes
router.get('/', authorize('admin'), getAllUsers);
router.get('/:id', authorize('admin'), getUserById);

export default router;
