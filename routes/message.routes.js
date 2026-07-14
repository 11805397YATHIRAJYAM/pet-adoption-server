import express from 'express';
import {
  createOrGetConversation,
  getConversations,
  getMessages,
  sendMessage,
  deleteMessage,
} from '../controllers/message.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadPetImages } from '../config/cloudinary.js';

const router = express.Router();

router.use(protect);

router.post('/conversations', createOrGetConversation);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getMessages);
router.post('/', uploadPetImages.single('image'), sendMessage);
router.delete('/:id', deleteMessage);

export default router;
