import mongoose from 'mongoose';

const connectDB = async (retries = 5) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    if (retries > 0) {
      console.log(`Retrying... (${retries} attempts left)`);
      await new Promise((r) => setTimeout(r, 5000));
      return connectDB(retries - 1);
    }
    process.exit(1);
  }
};

export default connectDB;
