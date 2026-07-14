import Shelter from '../models/Shelter.model.js';
import User from '../models/User.model.js';
import { asyncHandler, createError } from '../utils/error.js';
import { getPaginationParams, paginateResponse } from '../utils/pagination.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';
import { sendShelterApprovalEmail } from '../services/email.service.js';

// @POST /api/shelters
export const createShelter = asyncHandler(async (req, res, next) => {
  const existing = await Shelter.findOne({ owner: req.user._id });
  if (existing) return next(createError(409, 'You already have a shelter registered.'));

  const shelterData = {
    ...req.body,
    owner: req.user._id,
  };

  if (req.file) {
    shelterData.logo = { url: req.file.path, publicId: req.file.filename };
  }

  const shelter = await Shelter.create(shelterData);

  // Update user role to shelter
  await User.findByIdAndUpdate(req.user._id, { role: 'shelter', shelter: shelter._id });

  res.status(201).json({
    success: true,
    message: 'Shelter created. Pending admin approval.',
    shelter,
  });
});

// @GET /api/shelters
export const getShelters = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = { isActive: true, isApproved: true };

  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { 'address.city': { $regex: req.query.search, $options: 'i' } },
      { 'address.state': { $regex: req.query.search, $options: 'i' } },
    ];
  }
  if (req.query.city) filter['address.city'] = { $regex: req.query.city, $options: 'i' };
  if (req.query.state) filter['address.state'] = { $regex: req.query.state, $options: 'i' };

  const [shelters, total] = await Promise.all([
    Shelter.find(filter)
      .select('-staff -taxId -licenseNumber')
      .sort({ rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Shelter.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginateResponse(shelters, total, page, limit) });
});

// @GET /api/shelters/:id
export const getShelterById = asyncHandler(async (req, res, next) => {
  const shelter = await Shelter.findById(req.params.id)
    .populate('owner', 'name email avatar')
    .populate('staff', 'name avatar role');

  if (!shelter || !shelter.isActive) return next(createError(404, 'Shelter not found.'));
  res.json({ success: true, shelter });
});

// @GET /api/shelters/my
export const getMyShelter = asyncHandler(async (req, res, next) => {
  const shelter = await Shelter.findOne({ owner: req.user._id });
  if (!shelter) return next(createError(404, 'No shelter found.'));
  res.json({ success: true, shelter });
});

// @PUT /api/shelters/:id
export const updateShelter = asyncHandler(async (req, res, next) => {
  const shelter = await Shelter.findById(req.params.id);
  if (!shelter) return next(createError(404, 'Shelter not found.'));

  if (req.user.role !== 'admin' && shelter.owner.toString() !== req.user._id.toString()) {
    return next(createError(403, 'Not authorized.'));
  }

  const updates = { ...req.body };
  delete updates._id;
  delete updates.owner;

  if (req.file) {
    if (shelter.logo?.publicId) await deleteFromCloudinary(shelter.logo.publicId);
    updates.logo = { url: req.file.path, publicId: req.file.filename };
  }

  const updated = await Shelter.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, message: 'Shelter updated.', shelter: updated });
});

// @DELETE /api/shelters/:id (admin)
export const deleteShelter = asyncHandler(async (req, res, next) => {
  const shelter = await Shelter.findById(req.params.id);
  if (!shelter) return next(createError(404, 'Shelter not found.'));

  shelter.isActive = false;
  await shelter.save();
  res.json({ success: true, message: 'Shelter deactivated.' });
});

// @PUT /api/shelters/:id/approve (admin)
export const approveShelter = asyncHandler(async (req, res, next) => {
  const shelter = await Shelter.findById(req.params.id).populate('owner');
  if (!shelter) return next(createError(404, 'Shelter not found.'));

  shelter.isApproved = true;
  shelter.approvedAt = new Date();
  shelter.approvedBy = req.user._id;
  await shelter.save();

  await sendShelterApprovalEmail(shelter.owner, shelter);
  res.json({ success: true, message: 'Shelter approved.', shelter });
});

// @GET /api/shelters/:id/analytics
export const getShelterAnalytics = asyncHandler(async (req, res, next) => {
  const shelter = await Shelter.findById(req.params.id);
  if (!shelter) return next(createError(404, 'Shelter not found.'));

  if (req.user.role !== 'admin' && shelter.owner.toString() !== req.user._id.toString()) {
    return next(createError(403, 'Not authorized.'));
  }

  const Pet = (await import('../models/Pet.model.js')).default;
  const Application = (await import('../models/Application.model.js')).default;
  const Appointment = (await import('../models/Appointment.model.js')).default;

  const [
    totalPets,
    availablePets,
    adoptedPets,
    pendingApplications,
    approvedApplications,
    totalApplications,
    upcomingAppointments,
  ] = await Promise.all([
    Pet.countDocuments({ shelter: shelter._id, isActive: true }),
    Pet.countDocuments({ shelter: shelter._id, status: 'available', isActive: true }),
    Pet.countDocuments({ shelter: shelter._id, status: 'adopted' }),
    Application.countDocuments({ shelter: shelter._id, status: 'pending' }),
    Application.countDocuments({ shelter: shelter._id, status: 'approved' }),
    Application.countDocuments({ shelter: shelter._id }),
    Appointment.countDocuments({
      shelter: shelter._id,
      scheduledDate: { $gte: new Date() },
      status: { $in: ['pending', 'confirmed'] },
    }),
  ]);

  // Monthly adoption trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyTrend = await Application.aggregate([
    {
      $match: {
        shelter: shelter._id,
        status: 'approved',
        approvedAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$approvedAt' }, month: { $month: '$approvedAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  res.json({
    success: true,
    analytics: {
      pets: { total: totalPets, available: availablePets, adopted: adoptedPets },
      applications: { total: totalApplications, pending: pendingApplications, approved: approvedApplications },
      appointments: { upcoming: upcomingAppointments },
      rating: shelter.rating,
      reviewCount: shelter.reviewCount,
      monthlyTrend,
    },
  });
});
