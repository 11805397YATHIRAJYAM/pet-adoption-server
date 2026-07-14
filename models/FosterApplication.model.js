import mongoose from 'mongoose';

const fosterApplicationSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
    },
    shelter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelter',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
    fosterType: {
      type: String,
      enum: ['temporary', 'long_term', 'medical', 'behavioral', 'emergency'],
      default: 'temporary',
    },
    startDate: Date,
    endDate: Date,
    personalInfo: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
      },
    },
    housingInfo: {
      type: { type: String, enum: ['house', 'apartment', 'condo', 'other'] },
      hasYard: Boolean,
      yardFenced: Boolean,
      allowsPets: Boolean,
      landlordApproval: Boolean,
    },
    experience: {
      hasFosteredBefore: Boolean,
      previousFosterDetails: String,
      currentPets: String,
      experienceLevel: { type: String, enum: ['none', 'some', 'experienced'] },
    },
    availability: {
      canWorkFromHome: Boolean,
      hoursAlonePerDay: Number,
      travelFrequency: String,
    },
    reason: { type: String, required: true },
    specialSkills: String,

    // Progress reports (while fostering)
    progressReports: [
      {
        date: { type: Date, default: Date.now },
        report: String,
        weight: Number,
        health: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
        behavior: String,
        images: [{ url: String, publicId: String }],
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // Medical updates
    medicalUpdates: [
      {
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ['vaccination', 'checkup', 'medication', 'surgery', 'other'] },
        description: String,
        vetName: String,
        cost: Number,
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

const FosterApplication = mongoose.model('FosterApplication', fosterApplicationSchema);
export default FosterApplication;
