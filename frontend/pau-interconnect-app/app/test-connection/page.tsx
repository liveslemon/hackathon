"use client";

import { useState, useEffect } from "react";
import { Typography, Card, CardContent, Button, Stack } from "@/components/ui";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function TestConnectionPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    const results: any = {
      url: BACKEND_URL,
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Simple GET to root
    try {
      const start = Date.now();
      const res = await fetch(`${BACKEND_URL}/`);
      const duration = Date.now() - start;
      results.tests.root_get = {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        duration: `${duration}ms`,
        data: await res.json().catch(e => `Error parsing JSON: ${e.message}`)
      };
    } catch (e: any) {
      results.tests.root_get = {
        ok: false,
        error: e.name,
        message: e.message,
        stack: e.stack?.split("\n").slice(0, 2).join("\n")
      };
    }

    // Test 2: Preflight test (OPTIONS)
    try {
      const res = await fetch(`${BACKEND_URL}/`, { method: 'OPTIONS' });
      results.tests.preflight = {
        ok: res.ok,
        status: res.status,
        headers: Array.from(res.headers.entries())
      };
    } catch (e: any) {
      results.tests.preflight = { ok: false, message: e.message };
    }

    setStatus(results);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-10 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <Typography variant="h2" weight="bold">Backend Diagnostic Tool</Typography>
          <Typography color="muted">Testing connection to: <span className="text-indigo-600">{BACKEND_URL}</span></Typography>
        </header>

        <Button onClick={testConnection} isLoading={loading}>Run Connectivity Diagnostic</Button>

        {status && (
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <pre className="text-xs bg-slate-900 text-emerald-400 p-6 rounded-2xl overflow-x-auto">
                {JSON.stringify(status, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {status && !status.tests.root_get.ok && (
          <div className="p-6 bg-red-50 border border-red-100 rounded-2xl text-red-800">
            <Typography variant="h6" weight="bold">Analysis:</Typography>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              {status.tests.root_get.message === "Failed to fetch" && (
                <li><strong>Network Error</strong>: This usually means the URL is wrong, the server is down, or CORS blocked the request before it reached the status code phase.</li>
              )}
              {status.url.startsWith("http://") && typeof window !== "undefined" && window.location.protocol === "https:" && (
                <li><strong>Mixed Content</strong>: You are trying to call an <code>http</code> backend from an <code>https</code> frontend. Browsers block this by default.</li>
              )}
              <li>Verify that <code>NEXT_PUBLIC_BACKEND_URL</code> in Vercel is set to <code>{status.url}</code> (check for double slashes or missing https).</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
