import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
    },
    shelter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelter',
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageAt: { type: Date, default: Date.now },
    unreadCount: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        count: { type: Number, default: 0 },
      },
    ],
    isActive: { type: Boolean, default: true },
    subject: String,
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
