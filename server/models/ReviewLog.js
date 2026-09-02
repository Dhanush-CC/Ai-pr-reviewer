const mongoose = require('mongoose');

const ReviewLogSchema = new mongoose.Schema({
  repositoryFullName: { 
    type: String, 
    required: true,
    index: true // Indexed for faster queries on the frontend
  },
  prNumber: { 
    type: Number, 
    required: true 
  },
  commitSha: { 
    type: String, 
    required: true 
  },
  summary: { 
    type: String // The high-level Markdown summary from the AI
  },
  issuesFound: { 
    type: Number, 
    default: 0 // How many inline comments the AI generated
  },
  status: { 
    type: String, 
    enum: ['success', 'failed', 'fallback'], 
    default: 'success' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('ReviewLog', ReviewLogSchema);