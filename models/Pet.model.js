import mongoose from 'mongoose';

const petSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Pet name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    species: {
      type: String,
      required: [true, 'Species is required'],
      enum: ['dog', 'cat', 'bird', 'rabbit', 'hamster', 'guinea_pig', 'reptile', 'fish', 'other'],
    },
    breed: { type: String, trim: true },
    age: {
      value: { type: Number, required: true, min: 0 },
      unit: { type: String, enum: ['weeks', 'months', 'years'], default: 'years' },
    },
    gender: {
      type: String,
      required: true,
      enum: ['male', 'female', 'unknown'],
    },
    size: {
      type: String,
      enum: ['tiny', 'small', 'medium', 'large', 'extra_large'],
    },
    weight: {
      value: Number,
      unit: { type: String, enum: ['lbs', 'kg'], default: 'lbs' },
    },
    color: [{ type: String, trim: true }],
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
    },
    temperament: [{ type: String }],
    medicalHistory: {
      vaccinated: { type: Boolean, default: false },
      vaccinationDetails: String,
      neutered: { type: Boolean, default: false },
      microchipped: { type: Boolean, default: false },
      specialNeeds: { type: Boolean, default: false },
      specialNeedsDescription: String,
      lastVetVisit: Date,
      vetNotes: String,
    },
    goodWith: {
      children: { type: Boolean, default: null },
      dogs: { type: Boolean, default: null },
      cats: { type: Boolean, default: null },
      seniors: { type: Boolean, default: null },
    },
    adoptionFee: {
      amount: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: 'USD' },
      waivable: { type: Boolean, default: false },
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    videos: [
      {
        url: String,
        publicId: String,
        thumbnail: String,
      },
    ],
    status: {
      type: String,
      enum: ['available', 'pending', 'adopted', 'fostered', 'hold'],
      default: 'available',
    },
    shelter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelter',
      required: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'US' },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
    views: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    adoptedAt: Date,
    adoptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fosteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [String],
  },
  { timestamps: true }
);

petSchema.index({ 'location.coordinates': '2dsphere' });
petSchema.index({ name: 'text', description: 'text', breed: 'text' });
petSchema.index({ species: 1, status: 1, 'medicalHistory.vaccinated': 1 });
petSchema.index({ shelter: 1 });
petSchema.index({ createdAt: -1 });

const Pet = mongoose.model('Pet', petSchema);
export default Pet;
