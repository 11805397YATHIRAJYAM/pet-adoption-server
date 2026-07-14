import express from 'express';
import {
  getDashboardStats,
  adminGetUsers,
  suspendUser,
  changeUserRole,
  adminGetShelters,
  adminGetPets,
  adminDeletePet,
  adminGetReviews,
} from '../controllers/admin.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);

router.get('/users', adminGetUsers);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/role', changeUserRole);

router.get('/shelters', adminGetShelters);

router.get('/pets', adminGetPets);
router.delete('/pets/:id', adminDeletePet);

router.get('/reviews', adminGetReviews);

export default router;
