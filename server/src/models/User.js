const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isSuperAdmin: { type: Boolean, default: false },
    preferences: {
      genres: [{ type: String }],
      languages: [{ type: String }],
      region: { type: String, default: 'IN' },
    },
    badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
    points: { type: Number, default: 0 },
    watchedCount: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    refreshTokens: [{ type: String, select: false }],
    socialLinks: {
      twitter: { type: String, default: '' },
      instagram: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokens;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
