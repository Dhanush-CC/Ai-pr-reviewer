import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import { Octokit } from 'octokit';
import dotenv from 'dotenv';
import { redisConnection } from './queue.js';
import { analyzeDiffWithAI } from './services/aiService.js';
import { RepoConfig } from './models/RepoConfig.js';
import { ReviewLedger } from './models/ReviewLedger.js';

dotenv.config();

// 1. Initialize standalone connections for the worker process
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('🗄️  Worker connected to MongoDB.'))
  .catch(err => console.error('❌ Worker MongoDB error:', err));

console.log('👷 Worker process started, listening for jobs...');

// 2. Define the job processing logic
const worker = new Worker('pr-review-queue', async job => {
  const { repoFullName, prNumber, commitSha } = job.data;
  const [owner, repo] = repoFullName.split('/');
  
  console.log(`\n⚙️  Processing job for PR #${prNumber} in ${repoFullName}`);

  try {
    // 3. Fetch Diff
    console.log('⏳ Fetching raw git diff...');
    const { data: diff } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: { format: 'diff' },
    });

    // 4. Fetch RepoConfig
    const config = await RepoConfig.findOne({ repositoryId: repoFullName }) || {
      tone: 'educational',
      focusAreas: ['logic', 'performance', 'security', 'modern best practices']
    };

    console.log(`🤖 Analyzing with tone: ${config.tone}...`);
    const review = await analyzeDiffWithAI(diff, config);

    if (review) {
      const githubComments = review.comments.map(c => ({
        path: c.file,
        line: c.line,
        body: `**[AI ${(c.severity || 'info').toUpperCase()}]**: ${c.comment}`
      }));

      // 5. Post to GitHub
      try {
        await octokit.rest.pulls.createReview({
          owner,
          repo,
          pull_number: prNumber,
          body: `### 🤖 AI Code Review Summary\n${review.summary}`,
          event: 'COMMENT',
          comments: githubComments
        });
        console.log('✅ Inline review posted!');
      } catch (postError) {
        console.warn('⚠️ Inline comments failed. Using fallback.');
        let fallbackBody = `### 🤖 AI Code Review Summary\n${review.summary}\n\n### Detailed Feedback:\n`;
        review.comments.forEach(c => {
          fallbackBody += `- **${c.file}** (Line ${c.line}): ${c.comment}\n`;
        });

        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: fallbackBody
        });
        console.log('✅ Fallback review posted!');
      }

      // 6. Seal the Ledger
      await ReviewLedger.create({ commitSha, repositoryId: repoFullName, prNumber });
      console.log('🔒 Transaction sealed in MongoDB.');
    }
  } catch (error) {
    console.error(`❌ Job failed: ${error.message}`);
    throw error; 
  }
}, { connection: redisConnection });

worker.on('failed', (job, err) => {
  console.log(`🚨 Job ${job.id} failed with error: ${err.message}`);
});