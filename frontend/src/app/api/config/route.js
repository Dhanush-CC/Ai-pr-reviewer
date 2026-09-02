import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/mongodb";
import RepoConfig from "@/models/RepoConfig";
import { authOptions } from "../auth/[...nextauth]/route";
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const repositoryId = searchParams.get("repositoryId");

  if (!repositoryId) {
    return NextResponse.json({ error: "Repository ID is required" }, { status: 400 });
  }

  try {
    await dbConnect();
    const config = await RepoConfig.findOne({ repositoryId });
    return NextResponse.json(config || {});
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { repositoryId, tone, focusAreas } = await req.json();
    await dbConnect();

    // upsert: true will create the document if it doesn't exist, or update it if it does
    const updatedConfig = await RepoConfig.findOneAndUpdate(
      { repositoryId },
      { tone, focusAreas, updatedAt: new Date() },
      { new: true, upsert: true }
    );

    return NextResponse.json(updatedConfig);
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}