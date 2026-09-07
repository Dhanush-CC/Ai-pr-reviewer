import mongoose from 'mongoose';

const RepoConfigSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, unique: true },
  tone: { type: String, default: "educational" },
  focusAreas: { type: [String], default: ["logic", "performance", "security"] },
  userAccessToken: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

export const RepoConfig = mongoose.model('RepoConfig', RepoConfigSchema);