import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: true,
    },
  },
  { timestamps: true }
);

favoriteSchema.index({ user: 1, pet: 1 }, { unique: true });
favoriteSchema.index({ user: 1 });

const Favorite = mongoose.model('Favorite', favoriteSchema);
export default Favorite;
