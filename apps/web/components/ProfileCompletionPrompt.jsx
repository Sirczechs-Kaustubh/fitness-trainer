"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import Button from "@/components/ui/Button";

// Lightweight, dismissible banner prompting users to complete profile
export default function ProfileCompletionPrompt() {
  const { user, ready } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Determine if the profile is incomplete (no height/weight/age)
  const incomplete = useMemo(() => {
    if (!user) return false;
    const needs = ["height", "weight"]; // minimal fields for BMI & recs
    return needs.some((k) => !user?.[k]);
  }, [user]);

  useEffect(() => {
    if (!ready) return;
    const flag = typeof window !== "undefined" && localStorage.getItem("profilePrompt:dismissed");
    setDismissed(Boolean(flag));
  }, [ready]);

  // If the user completes profile later, clear dismissal so it no longer shows
  useEffect(() => {
    if (!incomplete && typeof window !== "undefined") {
      localStorage.removeItem("profilePrompt:dismissed");
      setDismissed(true);
    }
  }, [incomplete]);

  if (!ready || !user || !incomplete || dismissed) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3">
      <div className="text-sm">
        <p className="font-medium">Complete your profile</p>
        <p className="text-brand-muted">
          Add your height and weight to unlock BMI and personalized coaching.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button as={Link} href="/profile" size="sm">Update now</Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (typeof window !== "undefined") localStorage.setItem("profilePrompt:dismissed", "1");
            setDismissed(true);
          }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

