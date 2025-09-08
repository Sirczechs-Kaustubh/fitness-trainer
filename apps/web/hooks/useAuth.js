// apps/web/hooks/useAuth.js
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/apiClient";

// --- Minimal global auth store (module-scoped) ---
let currentUser = null;
const subscribers = new Set();

function readSession() {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const userJson = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    currentUser = userJson ? JSON.parse(userJson) : null;
    return { token, user: currentUser };
  } catch {
    currentUser = null;
    return { token: null, user: null };
  }
}

function notify() {
  for (const cb of subscribers) cb(currentUser);
}

export default function useAuth({ requireAuth = false } = {}) {
  const router = useRouter();
  const [user, setUser] = useState(currentUser);
  const [ready, setReady] = useState(false);

  // Initialize from storage and subscribe to changes
  useEffect(() => {
    const { token, user } = readSession();
    setUser(user);

    if (requireAuth && !token) {
      router.replace("/login");
      return; // do not mark ready; we'll re-render after redirect
    }

    // Subscribe to global auth updates
    subscribers.add(setUser);
    setReady(true);

    // Proactively fetch fresh profile if we have a token
    // or if essential fields are missing in local cache.
    if (token) {
      (async () => {
        try {
          const resp = await api.get("/users/me");
          const fresh = (resp && (resp.data?.data ?? resp.data)) || {};
          const merged = { ...(user || {}), ...fresh };
          if (typeof window !== "undefined") {
            localStorage.setItem("user", JSON.stringify(merged));
          }
          currentUser = merged;
          notify();
        } catch (e) {
          // Ignore; fall back to cached user
        }
      })();
    }
    return () => subscribers.delete(setUser);
  }, [requireAuth, router]);

  const login = useCallback((payload) => {
    // Persist + update global store
    localStorage.setItem("token", payload.token);
    localStorage.setItem("user", JSON.stringify(payload.user));
    currentUser = payload.user;
    notify();

    // After login, pull the full profile so UI (BMI/prompt) is accurate
    (async () => {
      try {
        const resp = await api.get("/users/me");
        const fresh = (resp && (resp.data?.data ?? resp.data)) || {};
        const merged = { ...currentUser, ...fresh };
        localStorage.setItem("user", JSON.stringify(merged));
        currentUser = merged;
        notify();
      } catch (e) {
        // Non-fatal
        console.warn("Failed to refresh user profile after login", e?.message);
      }
    })();
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      currentUser = null;
      notify();
      router.push("/login");
    }
  }, [router]);

  return { user, ready, login, logout };
}

