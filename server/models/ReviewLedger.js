import mongoose from 'mongoose';

const ReviewLedgerSchema = new mongoose.Schema({
  commitSha: { type: String, required: true, unique: true, index: true },
  repositoryId: { type: String, required: true },
  prNumber: { type: Number, required: true },
  processedAt: { type: Date, default: Date.now },
  costTokens: { type: Number, default: 0 } // Future-proofing for analytics
});

export const ReviewLedger = mongoose.model('ReviewLedger', ReviewLedgerSchema);