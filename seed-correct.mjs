import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';

await mongoose.connect('mongodb://127.0.0.1:27017/pet_adoption');
const db = mongoose.connection.db;

const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash('Password123!', salt);

// Create admin user
const adminId = new mongoose.Types.ObjectId();
await db.collection('users').insertOne({
  _id: adminId,
  name: 'Admin User',
  email: 'admin@petadopt.com',
  password: hashedPassword,
  role: 'admin',
  isEmailVerified: true,
  isSuspended: false,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create shelter user
const shelterUserId = new mongoose.Types.ObjectId();
await db.collection('users').insertOne({
  _id: shelterUserId,
  name: 'Happy Paws Shelter',
  email: 'shelter@petadopt.com',
  password: hashedPassword,
  role: 'shelter',
  isEmailVerified: true,
  isSuspended: false,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create shelter
const shelterId = new mongoose.Types.ObjectId();
await db.collection('shelters').insertOne({
  _id: shelterId,
  name: 'Happy Paws Animal Shelter',
  email: 'shelter@petadopt.com',
  phone: '512-555-0100',
  description: 'We are a non-profit animal shelter dedicated to finding loving homes for pets in need. Founded in 2010, we have helped over 5,000 animals find their forever families.',
  website: 'https://happypaws.example.com',
  owner: shelterUserId,
  staff: [],
  isApproved: true,
  address: { street: '123 Shelter Lane', city: 'Austin', state: 'TX', zipCode: '78701', country: 'US' },
  location: { type: 'Point', coordinates: [-97.7431, 30.2672] },
  operatingHours: {
    monday:    { open: '09:00', close: '17:00', isClosed: false },
    tuesday:   { open: '09:00', close: '17:00', isClosed: false },
    wednesday: { open: '09:00', close: '17:00', isClosed: false },
    thursday:  { open: '09:00', close: '17:00', isClosed: false },
    friday:    { open: '09:00', close: '17:00', isClosed: false },
    saturday:  { open: '10:00', close: '15:00', isClosed: false },
    sunday:    { open: '00:00', close: '00:00', isClosed: true }
  },
  rating: 0,
  reviewCount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Link shelter user to shelter
await db.collection('users').updateOne({ _id: shelterUserId }, { $set: { shelter: shelterId } });

// Load and insert pets
const petsRaw = readFileSync('D:/Practice/Pet/pets-seed.json', 'utf8');
const pets = JSON.parse(petsRaw);

const petsToInsert = pets.map(p => {
  const clean = { ...p };
  delete clean.shelter;
  delete clean.postedBy;
  return {
    ...clean,
    _id: new mongoose.Types.ObjectId(),
    shelter: shelterId,
    postedBy: shelterUserId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
});

await db.collection('pets').insertMany(petsToInsert);

// Verify
const userCount   = await db.collection('users').countDocuments();
const shelterCount = await db.collection('shelters').countDocuments();
const petCount    = await db.collection('pets').countDocuments();

console.log('\n✅ Done! pet_adoption database updated');
console.log('─────────────────────────────────────');
console.log('Users    :', userCount, '(includes your existing 2)');
console.log('Shelters :', shelterCount);
console.log('Pets     :', petCount);
console.log('─────────────────────────────────────');
console.log('Admin   → admin@petadopt.com   / Password123!');
console.log('Shelter → shelter@petadopt.com / Password123!');
console.log('─────────────────────────────────────');

await mongoose.disconnect();
