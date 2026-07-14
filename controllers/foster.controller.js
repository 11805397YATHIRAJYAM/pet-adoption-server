import FosterApplication from '../models/FosterApplication.model.js';
import Pet from '../models/Pet.model.js';
import Shelter from '../models/Shelter.model.js';
import { asyncHandler, createError } from '../utils/error.js';
import { getPaginationParams, paginateResponse } from '../utils/pagination.js';
import { createNotification } from '../services/notification.service.js';

// @POST /api/foster/apply
export const applyToFoster = asyncHandler(async (req, res, next) => {
  const { petId, shelterId } = req.body;

  let shelter;
  if (petId) {
    const pet = await Pet.findById(petId);
    if (!pet) return next(createError(404, 'Pet not found.'));
    shelter = await Shelter.findById(pet.shelter);
  } else if (shelterId) {
    shelter = await Shelter.findById(shelterId);
  }
  if (!shelter) return next(createError(404, 'Shelter not found.'));

  const existing = await FosterApplication.findOne({
    applicant: req.user._id,
    ...(petId ? { pet: petId } : { shelter: shelter._id }),
    status: { $nin: ['rejected', 'cancelled', 'completed'] },
  });
  if (existing) return next(createError(409, 'You already have an active foster application.'));

  const application = await FosterApplication.create({
    ...req.body,
    pet: petId || undefined,
    shelter: shelter._id,
    applicant: req.user._id,
  });

  const io = req.app.get('io');
  await createNotification({
    recipient: shelter.owner,
    type: 'application_submitted',
    title: 'New Foster Application',
    message: `${req.user.name} applied to be a foster parent.`,
    link: `/shelter/foster/${application._id}`,
  }, io);

  res.status(201).json({ success: true, message: 'Foster application submitted.', application });
});

// @GET /api/foster/applications
export const getFosterApplications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = {};

  if (req.user.role === 'user' || req.user.role === 'foster') {
    filter.applicant = req.user._id;
  } else if (req.user.role === 'shelter') {
    const shelter = await Shelter.findOne({ owner: req.user._id });
    if (shelter) filter.shelter = shelter._id;
  }

  if (req.query.status) filter.status = req.query.status;

  const [applications, total] = await Promise.all([
    FosterApplication.find(filter)
      .populate('pet', 'name images species breed')
      .populate('shelter', 'name logo')
      .populate('applicant', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    FosterApplication.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginateResponse(applications, total, page, limit) });
});

// @GET /api/foster/applications/:id
export const getFosterApplicationById = asyncHandler(async (req, res, next) => {
  const application = await FosterApplication.findById(req.params.id)
    .populate('pet')
    .populate('shelter', 'name logo address phone email')
    .populate('applicant', 'name email avatar phone');

  if (!application) return next(createError(404, 'Foster application not found.'));
  res.json({ success: true, application });
});

// @PUT /api/foster/applications/:id
export const updateFosterApplication = asyncHandler(async (req, res, next) => {
  const application = await FosterApplication.findById(req.params.id).populate('applicant pet');
  if (!application) return next(createError(404, 'Foster application not found.'));

  const { status, notes, startDate, endDate } = req.body;

  if (status) {
    application.status = status;
    if (status === 'approved') {
      application.approvedBy = req.user._id;
      application.approvedAt = new Date();
      application.startDate = startDate ? new Date(startDate) : undefined;
      application.endDate = endDate ? new Date(endDate) : undefined;
      if (application.pet) {
        await Pet.findByIdAndUpdate(application.pet._id, {
          status: 'fostered',
          fosteredBy: application.applicant._id,
        });
      }
    }
    if (status === 'completed' && application.pet) {
      await Pet.findByIdAndUpdate(application.pet._id, { status: 'available', fosteredBy: null });
    }
  }

  if (notes) application.notes = notes;
  await application.save();

  const io = req.app.get('io');
  await createNotification({
    recipient: application.applicant._id,
    type: `application_${status}`,
    title: `Foster Application ${status}`,
    message: `Your foster application has been ${status}.`,
    link: `/foster/applications/${application._id}`,
  }, io);

  res.json({ success: true, message: 'Application updated.', application });
});

// @POST /api/foster/applications/:id/progress
export const addProgressReport = asyncHandler(async (req, res, next) => {
  const application = await FosterApplication.findById(req.params.id);
  if (!application) return next(createError(404, 'Application not found.'));

  const { report, weight, health, behavior } = req.body;
  const images = req.files?.images?.map((f) => ({ url: f.path, publicId: f.filename })) || [];

  application.progressReports.push({
    report,
    weight,
    health,
    behavior,
    images,
    addedBy: req.user._id,
  });

  await application.save();
  res.json({ success: true, message: 'Progress report added.', application });
});

// @POST /api/foster/applications/:id/medical
export const addMedicalUpdate = asyncHandler(async (req, res, next) => {
  const application = await FosterApplication.findById(req.params.id);
  if (!application) return next(createError(404, 'Application not found.'));

  application.medicalUpdates.push({ ...req.body, addedBy: req.user._id });
  await application.save();
  res.json({ success: true, message: 'Medical update added.', application });
});
