"use client";
import { useState } from "react";

export function useMutation() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function send(path: string, method: string, payload?: unknown): Promise<Record<string, unknown> | null> {
    setError(""); setPending(true);
    try {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, ...(payload ? { body: JSON.stringify(payload) } : {}) });
      const result = await response.json() as { data?: Record<string, unknown>; error?: string };
      if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
      return result.data ?? {};
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : "Connection failed. Please retry.");
      return null;
    } finally { setPending(false); }
  }
  return { send, error, pending };
}
