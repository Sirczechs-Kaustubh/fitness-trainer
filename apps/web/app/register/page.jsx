"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Dumbbell, Activity, LineChart, Brain } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import api from "@/lib/apiClient";

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay: d } },
});

export default function RegisterPage() {
  const router = useRouter();

  // Keep sign up minimal to reduce friction.

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {

      // --- FIX IS HERE ---
      
      // Create a new object with only the required fields.
      const registrationPayload = {
        name: form.name,
        email: form.email,
        password: form.password,
      };

      // Send the new payload object instead of the entire form state.
      await api.post("/auth/register", registrationPayload);

      // --- END OF FIX ---


      router.push("/login");
    } catch (error) {
      setErr(error?.response?.data?.message || "Registration failed. Try again.");
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
          Create your{" "}
          <span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
            FormFit
          </span>{" "}
          account
        </h1>
        <p className="mt-4 text-brand-muted">
          Set up your profile to personalize recommendations, track BMI, and save workout history.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="h-24 flex flex-col items-center justify-center rounded-2xl bg-brand-primary/15 border border-white/10">
            <Dumbbell className="h-8 w-8 text-brand-primary" />
            <p className="mt-2 text-xs text-brand-muted">Training</p>
          </div>
          <div className="h-24 flex flex-col items-center justify-center rounded-2xl bg-brand-accent/15 border border-white/10">
            <Activity className="h-8 w-8 text-brand-accent" />
            <p className="mt-2 text-xs text-brand-muted">Wellness</p>
          </div>
          <div className="h-24 flex flex-col items-center justify-center rounded-2xl bg-brand-primary/10 border border-white/10">
            <LineChart className="h-8 w-8 text-brand-primary" />
            <p className="mt-2 text-xs text-brand-muted">Analytics</p>
          </div>
          <div className="h-24 flex flex-col items-center justify-center rounded-2xl bg-brand-accent/10 border border-white/10">
            <Brain className="h-8 w-8 text-brand-accent" />
            <p className="mt-2 text-xs text-brand-muted">AI Coach</p>
          </div>
        </div>

        <ul className="mt-8 space-y-2 text-brand-muted">
          <li>• Secure JWT authentication</li>
          <li>• Profile with height/weight/goals</li>
          <li>• Real-time workouts via WebSockets</li>
        </ul>
      </motion.section>

      {/* RIGHT FORM */}
      <motion.section {...fade(0.1)} className="mx-auto w-full max-w-md">
        <Card title="Create account" subtitle="Join FormFit in under a minute" className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            {err && <p className="text-sm text-red-500">{err}</p>}


            <div className="grid grid-cols-1 gap-4">
              {/* Name */}
              <div>

                <label className="mb-1 block text-sm font-medium">Name</label>
                <Input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder="Your full name"
                  required
                />
              </div>

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
                />
              </div>

              {/* Password */}

              <div>

                <label className="mb-1 block text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    placeholder="Create a strong password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-2.5 text-brand-muted hover:text-brand-text"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M2 12s4-7 10-7 10 7 10 7a17 17 0 0 1-4 4" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-brand-muted">Use 8+ chars with a number</p>
              </div>


              {/* Profile details will be collected after login via a gentle prompt. */}

            </div>

            <div className="flex items-center justify-between pt-2">
              <Link href="/login" className="text-sm text-brand-muted hover:text-brand-text">
                Already have an account? Login
              </Link>
              <Button type="submit" loading={loading}>
                Create account
              </Button>
            </div>
          </form>
        </Card>

        <p className="mt-4 text-center text-xs text-brand-muted">
          You can add more details later in your Profile.
        </p>
      </motion.section>
    </div>
  );
}
