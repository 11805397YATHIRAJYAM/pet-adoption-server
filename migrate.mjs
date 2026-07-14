import mongoose from 'mongoose';

const LOCAL_URI  = 'mongodb://127.0.0.1:27017/pet_adoption';
const ATLAS_URI  = 'mongodb://rajkumaryathirajyam_db_user:SyTW89AJGZki1old@cluster0.mb2zdhv.mongodb.net/pet_adoption?appName=Cluster0&tls=true&tlsAllowInvalidCertificates=true';

const COLLECTIONS = [
  'users','shelters','pets','applications','reviews',
  'favorites','conversations','messages','appointments',
  'notifications','fosterapplications'
];

console.log('Connecting to local...');
const local = await mongoose.createConnection(LOCAL_URI).asPromise();
console.log('✅ Local connected');

console.log('Connecting to Atlas...');
const atlas = await mongoose.createConnection(ATLAS_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
}).asPromise();
console.log('✅ Atlas connected\n');

for (const name of COLLECTIONS) {
  const docs = await local.db.collection(name).find({}).toArray();
  if (docs.length === 0) {
    console.log(`SKIP  ${name} (empty)`);
    continue;
  }
  await atlas.db.collection(name).deleteMany({});
  await atlas.db.collection(name).insertMany(docs);
  console.log(`DONE  ${name}: ${docs.length} docs migrated`);
}

await local.close();
await atlas.close();
console.log('\n✅ Migration complete! All local data is now on Atlas.');
