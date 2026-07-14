import Review from '../models/Review.model.js';
import Shelter from '../models/Shelter.model.js';
import { asyncHandler, createError } from '../utils/error.js';
import { getPaginationParams, paginateResponse } from '../utils/pagination.js';

const updateTargetRating = async (targetType, targetId) => {
  const reviews = await Review.find({
    targetType,
    [targetType]: targetId,
    isApproved: true,
    isModerated: false,
  });
  if (!reviews.length) return;
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  if (targetType === 'shelter') {
    await Shelter.findByIdAndUpdate(targetId, { rating: avg.toFixed(1), reviewCount: reviews.length });
  }
};

// @POST /api/reviews
export const createReview = asyncHandler(async (req, res, next) => {
  const { targetType, shelter, pet, rating, title, comment } = req.body;

  const existing = await Review.findOne({
    reviewer: req.user._id,
    targetType,
    ...(targetType === 'shelter' ? { shelter } : { pet }),
  });
  if (existing) return next(createError(409, 'You have already reviewed this.'));

  const reviewData = {
    reviewer: req.user._id,
    targetType,
    rating,
    title,
    comment,
    ...(targetType === 'shelter' ? { shelter } : { pet }),
  };

  if (req.files?.images) {
    reviewData.images = req.files.images.map((f) => ({ url: f.path, publicId: f.filename }));
  }

  const review = await Review.create(reviewData);
  await updateTargetRating(targetType, targetType === 'shelter' ? shelter : pet);

  await review.populate('reviewer', 'name avatar');
  res.status(201).json({ success: true, message: 'Review submitted.', review });
});

// @GET /api/reviews
export const getReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const filter = { isApproved: true };

  if (req.query.targetType) filter.targetType = req.query.targetType;
  if (req.query.shelter) filter.shelter = req.query.shelter;
  if (req.query.pet) filter.pet = req.query.pet;
  if (req.query.rating) filter.rating = parseInt(req.query.rating);

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('reviewer', 'name avatar createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginateResponse(reviews, total, page, limit) });
});

// @GET /api/reviews/:id
export const getReviewById = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id).populate('reviewer', 'name avatar');
  if (!review) return next(createError(404, 'Review not found.'));
  res.json({ success: true, review });
});

// @PUT /api/reviews/:id
export const updateReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(createError(404, 'Review not found.'));
  if (review.reviewer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(createError(403, 'Not authorized.'));
  }

  const { rating, title, comment } = req.body;
  if (rating) review.rating = rating;
  if (title) review.title = title;
  if (comment) review.comment = comment;
  await review.save();

  const targetId = review.targetType === 'shelter' ? review.shelter : review.pet;
  await updateTargetRating(review.targetType, targetId);

  res.json({ success: true, message: 'Review updated.', review });
});

// @DELETE /api/reviews/:id
export const deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(createError(404, 'Review not found.'));
  if (review.reviewer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(createError(403, 'Not authorized.'));
  }

  await review.deleteOne();
  const targetId = review.targetType === 'shelter' ? review.shelter : review.pet;
  await updateTargetRating(review.targetType, targetId);

  res.json({ success: true, message: 'Review deleted.' });
});

// @PUT /api/reviews/:id/helpful
export const markHelpful = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(createError(404, 'Review not found.'));

  const userId = req.user._id;
  const alreadyVoted = review.helpfulVotes.some((id) => id.toString() === userId.toString());

  if (alreadyVoted) {
    review.helpfulVotes.pull(userId);
    review.helpfulCount = Math.max(0, review.helpfulCount - 1);
  } else {
    review.helpfulVotes.push(userId);
    review.helpfulCount += 1;
  }
  await review.save();

  res.json({ success: true, helpfulCount: review.helpfulCount, voted: !alreadyVoted });
});

// @PUT /api/reviews/:id/moderate (admin)
export const moderateReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(createError(404, 'Review not found.'));

  review.isModerated = req.body.isModerated;
  review.moderationReason = req.body.moderationReason;
  review.moderatedBy = req.user._id;
  review.moderatedAt = new Date();
  if (req.body.isModerated) review.isApproved = false;
  await review.save();

  res.json({ success: true, message: 'Review moderated.', review });
});
