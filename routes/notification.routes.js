import express from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.get('/', getNotifications);
router.put('/read-all', markAllNotificationsRead);
router.put('/:id/read', markNotificationRead);

export default router;
