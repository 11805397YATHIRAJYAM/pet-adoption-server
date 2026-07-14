import Pet from '../models/Pet.model.js';
import Shelter from '../models/Shelter.model.js';
import Favorite from '../models/Favorite.model.js';
import { asyncHandler, createError } from '../utils/error.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';
import { getPaginationParams, paginateResponse } from '../utils/pagination.js';

// Build filter from query
const buildPetFilter = (query) => {
  const filter = { isActive: true };

  if (query.species) filter.species = query.species;
  if (query.gender) filter.gender = query.gender;
  if (query.size) filter.size = query.size;
  if (query.status) filter.status = query.status;
  else filter.status = 'available';

  if (query.breed) filter.breed = { $regex: query.breed, $options: 'i' };

  if (query.vaccinated === 'true') filter['medicalHistory.vaccinated'] = true;
  if (query.neutered === 'true') filter['medicalHistory.neutered'] = true;
  if (query.specialNeeds === 'true') filter['medicalHistory.specialNeeds'] = true;

  if (query.minAge || query.maxAge) {
    filter['age.value'] = {};
    if (query.minAge) filter['age.value'].$gte = parseInt(query.minAge);
    if (query.maxAge) filter['age.value'].$lte = parseInt(query.maxAge);
  }

  if (query.maxFee) filter['adoptionFee.amount'] = { $lte: parseInt(query.maxFee) };

  if (query.city) filter['location.city'] = { $regex: query.city, $options: 'i' };
  if (query.state) filter['location.state'] = { $regex: query.state, $options: 'i' };

  if (query.shelter) filter.shelter = query.shelter;
  if (query.color) filter.color = { $in: query.color.split(',') };
  if (query.tags) filter.tags = { $in: query.tags.split(',') };

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  return filter;
};

const buildSortOption = (sort) => {
  switch (sort) {
    case 'oldest': return { createdAt: 1 };
    case 'most_viewed': return { views: -1 };
    case 'most_favorited': return { favoriteCount: -1 };
    case 'fee_low': return { 'adoptionFee.amount': 1 };
    case 'fee_high': return { 'adoptionFee.amount': -1 };
    default: return { createdAt: -1 };
  }
};

// @GET /api/pets
export const getPets = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = buildPetFilter(req.query);
  const sort = buildSortOption(req.query.sort);

  const [pets, total] = await Promise.all([
    Pet.find(filter)
      .populate('shelter', 'name logo address city')
      .select('-videos -medicalHistory.vetNotes')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Pet.countDocuments(filter),
  ]);

  // Add isFavorited flag if user is authenticated
  let petsWithFav = pets;
  if (req.user) {
    const favPetIds = await Favorite.find({ user: req.user._id }).distinct('pet');
    const favSet = new Set(favPetIds.map(String));
    petsWithFav = pets.map((p) => ({ ...p, isFavorited: favSet.has(String(p._id)) }));
  }

  res.json({ success: true, ...paginateResponse(petsWithFav, total, page, limit) });
});

// @GET /api/pets/:id
export const getPetById = asyncHandler(async (req, res, next) => {
  const pet = await Pet.findById(req.params.id)
    .populate('shelter', 'name logo address phone email website operatingHours rating reviewCount')
    .populate('postedBy', 'name avatar');

  if (!pet || !pet.isActive) return next(createError(404, 'Pet not found.'));

  // Increment views
  await Pet.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

  let isFavorited = false;
  if (req.user) {
    const fav = await Favorite.findOne({ user: req.user._id, pet: pet._id });
    isFavorited = !!fav;
  }

  res.json({ success: true, pet: { ...pet.toObject(), isFavorited } });
});

