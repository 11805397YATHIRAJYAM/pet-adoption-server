import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['shelter', 'pet'],
      required: true,
    },
    shelter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelter',
    },
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    helpfulCount: { type: Number, default: 0 },
    helpfulVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isApproved: { type: Boolean, default: true },
    isModerated: { type: Boolean, default: false },
    moderationReason: String,
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: Date,
    response: {
      text: String,
      respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      respondedAt: Date,
    },
  },
  { timestamps: true }
);

// Prevent duplicate reviews from same user for same target
reviewSchema.index(
  { reviewer: 1, shelter: 1 },
  { unique: true, partialFilterExpression: { shelter: { $exists: true } } }
);
reviewSchema.index(
  { reviewer: 1, pet: 1 },
  { unique: true, partialFilterExpression: { pet: { $exists: true } } }
);

const Review = mongoose.model('Review', reviewSchema);
export default Review;
