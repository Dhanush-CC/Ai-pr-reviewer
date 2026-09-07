// src/app/dashboard/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Save, Loader2, GitBranch, Settings, Activity, CheckCircle, XCircle, MessageSquare, Webhook } from "lucide-react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [tone, setTone] = useState("educational");
  const [focusAreas, setFocusAreas] = useState(["logic", "performance", "security"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Analytics state
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Webhook setup state
  const [settingUpWebhook, setSettingUpWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") redirect("/");
    if (status === "authenticated") fetchRepos();
  }, [status]);

  const fetchRepos = async () => {
    try {
      const res = await fetch("/api/repos");
      if (res.ok) setRepos(await res.json());
    } catch (error) {
      console.error("Failed to fetch repos", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRepoSelect = async (repoFullName) => {
    setSelectedRepo(repoFullName);
    setWebhookStatus(null);
    
    try {
      const res = await fetch(`/api/config?repositoryId=${repoFullName}`);
      if (res.ok) {
        const data = await res.json();
        setTone(data.tone || "educational");
        setFocusAreas(data.focusAreas || ["logic", "performance", "security"]);
      }
    } catch (error) {
      console.error("Failed to fetch config", error);
    }

    setLoadingLogs(true);
    try {
      const logRes = await fetch(`/api/logs?repositoryId=${repoFullName}`);
      if (logRes.ok) {
        setLogs(await logRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoadingLogs(false);
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

  const handleSetupWebhook = async () => {
    if (!selectedRepo) return;
    setSettingUpWebhook(true);
    setWebhookStatus(null);

    // selectedRepo is in the format "owner/repo"
    const [owner, repo] = selectedRepo.split("/");

    try {
      const res = await fetch("/api/webhooks/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo }),
      });

      const data = await res.json();
      if (res.ok) {
        setWebhookStatus({ type: "success", text: data.message || "Webhook configured successfully!" });
      } else {
        setWebhookStatus({ type: "error", text: data.error || "Failed to setup webhook." });
      }
    } catch (error) {
      setWebhookStatus({ type: "error", text: "Network error configuring webhook." });
    } finally {
      setSettingUpWebhook(false);
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
      {/* Left Sidebar: Repositories */}
      <div className="md:col-span-1 border border-slate-800 bg-slate-900/50 rounded-xl p-4 overflow-y-auto max-h-[85vh]">
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

      {/* Right Column: Config & Webhook & Analytics */}
      <div className="md:col-span-2 space-y-6">
        {!selectedRepo ? (
          <div className="flex flex-col items-center justify-center border border-slate-800 bg-slate-900/50 rounded-xl h-[400px] text-slate-500 space-y-4">
            <Settings className="w-12 h-12 opacity-20" />
            <p>Select a repository to configure AI rules</p>
          </div>
        ) : (
          <>
            {/* Configuration Panel */}
            <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedRepo}</h2>
                  <p className="text-slate-400 text-sm">Configure how the AI behaves and activate the webhook.</p>
                </div>
                
                {/* Automated Webhook Activation Button */}
                <button
                  onClick={handleSetupWebhook}
                  disabled={settingUpWebhook}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors"
                >
                  {settingUpWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
                  Enable AI Review
                </button>
              </div>

              {webhookStatus && (
                <div className={`mb-6 p-3 rounded-lg text-sm border ${
                  webhookStatus.type === "success" 
                    ? "bg-emerald-950/40 border-emerald-800 text-emerald-300" 
                    : "bg-red-950/40 border-red-800 text-red-300"
                }`}>
                  {webhookStatus.text}
                </div>
              )}

              <div className="space-y-6">
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
                    {["logic", "performance", "security", "modern best practices", "accessibility"].map((area) => (
                      <label key={area} className="flex items-center gap-3 p-3 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={focusAreas.includes(area)}
                          onChange={() => toggleFocusArea(area)}
                          className="w-4 h-4 rounded border-slate-700 text-blue-600 bg-slate-950"
                        />
                        <span className="capitalize text-slate-300 text-sm">{area}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>

            {/* Analytics Feed */}
            <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Recent Review Activity
              </h2>
              
              {loadingLogs ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-lg">
                  No PR reviews found for this repository yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log._id} className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {log.status === "success" || log.status === "fallback" ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className="font-medium text-slate-200">Pull Request #{log.prNumber}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {log.issuesFound} Issues Flagged
                        </span>
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-300">
                          {log.commitSha.substring(0, 7)}
                        </span>
                      </div>
                      
                      {log.summary && (
                        <div className="text-sm text-slate-400 bg-slate-900 p-3 rounded border border-slate-800 line-clamp-3">
                          {log.summary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}