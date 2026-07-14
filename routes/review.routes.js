import express from 'express';
import {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  markHelpful,
  moderateReview,
} from '../controllers/review.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { uploadReviewImages } from '../config/cloudinary.js';

const router = express.Router();

router.get('/', getReviews);
router.get('/:id', getReviewById);

router.use(protect);
router.post('/', uploadReviewImages.fields([{ name: 'images', maxCount: 5 }]), createReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.put('/:id/helpful', markHelpful);
router.put('/:id/moderate', authorize('admin'), moderateReview);

export default router;
