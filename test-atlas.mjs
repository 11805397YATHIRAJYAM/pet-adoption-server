import mongoose from 'mongoose';

const ATLAS_URI = 'mongodb+srv://rajkumaryathirajyam_db_user:SyTW89AJGZki1old@cluster0.mb2zdhv.mongodb.net/pet_adoption?appName=Cluster0';

console.log('Testing Atlas connection...');
try {
  await mongoose.connect(ATLAS_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('✅ Atlas connected successfully!');
  await mongoose.disconnect();
} catch(e) {
  console.log('❌ Failed:', e.message.split('\n')[0]);
}
