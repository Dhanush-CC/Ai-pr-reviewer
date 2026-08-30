import mongoose from 'mongoose';

const RepoConfigSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, unique: true, index: true },
  tone: { type: String, enum: ['strict', 'educational', 'lenient'], default: 'educational' },
  focusAreas: [{ type: String }], // e.g., ['security', 'react-best-practices', 'performance']
  isActive: { type: Boolean, default: true }
});

export const RepoConfig = mongoose.model('RepoConfig', RepoConfigSchema);