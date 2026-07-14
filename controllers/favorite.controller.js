import Favorite from '../models/Favorite.model.js';
import Pet from '../models/Pet.model.js';
import { asyncHandler, createError } from '../utils/error.js';

// @POST /api/favorites
export const addFavorite = asyncHandler(async (req, res, next) => {
  const { petId } = req.body;
  const pet = await Pet.findById(petId);
  if (!pet) return next(createError(404, 'Pet not found.'));

  const existing = await Favorite.findOne({ user: req.user._id, pet: petId });
  if (existing) return next(createError(409, 'Pet already in favorites.'));

  await Favorite.create({ user: req.user._id, pet: petId });
  await Pet.findByIdAndUpdate(petId, { $inc: { favoriteCount: 1 } });

  res.status(201).json({ success: true, message: 'Added to favorites.' });
});

// @DELETE /api/favorites/:petId
export const removeFavorite = asyncHandler(async (req, res, next) => {
  const favorite = await Favorite.findOneAndDelete({
    user: req.user._id,
    pet: req.params.petId,
  });
  if (!favorite) return next(createError(404, 'Favorite not found.'));

  await Pet.findByIdAndUpdate(req.params.petId, { $inc: { favoriteCount: -1 } });
  res.json({ success: true, message: 'Removed from favorites.' });
});

// @GET /api/favorites
export const getFavorites = asyncHandler(async (req, res) => {
  const favorites = await Favorite.find({ user: req.user._id })
    .populate({
      path: 'pet',
      match: { isActive: true },
      populate: { path: 'shelter', select: 'name' },
    })
    .sort({ createdAt: -1 });

  const filtered = favorites.filter((f) => f.pet !== null);
  res.json({ success: true, favorites: filtered, total: filtered.length });
});

// @GET /api/favorites/check/:petId
export const checkFavorite = asyncHandler(async (req, res) => {
  const favorite = await Favorite.findOne({ user: req.user._id, pet: req.params.petId });
  res.json({ success: true, isFavorited: !!favorite });
});
