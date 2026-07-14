import Appointment from '../models/Appointment.model.js';
import Application from '../models/Application.model.js';
import Pet from '../models/Pet.model.js';
import Shelter from '../models/Shelter.model.js';
import { asyncHandler, createError } from '../utils/error.js';
import { getPaginationParams, paginateResponse } from '../utils/pagination.js';
import { sendAppointmentEmail } from '../services/email.service.js';
import { createNotification } from '../services/notification.service.js';

// @POST /api/appointments
export const createAppointment = asyncHandler(async (req, res, next) => {
  const { petId, applicationId, scheduledDate, scheduledTime, type, notes, location } = req.body;

  const pet = await Pet.findById(petId);
  if (!pet) return next(createError(404, 'Pet not found.'));

  const shelter = await Shelter.findById(pet.shelter);
  if (!shelter) return next(createError(404, 'Shelter not found.'));

  let requestedBy = req.user._id;
  let appointmentUser = req.user._id;

  // Shelter creates appointment for applicant
  if ((req.user.role === 'shelter' || req.user.role === 'admin') && req.body.userId) {
    appointmentUser = req.body.userId;
  }

  const appointment = await Appointment.create({
    pet: petId,
    user: appointmentUser,
    shelter: shelter._id,
    application: applicationId,
    scheduledDate: new Date(scheduledDate),
    scheduledTime,
    type: type || 'meet_and_greet',
    notes,
    location,
    status: req.user.role === 'shelter' ? 'confirmed' : 'pending',
  });

  await appointment.populate(['pet', 'user']);

  const io = req.app.get('io');

  // Notify shelter if user created
  if (req.user.role === 'user') {
    await sendAppointmentEmail(req.user, appointment, pet, 'scheduled');
    await createNotification({
      recipient: shelter.owner,
      type: 'appointment_scheduled',
      title: 'New Appointment Request',
      message: `${req.user.name} requested an appointment to visit ${pet.name}.`,
      link: `/shelter/appointments`,
    }, io);
  }

  // Notify user if shelter created
  if (req.user.role === 'shelter') {
    const appt = await appointment.populate('user');
    await sendAppointmentEmail(appt.user, appointment, pet, 'confirmed');
  }

  res.status(201).json({ success: true, message: 'Appointment created.', appointment });
});

// @GET /api/appointments
export const getAppointments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = {};

  if (req.user.role === 'user') {
    filter.user = req.user._id;
  } else if (req.user.role === 'shelter') {
    const shelter = await Shelter.findOne({ owner: req.user._id });
    if (shelter) filter.shelter = shelter._id;
  }

  if (req.query.status) filter.status = req.query.status;
  if (req.query.from) filter.scheduledDate = { $gte: new Date(req.query.from) };
  if (req.query.to) filter.scheduledDate = { ...filter.scheduledDate, $lte: new Date(req.query.to) };

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate('pet', 'name images species')
      .populate('user', 'name email avatar phone')
      .populate('shelter', 'name address')
      .sort({ scheduledDate: 1 })
      .skip(skip)
      .limit(limit),
    Appointment.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginateResponse(appointments, total, page, limit) });
});

// @GET /api/appointments/:id
export const getAppointmentById = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('pet')
    .populate('user', 'name email avatar phone')
    .populate('shelter', 'name address phone');

  if (!appointment) return next(createError(404, 'Appointment not found.'));
  res.json({ success: true, appointment });
});

// @PUT /api/appointments/:id
export const updateAppointment = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('pet')
    .populate('user', 'name email');

  if (!appointment) return next(createError(404, 'Appointment not found.'));

  const { status, notes, scheduledDate, scheduledTime, cancellationReason, location } = req.body;

  if (status) {
    appointment.status = status;
    if (status === 'confirmed') appointment.confirmedAt = new Date();
    if (status === 'completed') appointment.completedAt = new Date();
    if (status === 'cancelled') {
      appointment.cancelledBy = req.user._id;
      appointment.cancellationReason = cancellationReason;
    }
  }

  if (notes) appointment.notes = notes;
  if (location) appointment.location = location;
  if (scheduledDate) appointment.scheduledDate = new Date(scheduledDate);
  if (scheduledTime) appointment.scheduledTime = scheduledTime;

  await appointment.save();

  const io = req.app.get('io');
  const action = status === 'confirmed' ? 'confirmed' : status === 'cancelled' ? 'cancelled' : 'rescheduled';

  if (['confirmed', 'cancelled', 'rescheduled'].includes(status)) {
    await sendAppointmentEmail(appointment.user, appointment, appointment.pet, action);
    await createNotification({
      recipient: appointment.user._id,
      type: `appointment_${status}`,
      title: `Appointment ${status}`,
      message: `Your appointment for ${appointment.pet.name} has been ${status}.`,
      link: `/appointments/${appointment._id}`,
    }, io);
  }

  res.json({ success: true, message: 'Appointment updated.', appointment });
});
