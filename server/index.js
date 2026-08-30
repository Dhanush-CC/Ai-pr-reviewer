import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Octokit } from 'octokit';
import { verifyGithubSignature } from './middleware/verifyGithubSignature.js';
import { analyzeDiffWithAI } from './services/aiService.js';
import { RepoConfig } from './models/RepoConfig.js';
import { ReviewLedger } from './models/ReviewLedger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5500;

// Initialize Octokit
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('🗄️  Connected to MongoDB successfully.'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.post('/api/webhooks/github', verifyGithubSignature, async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  res.status(200).send('Webhook received');
  console.log(`\n🔔 Received GitHub Event: [${event}]`);

  if (event === 'pull_request') {
    const prNumber = payload.pull_request.number;
    const repoFullName = payload.repository.full_name;
    const action = payload.action;
    // Capture the exact commit identifier
    const commitSha = payload.pull_request.head.sha; 

    if (action === 'opened' || action === 'synchronize') {
      try {
        // 1. Idempotency Check: Have we reviewed this exact commit already?
        const existingReview = await ReviewLedger.findOne({ commitSha });
        if (existingReview) {
          console.log(`⏭️  Skipping: Commit ${commitSha} was already reviewed.`);
          return;
        }

        console.log(`📂 PR #${prNumber} in ${repoFullName} was ${action}.`);
        console.log('⏳ Fetching raw git diff...');

        // 2. Fetch the diff
        const { data: diff } = await octokit.rest.pulls.get({
          owner: repoFullName.split('/')[0],
          repo: repoFullName.split('/')[1],
          pull_number: prNumber,
          mediaType: { format: 'diff' },
        });

        // 3. Dynamic Rule Engine: Fetch repo-specific settings (or use defaults)
        const config = await RepoConfig.findOne({ repositoryId: repoFullName }) || {
          tone: 'educational',
          focusAreas: ['logic', 'performance', 'security', 'modern best practices']
        };

        console.log(`🤖 Analyzing with tone: ${config.tone}...`);
        
        // Pass BOTH the diff and the config to our AI service
        const review = await analyzeDiffWithAI(diff, config);

        if (review) {
          const githubComments = review.comments.map(c => ({
            path: c.file,
            line: c.line,
            body: `**[AI ${(c.severity || 'info').toUpperCase()}]**: ${c.comment}`
          }));

          // 4. Post to GitHub
          try {
            await octokit.rest.pulls.createReview({
              owner: repoFullName.split('/')[0],
              repo: repoFullName.split('/')[1],
              pull_number: prNumber,
              body: `### 🤖 AI Code Review Summary\n${review.summary}`,
              event: 'COMMENT',
              comments: githubComments
            });
            console.log('✅ Inline review posted!');
          } catch (postError) {
            console.warn('⚠️ Inline comments failed (line mismatch). Using fallback.');
            
            let fallbackBody = `### 🤖 AI Code Review Summary\n${review.summary}\n\n### Detailed Feedback:\n`;
            review.comments.forEach(c => {
              fallbackBody += `- **${c.file}** (Line ${c.line}): ${c.comment}\n`;
            });

            await octokit.rest.issues.createComment({
              owner: repoFullName.split('/')[0],
              repo: repoFullName.split('/')[1],
              issue_number: prNumber,
              body: fallbackBody
            });
            console.log('✅ Fallback review posted!');
          }

          // 5. Seal the Ledger: Record the transaction so it never runs again
          await ReviewLedger.create({
            commitSha,
            repositoryId: repoFullName,
            prNumber
          });
          console.log('🔒 Transaction sealed in MongoDB.');
        }
      } catch (error) {
        console.error('❌ Error processing PR:', error.message);
      }
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Gateway listening on port ${PORT}`);
});