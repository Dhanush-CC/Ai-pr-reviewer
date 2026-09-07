// src/app/api/webhooks/setup/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req) {
  // Retrieve the session along with the elevated GitHub access token
  const session = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized or missing access token" }, { status: 401 });
  }

  const { owner, repo } = await req.json();
  const targetUrl = process.env.WEBHOOK_TARGET_URL;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!owner || !repo) {
    return NextResponse.json({ error: "Owner and Repo are required" }, { status: 400 });
  }

  try {
    // 1. Check if the webhook already exists
    const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      headers: { 
        "Authorization": `Bearer ${session.accessToken}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });
    
    if (!checkRes.ok) throw new Error("Failed to fetch repository webhooks");
    
    const hooks = await checkRes.json();
    const hookExists = hooks.find(h => h.config.url === targetUrl);

    if (hookExists) {
      return NextResponse.json({ message: "Webhook already configured for this repository" });
    }

    // 2. Create the new Pull Request webhook
    const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json"
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["pull_request"],
        config: {
          url: targetUrl,
          content_type: "json",
          secret: secret,
        }
      })
    });

    if (!createRes.ok) {
      const errorData = await createRes.json();
      console.error("GitHub API Error:", errorData);
      throw new Error("Failed to create webhook in GitHub");
    }

    return NextResponse.json({ message: "Webhook successfully created" }, { status: 201 });
    
  } catch (error) {
    console.error("Webhook Setup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}