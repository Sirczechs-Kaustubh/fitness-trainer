"use client";

import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import Button from "@/components/ui/Button";

export default function NavBar() {
  const { user, ready, logout } = useAuth();

  // Avoid hydration flicker
  if (!ready) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-9 w-20 rounded-2xl bg-white/10 animate-pulse" />
        <div className="h-9 w-24 rounded-2xl bg-white/10 animate-pulse" />
      </div>
    );
  }

  // Not logged in → show public CTAs
  if (!user) {
    return (
      <nav className="flex items-center gap-3">
        <Button as={Link} href="/register" size="md">Get Started</Button>
        <Button as={Link} href="/login" size="md" variant="secondary">Login</Button>
      </nav>
    );
  }

  // Logged in → show app nav
  return (
    <nav className="flex items-center gap-3">
      <Link href="/dashboard" className="text-sm text-brand-muted hover:text-brand-text">
        Dashboard
      </Link>
      <Link href="/profile" className="text-sm text-brand-muted hover:text-brand-text">
        Profile
      </Link>
      <Button onClick={logout} size="md" variant="secondary">
        Logout
      </Button>
    </nav>
  );
}
