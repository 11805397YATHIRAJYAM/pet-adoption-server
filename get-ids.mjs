import mongoose from 'mongoose';
await mongoose.connect('mongodb://127.0.0.1:27017/pet-adoption');
const db = mongoose.connection.db;
const collections = await db.listCollections().toArray();
console.log('Collections:', JSON.stringify(collections.map(c => c.name)));
for (const col of collections) {
  const count = await db.collection(col.name).countDocuments();
  console.log(col.name + ': ' + count + ' docs');
}
await mongoose.disconnect();
