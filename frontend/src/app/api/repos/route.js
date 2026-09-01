import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

export async function GET(req) {
  // getServerSession requires the auth options if defined externally, 
  // but works directly if NextAuth is configured as a catch-all locally.
  const session = await getServerSession();
  
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch("https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=100", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch repositories");
    }

    const repos = await response.json();
    const formattedRepos = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
    }));

    return NextResponse.json(formattedRepos);
  } catch (error) {
    console.error("GitHub API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}