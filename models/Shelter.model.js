import mongoose from 'mongoose';

const shelterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Shelter name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: [true, 'Phone is required'] },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'US' },
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    logo: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    website: String,
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
    },
    operatingHours: {
      monday: { open: String, close: String, closed: { type: Boolean, default: false } },
      tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
      friday: { open: String, close: String, closed: { type: Boolean, default: false } },
      saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
      sunday: { open: String, close: String, closed: { type: Boolean, default: true } },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    licenseNumber: String,
    taxId: String,
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    totalAdoptions: { type: Number, default: 0 },
    totalPets: { type: Number, default: 0 },
  },
  { timestamps: true }
);

shelterSchema.index({ location: '2dsphere' });
shelterSchema.index({ name: 'text', description: 'text' });

const Shelter = mongoose.model('Shelter', shelterSchema);
export default Shelter;
