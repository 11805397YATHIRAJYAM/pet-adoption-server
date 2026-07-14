import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },
    attachments: [
      {
        url: String,
        publicId: String,
        name: String,
        type: String,
        size: Number,
      },
    ],
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    editedAt: Date,
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
