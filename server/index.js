import express from 'express';
import dotenv from 'dotenv';
import { verifyGithubSignature } from './middleware/verifyGithubSignature.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Capture the raw unparsed body for accurate HMAC signature verification
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// The main webhook ingestion endpoint
app.post('/api/webhooks/github', verifyGithubSignature, (req, res) => {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    console.log(`\n🔔 Received GitHub Event: [${event}]`);
    
    // We only care about pull requests for this project
    if (event === 'pull_request') {
        const prNumber = payload.pull_request.number;
        const repoName = payload.repository.full_name;
        const action = payload.action; // e.g., 'opened', 'synchronize', 'reopened'
        
        console.log(`📂 PR #${prNumber} in ${repoName} was ${action}.`);
        
        // This is where Milestone 2 (Data Extraction) will begin
        // We will fetch the diff here.
    }

    // Always respond with 200 OK immediately so GitHub knows we received it
    res.status(200).send('Webhook received successfully');
});

app.listen(PORT, () => {
    console.log(`🚀 Gateway listening on port ${PORT}`);
});