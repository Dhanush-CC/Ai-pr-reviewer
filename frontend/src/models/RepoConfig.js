import mongoose from "mongoose";

const RepoConfigSchema = new mongoose.Schema({
  repositoryId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  tone: { 
    type: String, 
    enum: ["strict", "educational", "lenient"], 
    default: "educational" 
  },
  focusAreas: { 
    type: [String], 
    default: ["logic", "performance", "security", "modern best practices"] 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.models.RepoConfig || mongoose.model("RepoConfig", RepoConfigSchema);