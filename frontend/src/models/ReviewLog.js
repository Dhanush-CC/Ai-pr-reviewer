import mongoose from "mongoose";

const ReviewLogSchema = new mongoose.Schema({
  repositoryFullName: { type: String, required: true, index: true },
  prNumber: { type: Number, required: true },
  commitSha: { type: String, required: true },
  summary: { type: String },
  issuesFound: { type: Number, default: 0 },
  status: { type: String, enum: ['success', 'failed', 'fallback'], default: 'success' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.ReviewLog || mongoose.model("ReviewLog", ReviewLogSchema);