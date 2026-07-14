import express from 'express';
import {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
} from '../controllers/application.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadDocuments } from '../config/cloudinary.js';

const router = express.Router();

router.use(protect);

router.post('/', uploadDocuments.fields([{ name: 'documents', maxCount: 5 }]), createApplication);
router.get('/', getApplications);
router.get('/:id', getApplicationById);
router.put('/:id', updateApplication);

export default router;
