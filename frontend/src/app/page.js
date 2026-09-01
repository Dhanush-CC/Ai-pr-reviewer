"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { GitBranch, ArrowRight, ShieldCheck, Cpu, SlidersHorizontal } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <main className="flex flex-col items-center justify-center min-h-[90vh] px-4">
      <div className="max-w-3xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/80 text-xs text-slate-400">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span>Distributed Microservice Architecture</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Automated PR Reviews with Custom AI Personas
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Configure dynamic rule engines, select AI review tones, and orchestrate automated pull request evaluations across your repositories.
        </p>

        <div className="pt-4 flex items-center justify-center gap-4">
          {status === "authenticated" ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold text-white transition-colors"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => signOut()}
                className="px-6 py-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                Sign Out ({session.user?.name || session.user?.email})
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("github")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-slate-950 hover:bg-slate-200 font-semibold transition-colors"
            >
              <GitBranch className="w-5 h-5" />
              Sign in with GitHub
            </button>
          )}
        </div>
      </div>
    </main>
  );
}