import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shelter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelter',
      required: true,
    },
    type: {
      type: String,
      enum: ['adoption', 'foster'],
      default: 'adoption',
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'cancelled', 'withdrawn', 'info_requested'],
      default: 'pending',
    },

    // Applicant information
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
      dateOfBirth: Date,
      occupation: String,
      employer: String,
    },

    // Housing information
    housingInfo: {
      type: { type: String, enum: ['house', 'apartment', 'condo', 'townhouse', 'other'] },
      ownership: { type: String, enum: ['own', 'rent'] },
      hasYard: Boolean,
      yardFenced: Boolean,
      allowsPets: Boolean,
      landlordContact: String,
      numberOfResidents: Number,
      childrenAges: [Number],
    },

    // Pet experience
    petExperience: {
      hasPetsCurrently: Boolean,
      currentPets: String,
      hadPetsBefore: Boolean,
      previousPets: String,
      experienceLevel: { type: String, enum: ['none', 'some', 'experienced', 'expert'] },
    },

    // Reason & lifestyle
    reason: {
      type: String,
      required: [true, 'Please tell us why you want to adopt'],
      maxlength: [2000, 'Reason cannot exceed 2000 characters'],
    },
    lifestyle: String,
    workSchedule: String,
    exerciseRoutine: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    veterinarian: {
      name: String,
      phone: String,
      clinic: String,
    },

    // Documents uploaded
    documents: [
      {
        name: String,
        url: String,
        publicId: String,
        type: { type: String, enum: ['id', 'proof_of_address', 'landlord_approval', 'vet_reference', 'other'] },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Shelter notes and actions
    shelterNotes: [
      {
        note: String,
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
        isInternal: { type: Boolean, default: true },
      },
    ],

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    additionalInfoRequested: String,
    scheduledVisit: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

    // Agreement
    agreedToTerms: { type: Boolean, default: false },
    agreedAt: Date,
  },
  { timestamps: true }
);

applicationSchema.index({ applicant: 1, status: 1 });
applicationSchema.index({ shelter: 1, status: 1 });
applicationSchema.index({ pet: 1 });

const Application = mongoose.model('Application', applicationSchema);
export default Application;
