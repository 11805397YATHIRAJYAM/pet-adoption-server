import mongoose from 'mongoose';
await mongoose.connect('mongodb://127.0.0.1:27017/pet_adoption');
const db = mongoose.connection.db;
const users = await db.collection('users').find({}, { projection: { name:1, email:1, role:1, _id:1 } }).toArray();
console.log('Existing users:');
users.forEach(u => console.log(` _id: ${u._id}  email: ${u.email}  role: ${u.role}  name: ${u.name}`));
await mongoose.disconnect();
