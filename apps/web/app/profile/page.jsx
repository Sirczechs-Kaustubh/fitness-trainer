"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Ruler, Weight, Target } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import api from "@/lib/apiClient";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, delay: d } },
});

export default function ProfilePage() {
  const { user: sessionUser, ready } = useAuth({ requireAuth: false });
  const [form, setForm] = useState({
    name: "",
    email: "",
    age: "",
    height: "",
    weight: "",
    fitnessGoals: "",
  });
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Load profile
  useEffect(() => {
    if (!ready) return;
    let active = true;
    (async () => {
      try {
        const resp = await api.get("/users/me");
        const u = (resp && (resp.data?.data ?? resp.data)) || sessionUser || {};
        if (!active) return;
        const initial = {
          name: u.name || "",
          email: u.email || "",
          age: u.age ?? "",
          height: u.height ?? "",
          weight: u.weight ?? "",
          fitnessGoals: u.fitnessGoals || "",
        };
        setForm(initial);
        setOriginal(initial);
      } catch {
        // Fall back to session if API not ready
        const u = sessionUser || {};
        const initial = {
          name: u.name || "",
          email: u.email || "",
          age: u.age ?? "",
          height: u.height ?? "",
          weight: u.weight ?? "",
          fitnessGoals: u.fitnessGoals || "",
        };
        setForm(initial);
        setOriginal(initial);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [ready, sessionUser]);

  const bmi = useMemo(() => {
    const h = parseFloat(form.height);
    const w = parseFloat(form.weight);
    if (!h || !w) return null;
    const m = h / 100;
    return +(w / (m * m)).toFixed(1);
  }, [form.height, form.weight]);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      const payload = {
        name: form.name,
        age: form.age ? Number(form.age) : undefined,
        height: form.height ? Number(form.height) : undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        fitnessGoals: form.fitnessGoals,
      };
      const resp = await api.put("/users/me", payload);
      const updatedFromPut = (resp && (resp.data?.data ?? resp.data)) || {};
      // Follow with a GET to be 100% in sync with server
      let updated = updatedFromPut;
      try {
        const check = await api.get("/users/me");
        updated = (check && (check.data?.data ?? check.data)) || updatedFromPut;
      } catch {}
      // Persist updated user into localStorage so the session reflects it
      if (typeof window !== "undefined") {
        const prev = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...prev, ...updated }));
      }
      // Update form + original to the server-confirmed values
      const next = {
        name: updated.name ?? form.name,
        email: updated.email ?? form.email,
        age: updated.age ?? form.age,
        height: updated.height ?? form.height,
        weight: updated.weight ?? form.weight,
        fitnessGoals: updated.fitnessGoals ?? form.fitnessGoals,
      };
      setForm(next);
      setOriginal(next);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!ready || loading) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-brand-muted">Manage your personal info & training preferences.</p>
        </div>
        {/* Logout is available in the global NavBar */}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Summary card */}
        <motion.div {...fade(0)} className="lg:col-span-1">
          <Card className="p-6" title="Your Overview">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                <User className="h-6 w-6 text-brand-accent" />
              </div>
              <div>
                <p className="font-medium">{form.name || "—"}</p>
                <p className="text-sm text-brand-muted">{form.email || "—"}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="card-glass p-3 text-center">
                <p className="text-xs text-brand-muted">Height</p>
                <p className="font-semibold">{form.height ? `${form.height} cm` : "—"}</p>
              </div>
              <div className="card-glass p-3 text-center">
                <p className="text-xs text-brand-muted">Weight</p>
                <p className="font-semibold">{form.weight ? `${form.weight} kg` : "—"}</p>
              </div>
              <div className="card-glass p-3 text-center">
                <p className="text-xs text-brand-muted">BMI</p>
                <p className="font-semibold">{bmi ?? "—"}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-brand-muted">Goals</p>
              <p className="mt-1 text-sm">{form.fitnessGoals || "Add your goals to personalize coaching."}</p>
            </div>
          </Card>
        </motion.div>

        {/* Right: Edit form */}
        <motion.div {...fade(0.05)} className="lg:col-span-2">
          <Card title="Edit Profile" subtitle="Keep your details up to date" className="p-6">
            <form onSubmit={onSave} className="space-y-4">
              {error && <Alert>{error}</Alert>}
              {success && <Alert kind="success">{success}</Alert>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-sm font-medium">Name</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-2.5 text-brand-muted">
                      <User className="h-4 w-4" />
                    </span>
                    <Input name="name" value={form.name} onChange={onChange} placeholder="Your full name" className="pl-10" />
                  </div>
                </div>

                {/* Email (read-only) */}
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-2.5 text-brand-muted">
                      <Mail className="h-4 w-4" />
                    </span>
                    <Input value={form.email} readOnly className="pl-10 opacity-70 cursor-not-allowed" />
                  </div>
                </div>

                {/* Age */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Age</label>
                  <Input type="number" name="age" value={form.age} onChange={onChange} placeholder="e.g., 27" min={1} />
                </div>

                {/* Height */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Height (cm)</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-2.5 text-brand-muted">
                      <Ruler className="h-4 w-4" />
                    </span>
                    <Input type="number" name="height" value={form.height} onChange={onChange} placeholder="e.g., 175" min={1} className="pl-10" />
                  </div>
                </div>

                {/* Weight */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Weight (kg)</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-2.5 text-brand-muted">
                      <Weight className="h-4 w-4" />
                    </span>
                    <Input type="number" name="weight" value={form.weight} onChange={onChange} placeholder="e.g., 78" min={1} className="pl-10" />
                  </div>
                </div>

                {/* Goals (textarea) */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Fitness Goals</label>
                  <textarea
                    name="fitnessGoals"
                    value={form.fitnessGoals}
                    onChange={onChange}
                    placeholder="e.g., Lose 5kg in 8 weeks. Improve squat depth. 4 sessions/week."
                    rows={4}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-brand-muted focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/40 outline-none"
                  />
                  <div className="mt-1 text-xs text-brand-muted flex items-center gap-2">
                    <Target className="h-3.5 w-3.5" />
                    Tip: Be specific & measurable for better recommendations.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (original) setForm(original);
                  }}
                >
                  Reset
                </Button>
                <Button type="submit" loading={saving}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
