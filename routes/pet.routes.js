import express from 'express';
import {
  getPets,
  getPetById,
  createPet,
  updatePet,
  deletePet,
  deletePetImage,
  getShelterPets,
} from '../controllers/pet.controller.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.middleware.js';
import { uploadPetImages } from '../config/cloudinary.js';
import multer from 'multer';

const router = express.Router();

// Multi-field upload for pets
const petUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
}).fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 },
]);

router.get('/', optionalAuth, getPets);
router.get('/shelter/:shelterId', getShelterPets);
router.get('/:id', optionalAuth, getPetById);

router.post(
  '/',
  protect,
  authorize('admin', 'shelter'),
  uploadPetImages.array('images', 10),
  createPet
);

router.put(
  '/:id',
  protect,
  authorize('admin', 'shelter'),
  uploadPetImages.array('images', 10),
  updatePet
);

router.delete('/:id', protect, authorize('admin', 'shelter'), deletePet);
router.delete('/:id/images/:publicId', protect, authorize('admin', 'shelter'), deletePetImage);

export default router;
