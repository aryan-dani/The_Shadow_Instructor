"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/utils/api";
import { Loader2, DollarSign, Activity } from "lucide-react";

export function AdminAnalytics() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/admin/usage`, {
        headers: {
          "x-admin-password": password,
        },
      });

      if (!res.ok) {
        throw new Error("Invalid admin password");
      }

      const usageData = await res.json();
      setData(usageData);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 mb-10 mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-neutral-400 w-5 h-5" />
          <h2 className="text-lg font-medium text-white">Admin System Usage</h2>
        </div>
        <form
          onSubmit={handleLogin}
          className="flex gap-3 items-center max-w-sm"
        >
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:border-neutral-500 outline-none"
          />
          <button
            type="submit"
            disabled={loading || !password}
            className="px-4 py-2 bg-white text-black font-medium rounded-lg text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center min-w-20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
          </button>
        </form>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 mb-10 mt-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <DollarSign className="text-green-400 w-5 h-5" />
          <h2 className="text-lg font-medium text-white">
            API Usage & Cost Breakdown
          </h2>
        </div>
        <button
          onClick={() => {
            setIsAuthenticated(false);
            setPassword("");
          }}
          className="text-xs text-neutral-500 hover:text-white transition-colors"
        >
          Lock
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
          <p className="text-xs text-neutral-400 mb-1">Total Burnt API Cost</p>
          <p className="text-2xl font-semibold text-white">
            ${data.total_cost.toFixed(4)}
          </p>
        </div>
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
          <p className="text-xs text-neutral-400 mb-1">Cost Cap Allocation</p>
          <p className="text-2xl font-semibold text-white">
            ${data.budget.toFixed(2)}
          </p>
          <div className="w-full bg-neutral-700 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${data.is_capped ? "bg-red-500" : "bg-green-500"}`}
              style={{
                width: `${Math.min((data.total_cost / data.budget) * 100, 100)}%`,
              }}
            ></div>
          </div>
        </div>
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 flex flex-col justify-center">
          <p className="text-xs text-neutral-400 mb-1">System Status</p>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${data.is_capped ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
            ></div>
            <p
              className={`font-medium ${data.is_capped ? "text-red-400" : "text-green-400"}`}
            >
              {data.is_capped ? "API CAP REACHED" : "OPERATIONAL"}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-neutral-400">
          <thead className="bg-neutral-800/50 text-xs uppercase border-b border-neutral-800">
            <tr>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Prompt Tokens</th>
              <th className="px-4 py-3">Completion Tokens</th>
              <th className="px-4 py-3">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {data.breakdown && data.breakdown.length > 0 ? (
              data.breakdown.map((row: any, i: number) => (
                <tr
                  key={i}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {row.model}
                  </td>
                  <td className="px-4 py-3">
                    {row.prompt_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {row.completion_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-green-400">
                    ${row.cost.toFixed(4)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  No usage tracked yet. Start making API requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
