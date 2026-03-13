require('dotenv').config({ path: './.env' });
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  await connectDB();
  
  const hashed = await bcrypt.hash('admin123', 10);
  
  const admin = await User.create({
    phoneNumber: '+919999999999',
    password: hashed,
    name: 'Admin User',
    role: 'ADMIN',
    verified: true,
    enabled: true
  });
  
  console.log('✅ Admin created:', admin);
  process.exit(0);
}

createAdmin();