"use client";

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
      <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-6">
        <h1 className="text-3xl font-bold">AI PR Reviewer</h1>
        <p className="text-slate-400">Automate your code reviews with an AI-powered senior engineer.</p>
        <button
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-slate-200 transition-colors"
        >
          <Github className="w-5 h-5" />
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}