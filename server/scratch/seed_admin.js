const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('../src/models/User');

async function seedAdmin() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/movie_r');
  
  const adminEmail = 'admin@movieai.com';
  const adminPassword = 'AdminPassword123!';
  
  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    console.log('Admin user already exists. Updating to super admin role...');
    existing.role = 'admin';
    existing.isSuperAdmin = true;
    await existing.save();
    console.log('Update successful.');
  } else {
    console.log('Creating new super admin user...');
    await User.create({
      name: 'Global Admin',
      email: adminEmail,
      passwordHash: adminPassword,
      passwordPlain: adminPassword,
      role: 'admin',
      isSuperAdmin: true
    });
    console.log('Admin account created successfully!');
  }
  
  console.log('--- ADMIN CREDENTIALS ---');
  console.log('Email:', adminEmail);
  console.log('Password:', adminPassword);
  console.log('--------------------------');
  
  process.exit(0);
}
seedAdmin();
