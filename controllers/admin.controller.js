import User from '../models/User.model.js';
import Shelter from '../models/Shelter.model.js';
import Pet from '../models/Pet.model.js';
import Application from '../models/Application.model.js';
import Review from '../models/Review.model.js';
import Appointment from '../models/Appointment.model.js';
import { asyncHandler, createError } from '../utils/error.js';
import { getPaginationParams, paginateResponse } from '../utils/pagination.js';

// @GET /api/admin/dashboard
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalShelters,
    pendingShelters,
    totalPets,
    availablePets,
    adoptedPets,
    totalApplications,
    pendingApplications,
    totalReviews,
    recentUsers,
    recentApplications,
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Shelter.countDocuments({ isActive: true, isApproved: true }),
    Shelter.countDocuments({ isApproved: false, isActive: true }),
    Pet.countDocuments({ isActive: true }),
    Pet.countDocuments({ status: 'available', isActive: true }),
    Pet.countDocuments({ status: 'adopted' }),
    Application.countDocuments(),
    Application.countDocuments({ status: 'pending' }),
    Review.countDocuments({ isApproved: true }),
    User.find({ isActive: true }).sort({ createdAt: -1 }).limit(5).select('name email role createdAt avatar'),
    Application.find()
      .populate('pet', 'name')
      .populate('applicant', 'name')
      .populate('shelter', 'name')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  // Monthly user registrations (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const userTrend = await User.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const adoptionTrend = await Application.aggregate([
    { $match: { status: 'approved', createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$approvedAt' }, month: { $month: '$approvedAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const speciesDistribution = await Pet.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$species', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  res.json({
    success: true,
    stats: {
      users: { total: totalUsers },
      shelters: { total: totalShelters, pending: pendingShelters },
      pets: { total: totalPets, available: availablePets, adopted: adoptedPets },
      applications: { total: totalApplications, pending: pendingApplications },
      reviews: { total: totalReviews },
    },
    recentUsers,
    recentApplications,
    charts: { userTrend, adoptionTrend, speciesDistribution },
  });
});

// @GET /api/admin/users
export const adminGetUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.suspended === 'true') filter.isSuspended = true;
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginateResponse(users, total, page, limit) });
});

// @PUT /api/admin/users/:id/suspend
export const suspendUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(createError(404, 'User not found.'));
  if (user.role === 'admin') return next(createError(403, 'Cannot suspend admin.'));

  user.isSuspended = !user.isSuspended;
  user.suspendedReason = user.isSuspended ? req.body.reason : undefined;
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: user.isSuspended ? 'User suspended.' : 'User reinstated.',
    user,
  });
});

// @PUT /api/admin/users/:id/role
export const changeUserRole = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(createError(404, 'User not found.'));

  const { role } = req.body;
  const allowed = ['user', 'foster', 'shelter', 'admin'];
  if (!allowed.includes(role)) return next(createError(400, 'Invalid role.'));

  user.role = role;
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'User role updated.', user });
});

// @GET /api/admin/shelters
export const adminGetShelters = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = {};
  if (req.query.approved === 'false') filter.isApproved = false;
  if (req.query.approved === 'true') filter.isApproved = true;

  const [shelters, total] = await Promise.all([
    Shelter.find(filter)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Shelter.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginateResponse(shelters, total, page, limit) });
});

// @GET /api/admin/pets
export const adminGetPets = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.species) filter.species = req.query.species;

  const [pets, total] = await Promise.all([
    Pet.find(filter)
      .populate('shelter', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Pet.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginateResponse(pets, total, page, limit) });
});

// @DELETE /api/admin/pets/:id
export const adminDeletePet = asyncHandler(async (req, res, next) => {
  const pet = await Pet.findById(req.params.id);
  if (!pet) return next(createError(404, 'Pet not found.'));
  pet.isActive = false;
  await pet.save();
  res.json({ success: true, message: 'Pet removed.' });
});

// @GET /api/admin/reviews
export const adminGetReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = {};
  if (req.query.moderated === 'true') filter.isModerated = true;
  if (req.query.moderated === 'false') filter.isModerated = false;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('reviewer', 'name email avatar')
      .populate('shelter', 'name')
      .populate('pet', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginateResponse(reviews, total, page, limit) });
});
