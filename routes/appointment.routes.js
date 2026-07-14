import express from 'express';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
} from '../controllers/appointment.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.post('/', createAppointment);
router.get('/', getAppointments);
router.get('/:id', getAppointmentById);
router.put('/:id', updateAppointment);

export default router;
