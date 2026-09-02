require("dotenv").config();
const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const { Octokit } = require("@octokit/rest");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");

// Database Models
const RepoConfig = require("./models/RepoConfig");
const ReviewLog = require("./models/ReviewLog");

// Initialize API Clients
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const redisConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("📦 Worker connected to MongoDB"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Worker configuration
const worker = new Worker("pr-review-queue", async (job) => {
    const { repositoryFullName, owner, repo, prNumber, commitSha } = job.data;
    console.log(`⚙️ Processing job for ${repositoryFullName} PR #${prNumber}`);

    let aiResponse = null;

    try {
      // 1. Fetch Dynamic Rules from MongoDB (from your Next.js Dashboard)
      let config = await RepoConfig.findOne({ repositoryId: repositoryFullName });
      if (!config) {
        config = { tone: "educational", focusAreas: ["logic", "performance", "security"] };
      }
      console.log(`🤖 Tone: ${config.tone} | Focus: ${config.focusAreas.join(", ")}`);

      // 2. Fetch the raw code diff from GitHub
      const diffResponse = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
        mediaType: { format: "diff" },
      });
      const diff = diffResponse.data;

      // Skip empty PRs
      if (!diff || typeof diff !== "string") {
        console.log("No valid diff found, skipping.");
        return;
      }

      // 3. Prompt Gemini to return structured JSON
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        You are an expert code reviewer.
        Review Tone: ${config.tone}.
        Focus Areas: ${config.focusAreas.join(", ")}.
        
        Analyze the following git diff and output your review STRICTLY as a JSON object matching this exact structure:
        {
          "summary": "High-level summary of the PR and overall architecture feedback in Markdown",
          "comments": [
            { "path": "file/path.js", "line": 15, "body": "Specific issue on this line" }
          ]
        }
        
        Do not include markdown code blocks like \`\`\`json in your output. Just output the raw JSON string.
        
        Diff:
        ${diff}
      `;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      
      aiResponse = JSON.parse(rawText);

      // 4. Format GitHub Inline Review Payload
      const reviewComments = (aiResponse.comments || []).map((comment) => ({
        path: comment.path,
        line: comment.line,
        body: comment.body,
      }));

      // 5. Post to GitHub with Graceful Degradation
      try {
        if (reviewComments.length > 0) {
          // Attempt specific inline comments first
          await octokit.pulls.createReview({
            owner,
            repo,
            pull_number: prNumber,
            commit_id: commitSha,
            body: aiResponse.summary,
            event: "COMMENT",
            comments: reviewComments,
          });
          console.log(`✅ Inline review posted to GitHub for PR #${prNumber}`);
        } else {
          // Just post the summary if no inline comments were generated
          await octokit.issues.createComment({
            owner,
            repo,
            issue_number: prNumber,
            body: `### 🤖 AI Code Review Summary\n\n${aiResponse.summary}`,
          });
          console.log(`✅ Summary review posted to GitHub for PR #${prNumber}`);
        }
      } catch (githubError) {
        console.warn("⚠️ Inline comment failed (likely invalid line number). Falling back to general PR comment.");
        
        // Fallback: Dump everything into a single PR comment so feedback isn't lost
        let fallbackBody = `### 🤖 AI Code Review Summary\n\n${aiResponse.summary}\n\n### 📝 Inline Feedback\n`;
        reviewComments.forEach(c => {
          fallbackBody += `- **${c.path}** (Line ${c.line}): ${c.body}\n`;
        });

        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: fallbackBody,
        });
        console.log(`✅ Fallback review posted to GitHub for PR #${prNumber}`);
      }

      // 6. Save Analytics to MongoDB for the Dashboard feed
      await ReviewLog.create({
        repositoryFullName: repositoryFullName,
        prNumber: prNumber,
        commitSha: commitSha,
        summary: aiResponse.summary,
        issuesFound: reviewComments.length,
        status: "success",
      });
      console.log(`📊 Analytics saved to database for ${repositoryFullName}`);

    } catch (error) {
      console.error(`❌ Worker Job Failed for PR #${prNumber}:`, error.message);
      
      // Save failure state to the database so the user can see it failed on the dashboard
      await ReviewLog.create({
        repositoryFullName: repositoryFullName || "unknown",
        prNumber: prNumber || 0,
        commitSha: commitSha || "unknown",
        summary: `Error processing review: ${error.message}`,
        issuesFound: 0,
        status: "failed",
      });
      
      throw error; // Let BullMQ handle retries
    }
  },
  { connection: redisConnection }
);

worker.on("completed", (job) => console.log(`🏁 Job ${job.id} completed successfully`));
worker.on("failed", (job, err) => console.error(`🚨 Job ${job.id} failed:`, err.message));