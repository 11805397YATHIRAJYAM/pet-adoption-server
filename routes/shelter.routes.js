import express from 'express';
import {
  createShelter,
  getShelters,
  getShelterById,
  getMyShelter,
  updateShelter,
  deleteShelter,
  approveShelter,
  getShelterAnalytics,
} from '../controllers/shelter.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { uploadAvatar } from '../config/cloudinary.js';

const router = express.Router();

router.get('/', getShelters);
router.get('/:id', getShelterById);

router.use(protect);
router.post('/', uploadAvatar.single('logo'), createShelter);
router.get('/my/profile', getMyShelter);
router.put('/:id', uploadAvatar.single('logo'), updateShelter);
router.get('/:id/analytics', getShelterAnalytics);
router.put('/:id/approve', authorize('admin'), approveShelter);
router.delete('/:id', authorize('admin'), deleteShelter);

export default router;
