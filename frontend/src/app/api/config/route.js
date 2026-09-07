import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import RepoConfig from "@/models/RepoConfig";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repositoryId, tone, focusAreas } = await req.json();

  try {
    await dbConnect();
    
    // Upsert the configuration along with the user's active token
    const config = await RepoConfig.findOneAndUpdate(
      { repositoryId },
      { 
        tone, 
        focusAreas, 
        userAccessToken: session.accessToken, // Injected here
        updatedAt: new Date() 
      },
      { new: true, upsert: true }
    );

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}