// @POST /api/pets
export const createPet = asyncHandler(async (req, res, next) => {
  // Find shelter for this user
  let shelter;
  if (req.user.role === 'admin') {
    shelter = await Shelter.findById(req.body.shelter);
  } else {
    shelter = await Shelter.findOne({ owner: req.user._id });
    if (!shelter) return next(createError(404, 'Shelter not found. Please create a shelter first.'));
    if (!shelter.isApproved) return next(createError(403, 'Your shelter is pending approval.'));
  }

  const petData = {
    ...req.body,
    shelter: shelter._id,
    postedBy: req.user._id,
    location: req.body.location || {
      city: shelter.address.city,
      state: shelter.address.state,
      zipCode: shelter.address.zipCode,
    },
  };

  // Handle image uploads
  if (req.files?.images) {
    petData.images = req.files.images.map((file, i) => ({
      url: file.path,
      publicId: file.filename,
      isPrimary: i === 0,
    }));
  }

  if (req.files?.video) {
    const v = req.files.video[0];
    petData.videos = [{ url: v.path, publicId: v.filename }];
  }

  const pet = await Pet.create(petData);
  await Shelter.findByIdAndUpdate(shelter._id, { $inc: { totalPets: 1 } });

  res.status(201).json({ success: true, message: 'Pet created successfully.', pet });
});

// @PUT /api/pets/:id
export const updatePet = asyncHandler(async (req, res, next) => {
  const pet = await Pet.findById(req.params.id);
  if (!pet) return next(createError(404, 'Pet not found.'));

  // Check ownership
  if (req.user.role !== 'admin') {
    const shelter = await Shelter.findOne({ owner: req.user._id });
    if (!shelter || pet.shelter.toString() !== shelter._id.toString()) {
      return next(createError(403, 'Not authorized to update this pet.'));
    }
  }

  const updates = { ...req.body };
  delete updates._id;

  // Handle new image uploads
  if (req.files?.images?.length) {
    const newImages = req.files.images.map((file, i) => ({
      url: file.path,
      publicId: file.filename,
      isPrimary: pet.images.length === 0 && i === 0,
    }));
    updates.images = [...(pet.images || []), ...newImages];
  }

  const updatedPet = await Pet.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate('shelter', 'name logo');

  res.json({ success: true, message: 'Pet updated.', pet: updatedPet });
});

// @DELETE /api/pets/:id
export const deletePet = asyncHandler(async (req, res, next) => {
  const pet = await Pet.findById(req.params.id);
  if (!pet) return next(createError(404, 'Pet not found.'));

  if (req.user.role !== 'admin') {
    const shelter = await Shelter.findOne({ owner: req.user._id });
    if (!shelter || pet.shelter.toString() !== shelter._id.toString()) {
      return next(createError(403, 'Not authorized to delete this pet.'));
    }
  }

  // Delete images from Cloudinary
  for (const img of pet.images) {
    await deleteFromCloudinary(img.publicId);
  }
  for (const vid of pet.videos) {
    await deleteFromCloudinary(vid.publicId, 'video');
  }

  pet.isActive = false;
  await pet.save();

  res.json({ success: true, message: 'Pet removed.' });
});

// @DELETE /api/pets/:id/images/:publicId
export const deletePetImage = asyncHandler(async (req, res, next) => {
  const pet = await Pet.findById(req.params.id);
  if (!pet) return next(createError(404, 'Pet not found.'));

  const imageIndex = pet.images.findIndex((img) => img.publicId === req.params.publicId);
  if (imageIndex === -1) return next(createError(404, 'Image not found.'));

  await deleteFromCloudinary(req.params.publicId);
  pet.images.splice(imageIndex, 1);
  if (pet.images.length > 0 && !pet.images.some((i) => i.isPrimary)) {
    pet.images[0].isPrimary = true;
  }
  await pet.save();

  res.json({ success: true, message: 'Image deleted.', pet });
});

// @GET /api/pets/shelter/:shelterId
export const getShelterPets = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = { shelter: req.params.shelterId, isActive: true };
  if (req.query.status) filter.status = req.query.status;

  const [pets, total] = await Promise.all([
    Pet.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Pet.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginateResponse(pets, total, page, limit) });
});
