// apps/web/app/dashboard/page.jsx
"use client";

import { useMemo, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import useAuth from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ensureChartsRegistered } from "@/lib/chartSetup";

ensureChartsRegistered();

export default function DashboardPage() {
  const { user, ready, logout } = useAuth({ requireAuth: true });
  const [bmiForm, setBmiForm] = useState({
    height: user?.height || "",
    weight: user?.weight || ""
  });

  const bmi = useMemo(() => {
    const h = parseFloat(bmiForm.height);
    const w = parseFloat(bmiForm.weight);
    if (!h || !w) return null;
    const meters = h / 100;
    return +(w / (meters * meters)).toFixed(1);
  }, [bmiForm]);

  if (!ready) return null;

  // demo data for now
  const weekly = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{ label: "Reps", data: [10, 12, 14, 9, 16, 20, 18] }]
  };

  const monthly = {
    labels: ["W1", "W2", "W3", "W4"],
    datasets: [{ label: "Calories", data: [600, 720, 810, 900] }]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Hi{user?.name ? `, ${user.name}` : ""} 👋
        </h1>
        <Button onClick={logout}>Logout</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="BMI Calculator">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Height (cm)</label>
              <input
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2"
                type="number"
                value={bmiForm.height}
                onChange={(e) => setBmiForm((s) => ({ ...s, height: e.target.value }))}
                placeholder="e.g., 164"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Weight (kg)</label>
              <input
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2"
                type="number"
                value={bmiForm.weight}
                onChange={(e) => setBmiForm((s) => ({ ...s, weight: e.target.value }))}
                placeholder="e.g., 92"
              />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-zinc-600">Your BMI</p>
            <p className="text-3xl font-bold">{bmi ?? "–"}</p>
          </div>
        </Card>

        <Card title="Weekly Reps">
          <Line data={weekly} options={{ responsive: true, maintainAspectRatio: false }} height={220} />
        </Card>
      </div>

      <Card title="Monthly Calories">
        <Bar data={monthly} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
      </Card>
    </div>
  );
}
