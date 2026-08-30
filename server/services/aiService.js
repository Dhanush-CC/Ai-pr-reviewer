import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

// 1. Simplified JSON schema to prevent LangChain parsing lockups
const ReviewSchema = z.object({
  summary: z.string().describe("A brief overall summary of the PR code quality"),
  comments: z.array(
    z.object({
      file: z.string().describe("The file path where the issue was found"),
      line: z.number().describe("The line number in the diff that needs attention"),
      comment: z.string().describe("Actionable, constructive feedback or bug/optimization suggestion"),
      severity: z.enum(["info", "warning", "critical"]).describe("Level of severity")
    })
  ).describe("Array of line-specific comments")
});

export const analyzeDiffWithAI = async (rawDiff, config) => {
  const sanitizedDiff = sanitizeDiff(rawDiff);

  console.log("Sanitized Diff length:", sanitizedDiff.length);

  if (!sanitizedDiff.trim()) {
    console.log("No relevant code changes to review.");
    return null;
  }

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash", 
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.2,
    maxRetries: 0, 
  });

  const structuredLlm = model.withStructuredOutput(ReviewSchema);

  // Inject the MongoDB config directly into the AI's system instructions
  const prompt = `
You are a Staff Software Engineer conducting an automated code review on a GitHub Pull Request.

Your tone should be: ${config.tone}.
Focus heavily on the following areas: ${config.focusAreas.join(', ')}.

Analyze the following git diff carefully. Focus on logic flaws, potential bugs, time/space complexity, security vulnerabilities, and code readability.

Only provide line-level comments for lines that are newly added (marked with '+') or clearly visible in the diff chunk context.

Git Diff:
${sanitizedDiff}
`;

  try {
    console.log("Sending diff to AI for analysis...");
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Gemini API Timeout after 15 seconds. Check network or API Key.")), 15000)
    );
    
    const reviewResult = await Promise.race([
      structuredLlm.invoke(prompt),
      timeout
    ]);
    
    return reviewResult;
  } catch (err) {
    console.error("AI Analysis failed:", err.message || err);
    throw err;
  }
};

/**
 * Strips out lockfiles, svgs, json bundles, and irrelevant noise
 */
function sanitizeDiff(rawDiff) {
  const diffChunks = rawDiff.split("diff --git ");
  const ignoredExtensions = [".lock", "package-lock.json", "yarn.lock", ".svg", ".png", ".jpg", ".min.js"];

  const filteredChunks = diffChunks.filter((chunk) => {
    if (!chunk.trim()) return false;
    const firstLine = chunk.split("\n")[0];
    return !ignoredExtensions.some((ext) => firstLine.includes(ext));
  });

  return filteredChunks.join("diff --git ");
}