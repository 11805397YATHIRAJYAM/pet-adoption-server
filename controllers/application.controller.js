import Application from '../models/Application.model.js';
import Pet from '../models/Pet.model.js';
import Shelter from '../models/Shelter.model.js';
import { asyncHandler, createError } from '../utils/error.js';
import { getPaginationParams, paginateResponse } from '../utils/pagination.js';
import { createNotification } from '../services/notification.service.js';
import {
  sendApplicationSubmittedEmail,
  sendApplicationStatusEmail,
} from '../services/email.service.js';

// @POST /api/applications
export const createApplication = asyncHandler(async (req, res, next) => {
  const pet = await Pet.findById(req.body.pet);
  if (!pet) return next(createError(404, 'Pet not found.'));
  if (pet.status !== 'available') return next(createError(400, 'This pet is not available for adoption.'));

  const existing = await Application.findOne({
    pet: pet._id,
    applicant: req.user._id,
    status: { $nin: ['rejected', 'cancelled', 'withdrawn'] },
  });
  if (existing) return next(createError(409, 'You already have an active application for this pet.'));

  const shelter = await Shelter.findById(pet.shelter);

  const appData = {
    ...req.body,
    pet: pet._id,
    shelter: shelter._id,
    applicant: req.user._id,
    agreedAt: req.body.agreedToTerms ? new Date() : undefined,
  };

  // Handle document uploads
  if (req.files?.documents) {
    appData.documents = req.files.documents.map((file) => ({
      name: file.originalname,
      url: file.path,
      publicId: file.filename,
      type: 'other',
    }));
  }

  const application = await Application.create(appData);

  // Update pet status to pending
  await Pet.findByIdAndUpdate(pet._id, { status: 'pending' });

  // Send emails and notifications
  await sendApplicationSubmittedEmail(req.user, pet, application);

  const io = req.app.get('io');
  await createNotification({
    recipient: shelter.owner,
    type: 'application_submitted',
    title: 'New Adoption Application',
    message: `${req.user.name} applied to adopt ${pet.name}.`,
    link: `/shelter/applications/${application._id}`,
    data: { applicationId: application._id },
  }, io);

  res.status(201).json({ success: true, message: 'Application submitted.', application });
});

// @GET /api/applications
export const getApplications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = {};

  if (req.user.role === 'user' || req.user.role === 'foster') {
    filter.applicant = req.user._id;
  } else if (req.user.role === 'shelter') {
    const shelter = await Shelter.findOne({ owner: req.user._id });
    if (shelter) filter.shelter = shelter._id;
  }

  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate('pet', 'name images species breed')
      .populate('shelter', 'name logo')
      .populate('applicant', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Application.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginateResponse(applications, total, page, limit) });
});

// @GET /api/applications/:id
export const getApplicationById = asyncHandler(async (req, res, next) => {
  const application = await Application.findById(req.params.id)
    .populate('pet')
    .populate('shelter', 'name logo address phone email')
    .populate('applicant', 'name email avatar phone')
    .populate('reviewedBy', 'name');

  if (!application) return next(createError(404, 'Application not found.'));

  const canView =
    req.user.role === 'admin' ||
    application.applicant._id.toString() === req.user._id.toString() ||
    (req.user.role === 'shelter' &&
      (await Shelter.findOne({ owner: req.user._id, _id: application.shelter._id })));

  if (!canView) return next(createError(403, 'Not authorized.'));

  res.json({ success: true, application });
});

// @PUT /api/applications/:id
export const updateApplication = asyncHandler(async (req, res, next) => {
  const application = await Application.findById(req.params.id)
    .populate('pet')
    .populate('applicant', 'name email');

  if (!application) return next(createError(404, 'Application not found.'));

  const { status, rejectionReason, additionalInfoRequested, shelterNote, noteIsInternal } = req.body;
  const io = req.app.get('io');

  // Shelter actions
  if (req.user.role === 'shelter' || req.user.role === 'admin') {
    if (status) {
      application.status = status;
      application.reviewedBy = req.user._id;
      application.reviewedAt = new Date();

      if (status === 'approved') {
        application.approvedAt = new Date();
        await Pet.findByIdAndUpdate(application.pet._id, { status: 'adopted', adoptedBy: application.applicant._id, adoptedAt: new Date() });
      }
      if (status === 'rejected') {
        application.rejectedAt = new Date();
        application.rejectionReason = rejectionReason;
        // Reset pet to available if no other pending applications
        const otherPending = await Application.findOne({
          pet: application.pet._id,
          _id: { $ne: application._id },
          status: { $in: ['pending', 'under_review', 'approved'] },
        });
        if (!otherPending) await Pet.findByIdAndUpdate(application.pet._id, { status: 'available' });
      }
      if (status === 'info_requested') {
        application.additionalInfoRequested = additionalInfoRequested;
      }

      await sendApplicationStatusEmail(application.applicant, application.pet, application, status);
      await createNotification({
        recipient: application.applicant._id,
        type: `application_${status}`,
        title: `Application ${status.replace('_', ' ')}`,
        message: `Your application for ${application.pet.name} has been ${status.replace('_', ' ')}.`,
        link: `/applications/${application._id}`,
      }, io);
    }

    if (shelterNote) {
      application.shelterNotes.push({
        note: shelterNote,
        addedBy: req.user._id,
        isInternal: noteIsInternal !== false,
      });
    }
  }

  // Applicant can cancel
  if (req.user.role === 'user' && req.body.status === 'cancelled') {
    if (application.applicant._id.toString() !== req.user._id.toString()) {
      return next(createError(403, 'Not authorized.'));
    }
    if (!['pending', 'under_review', 'info_requested'].includes(application.status)) {
      return next(createError(400, 'Cannot cancel at this stage.'));
    }
    application.status = 'cancelled';
  }

  await application.save();
  res.json({ success: true, message: 'Application updated.', application });
});
