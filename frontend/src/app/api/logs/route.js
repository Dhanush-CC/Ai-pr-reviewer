import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import ReviewLog from "@/models/ReviewLog";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const repositoryId = searchParams.get("repositoryId");

  if (!repositoryId) {
    return NextResponse.json({ error: "Repository ID required" }, { status: 400 });
  }

  try {
    await dbConnect();
    
    // Fetch the 10 most recent reviews for this specific repository
    const logs = await ReviewLog.find({ repositoryFullName: repositoryId })
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(10);
      
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}