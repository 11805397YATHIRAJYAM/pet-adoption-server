import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'application_submitted',
        'application_approved',
        'application_rejected',
        'application_info_requested',
        'appointment_scheduled',
        'appointment_confirmed',
        'appointment_cancelled',
        'appointment_reminder',
        'message_received',
        'pet_adopted',
        'favorite_pet_adopted',
        'new_pet_match',
        'review_posted',
        'shelter_approved',
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    link: String,
    data: mongoose.Schema.Types.Mixed,
    isRead: { type: Boolean, default: false },
    readAt: Date,
    isEmailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
