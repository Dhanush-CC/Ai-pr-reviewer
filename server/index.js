// server/index.js
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { verifyGithubSignature } from './middleware/verifyGithubSignature.js';
import { ReviewLedger } from './models/ReviewLedger.js';
import { prReviewQueue } from './queue.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5500;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('🗄️  Gateway connected to MongoDB.'))
  .catch(err => console.error('❌ Gateway MongoDB error:', err));

app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

app.post('/api/webhooks/github', verifyGithubSignature, async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  if (event === 'pull_request') {
    const action = payload.action;
    
    if (action === 'opened' || action === 'synchronize') {
      const commitSha = payload.pull_request.head.sha; 
      const repoFullName = payload.repository.full_name;
      const prNumber = payload.pull_request.number;

      try {
        // Idempotency check happens instantly
        const existingReview = await ReviewLedger.findOne({ commitSha });
        if (existingReview) {
          console.log(`⏭️  Skipping: Commit ${commitSha} was already reviewed.`);
          return res.status(200).send('Already processed');
        }

        // Push to Redis and immediately respond to GitHub
        await prReviewQueue.add('analyze-pr', { repoFullName, prNumber, commitSha });
        
        console.log(`📥 Job queued for PR #${prNumber}`);
        return res.status(200).send('Webhook queued successfully');
        
      } catch (error) {
        console.error('❌ Error queueing PR:', error.message);
        return res.status(500).send('Internal Server Error');
      }
    }
  }
  res.status(200).send('Webhook received but ignored');
});

app.listen(PORT, () => {
  console.log(`🚀 Gateway listening on port ${PORT}`);
});