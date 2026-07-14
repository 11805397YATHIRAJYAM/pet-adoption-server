import express from 'express';
import {
  applyToFoster,
  getFosterApplications,
  getFosterApplicationById,
  updateFosterApplication,
  addProgressReport,
  addMedicalUpdate,
} from '../controllers/foster.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadPetImages } from '../config/cloudinary.js';

const router = express.Router();

router.use(protect);

router.post('/apply', applyToFoster);
router.get('/applications', getFosterApplications);
router.get('/applications/:id', getFosterApplicationById);
router.put('/applications/:id', updateFosterApplication);
router.post('/applications/:id/progress', uploadPetImages.fields([{ name: 'images', maxCount: 5 }]), addProgressReport);
router.post('/applications/:id/medical', addMedicalUpdate);

export default router;
