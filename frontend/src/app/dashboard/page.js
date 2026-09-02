"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Save, Loader2, GitBranch, Settings } from "lucide-react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [tone, setTone] = useState("educational");
  const [focusAreas, setFocusAreas] = useState(["logic", "performance", "security"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/");
    }
    if (status === "authenticated") {
      fetchRepos();
    }
  }, [status]);

  const fetchRepos = async () => {
    try {
      const res = await fetch("/api/repos");
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      }
    } catch (error) {
      console.error("Failed to fetch repos", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRepoSelect = async (repoFullName) => {
    setSelectedRepo(repoFullName);
    try {
      const res = await fetch(`/api/config?repositoryId=${repoFullName}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tone) setTone(data.tone);
        if (data.focusAreas) setFocusAreas(data.focusAreas);
      } else {
        setTone("educational");
        setFocusAreas(["logic", "performance", "security"]);
      }
    } catch (error) {
      console.error("Failed to fetch config", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: selectedRepo, tone, focusAreas }),
      });
    } catch (error) {
      console.error("Failed to save config", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleFocusArea = (area) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  if (loading && !repos.length) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
      <div className="md:col-span-1 border border-slate-800 bg-slate-900/50 rounded-xl p-4 overflow-y-auto max-h-[75vh]">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-slate-400" />
          Your Repositories
        </h2>
        <div className="space-y-2">
          {repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => handleRepoSelect(repo.full_name)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                selectedRepo === repo.full_name
                  ? "bg-blue-600/20 border-blue-500 text-blue-100"
                  : "hover:bg-slate-800 text-slate-300 border-transparent"
              } border`}
            >
              {repo.name}
            </button>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 border border-slate-800 bg-slate-900/50 rounded-xl p-6">
        {!selectedRepo ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 min-h-[300px]">
            <Settings className="w-12 h-12 opacity-20" />
            <p>Select a repository to configure AI rules</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{selectedRepo}</h2>
              <p className="text-slate-400 text-sm">
                Configure how the AI reviewer behaves for this specific project.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">AI Review Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="strict">Strict (Fails on minor issues)</option>
                <option value="educational">Educational (Explains the why behind changes)</option>
                <option value="lenient">Lenient (Focuses only on critical bugs)</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">Focus Areas</label>
              <div className="grid grid-cols-2 gap-3">
                {["logic", "performance", "security", "modern best practices", "accessibility"].map(
                  (area) => (
                    <label
                      key={area}
                      className="flex items-center gap-3 p-3 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={focusAreas.includes(area)}
                        onChange={() => toggleFocusArea(area)}
                        className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900 bg-slate-950"
                      />
                      <span className="capitalize text-slate-300 text-sm">{area}</span>
                    </label>
                  )
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Configuration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}