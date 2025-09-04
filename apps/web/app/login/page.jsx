"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Dumbbell, Activity, LineChart } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import useAuth from "@/hooks/useAuth";
import api from "@/lib/apiClient";

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay: d } },
});

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.post("/auth/login", form);

      // --- FIX IS HERE ---

      // BEFORE (This is what you have now)
      // login(data); 

      // AFTER (Replace the line above with this)
      const { token, ...userData } = data.data;
      login({ token, user: userData });

      // --- END OF FIX ---
      
      router.push("/dashboard");
    } catch (error) {
      setErr(error?.response?.data?.message || "Unable to login. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-10 items-start">
      {/* LEFT CONTENT (glass panel with icons) */}
      <motion.section
        {...fade(0)}
        className="hidden md:block p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur ring-1 ring-white/5"
      >
        <h1 className="text-4xl font-extrabold leading-tight">
          Welcome back to{" "}
          <span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
            FormFit
          </span>
        </h1>
        <p className="mt-4 text-brand-muted">
          Your AI coach is ready. Log in to access your dashboard, track workouts,
          and get real-time posture feedback.
        </p>

        <ul className="mt-8 space-y-3 text-brand-muted">
          <li>• Instant rep counting & form correction</li>
          <li>• Weekly calories, accuracy trends & heatmaps</li>
          <li>• Personalized goals, BMI & progress insights</li>
        </ul>

        <div className="mt-10 grid grid-cols-3 gap-3">
          <div className="h-24 flex flex-col items-center justify-center rounded-2xl bg-brand-primary/15 border border-white/10">
            <Dumbbell className="h-8 w-8 text-brand-primary" />
            <p className="mt-2 text-xs text-brand-muted">Workouts</p>
          </div>
          <div className="h-24 flex flex-col items-center justify-center rounded-2xl bg-brand-accent/15 border border-white/10">
            <Activity className="h-8 w-8 text-brand-accent" />
            <p className="mt-2 text-xs text-brand-muted">Health</p>
          </div>
          <div className="h-24 flex flex-col items-center justify-center rounded-2xl bg-brand-primary/10 border border-white/10">
            <LineChart className="h-8 w-8 text-brand-primary" />
            <p className="mt-2 text-xs text-brand-muted">Progress</p>
          </div>
        </div>
      </motion.section>

      {/* RIGHT FORM */}
      <motion.section {...fade(0.1)} className="mx-auto w-full max-w-md">
        <Card title="Login" subtitle="Enter your credentials to continue" className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                placeholder="you@example.com"
                required
                leftIcon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5 8l7 5 7-5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                }
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <Input
                type={showPwd ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={onChange}
                placeholder="********"
                required
                leftIcon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="9" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 9V7a4 4 0 1 1 8 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                }
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="text-brand-muted hover:text-brand-text"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    title={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M2 12s4-7 10-7 10 7 10 7a17 17 0 0 1-4 4" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    )}
                  </button>
                }
              />
            </div>

            {err && <p className="text-sm text-red-500">{err}</p>}

            <div className="flex items-center justify-between pt-2 gap-3">
              <Button as={Link} href="/register" variant="secondary" size="md">
                Create an account
              </Button>
              <Button type="submit" size="md" loading={loading}>
                Login
              </Button>
            </div>
          </form>
        </Card>

        <p className="mt-4 text-center text-xs text-brand-muted">
          By continuing, you agree to our Terms & Privacy Policy.
        </p>
      </motion.section>
    </div>
  );
}
