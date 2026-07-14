import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
    },
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shelter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelter',
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
    },
    scheduledTime: {
      type: String,
      required: [true, 'Appointment time is required'],
    },
    duration: { type: Number, default: 60 }, // minutes
    type: {
      type: String,
      enum: ['meet_and_greet', 'home_visit', 'follow_up', 'vet_checkup'],
      default: 'meet_and_greet',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled'],
      default: 'pending',
    },
    notes: String,
    shelterNotes: String,
    location: String,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: String,
    rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    reminderSent: { type: Boolean, default: false },
    confirmedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

appointmentSchema.index({ user: 1, scheduledDate: 1 });
appointmentSchema.index({ shelter: 1, scheduledDate: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
