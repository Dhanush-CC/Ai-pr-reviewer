import express from 'express';
import dotenv from 'dotenv';
import { verifyGithubSignature } from './middleware/verifyGithubSignature.js';
import { Octokit } from 'octokit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5500;

// Initialize the GitHub API client
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.post('/api/webhooks/github', verifyGithubSignature, async (req, res) => {
    const event = req.headers['x-github-event'];
    const payload = req.body;
    
    // 1. Respond to GitHub immediately so they don't timeout (Status 200)
    res.status(200).send('Webhook received successfully');

    console.log(`\n🔔 Received GitHub Event: [${event}]`);
    
    if (event === 'pull_request') {
        const prNumber = payload.pull_request.number;
        const repoFullName = payload.repository.full_name;
        const action = payload.action; 
        
        console.log(`📂 PR #${prNumber} in ${repoFullName} was ${action}.`);
        
        // Only fetch code if the PR was just opened or updated
        if (action === 'opened' || action === 'synchronize') {
            const [owner, repo] = repoFullName.split('/');

            try {
                console.log('Fetching raw git diff...');
                
                // 2. Ask GitHub for the exact lines of code that changed
                const { data: diff } = await octokit.rest.pulls.get({
                    owner: owner,
                    repo: repo,
                    pull_number: prNumber,
                    mediaType: {
                        format: "diff", // This tells GitHub we want the raw diff, not JSON metadata
                    },
                });

                console.log('\n--- RAW DIFF CAPTURED ---\n');
                console.log(diff);
                console.log('\n-------------------------\n');

            } catch (error) {
                console.error('Error fetching diff:', error.message);
            }
        }
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Gateway listening on port ${PORT}`);
});