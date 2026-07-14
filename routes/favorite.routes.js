import express from 'express';
import { addFavorite, removeFavorite, getFavorites, checkFavorite } from '../controllers/favorite.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.get('/', getFavorites);
router.post('/', addFavorite);
router.get('/check/:petId', checkFavorite);
router.delete('/:petId', removeFavorite);

export default router;
