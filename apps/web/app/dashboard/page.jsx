"use client";

import { useEffect, useMemo, useState } from "react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { ensureChartsRegistered } from "@/lib/chartSetup";
import useAuth from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatCard from "@/components/dashboard/StatCard";
import api from "@/lib/apiClient";
import { Dumbbell, Flame, Activity, Clock } from "lucide-react";

ensureChartsRegistered();

export default function DashboardPage() {
  const { user, ready, logout } = useAuth({ requireAuth: false });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch stats (falls back to mock if API unavailable)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await api.get("/user/stats"); // expected shape noted below
        if (active) setStats(data);
      } catch {
        if (!active) return;
        // Fallback mock data
        setStats({
          summary: {
            caloriesWeek: 3200,
            totalRepsWeek: 620,
            formAccuracy: 86,
            minutesTrained: 185,
            deltas: { calories: 8, reps: 5, accuracy: 2, minutes: 11 },
          },
          weeklyReps: [80, 95, 120, 60, 110, 90, 65],
          monthlyCalories: [700, 820, 760, 890],
          accuracyHistory: [78, 82, 84, 86],
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => (active = false);
  }, []);

  const bmi = useMemo(() => {
    const h = parseFloat(user?.height);
    const w = parseFloat(user?.weight);
    if (!h || !w) return null;
    const m = h / 100;
    return +(w / (m * m)).toFixed(1);
  }, [user]);

  if (!ready) return null;

  // Palette helpers for charts
  const grid = "rgba(255,255,255,0.06)";
  const labelColor = "#94A3B8";
  const green = "#22C55E";
  const blue = "#3B82F6";

  // Weekly line (reps)
  const weeklyData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Reps",
        data: stats?.weeklyReps ?? [],
        borderColor: green,
        backgroundColor: "rgba(34,197,94,0.2)",
        fill: true,
        tension: 0.35,
        pointRadius: 2,
      },
    ],
  };
  const weeklyOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: labelColor } }, tooltip: { intersect: false } },
    scales: {
      x: { grid: { color: grid }, ticks: { color: labelColor } },
      y: { grid: { color: grid }, ticks: { color: labelColor } },
    },
  };

  // Monthly bar (calories)
  const monthlyData = {
    labels: ["W1", "W2", "W3", "W4"],
    datasets: [
      {
        label: "Calories",
        data: stats?.monthlyCalories ?? [],
        backgroundColor: blue,
        borderRadius: 10,
        barThickness: 26,
      },
    ],
  };
  const monthlyOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: labelColor } } },
    scales: {
      x: { grid: { color: grid }, ticks: { color: labelColor } },
      y: { grid: { color: grid }, ticks: { color: labelColor } },
    },
  };

  // Accuracy ring
  const accuracy = stats?.summary?.formAccuracy ?? 0;
  const ringData = {
    labels: ["Accuracy", "Remaining"],
    datasets: [
      {
        data: [accuracy, 100 - accuracy],
        backgroundColor: [green, "rgba(34,197,94,0.15)"],
        borderWidth: 0,
        cutout: "70%",
      },
    ],
  };
  const ringOpts = { plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Hi{user?.name ? `, ${user.name}` : ""} 👋
          </h1>
          <p className="text-sm text-brand-muted">
            Your AI coach is ready. {bmi ? <>BMI: <span className="text-brand-text font-medium">{bmi}</span></> : null}
          </p>
        </div>
        <Button variant="secondary" onClick={logout}>Logout</Button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button as="a" href="/workout" className="card-glass !p-4 justify-start">
          <Dumbbell className="mr-2" /> Start Workout
        </Button>
        <Button as="a" href="#" variant="secondary" className="card-glass !p-4 justify-start">
          <Activity className="mr-2" /> Calibrate Camera
        </Button>
        <Button as="a" href="/profile" variant="secondary" className="card-glass !p-4 justify-start">
          <Clock className="mr-2" /> Update Profile
        </Button>
        <Button as="a" href="#" variant="secondary" className="card-glass !p-4 justify-start">
          <Flame className="mr-2" /> View History
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Calories (week)"
          value={stats?.summary?.caloriesWeek ?? "—"}
          delta={stats?.summary?.deltas?.calories ?? 0}
          icon={<Flame className="h-5 w-5 text-brand-primary" />}
          hint="vs last week"
        />
        <StatCard
          label="Total Reps"
          value={stats?.summary?.totalRepsWeek ?? "—"}
          delta={stats?.summary?.deltas?.reps ?? 0}
          icon={<Dumbbell className="h-5 w-5 text-brand-accent" />}
          hint="last 7 days"
        />
        <StatCard
          label="Form Accuracy"
          value={`${stats?.summary?.formAccuracy ?? 0}%`}
          delta={stats?.summary?.deltas?.accuracy ?? 0}
          icon={<Activity className="h-5 w-5 text-emerald-400" />}
          hint="model-guided"
        />
        <StatCard
          label="Minutes Trained"
          value={stats?.summary?.minutesTrained ?? "—"}
          delta={stats?.summary?.deltas?.minutes ?? 0}
          icon={<Clock className="h-5 w-5 text-blue-400" />}
          hint="weekly total"
        />
      </div>

      {/* Charts and ring */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Weekly Reps" className="lg:col-span-2">
          <div className="h-[320px]">
            {!loading && <Line data={weeklyData} options={weeklyOpts} />}
          </div>
        </Card>

        <Card title="Form Accuracy">
          <div className="h-[320px] flex items-center justify-center">
            {!loading && (
              <div className="relative w-56 h-56">
                <Doughnut data={ringData} options={ringOpts} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-semibold">{accuracy}%</p>
                    <p className="text-xs text-brand-muted">last 4 weeks</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Monthly Calories" className="lg:col-span-3">
          <div className="h-[360px]">
            {!loading && <Bar data={monthlyData} options={monthlyOpts} />}
          </div>
        </Card>
      </div>
    </div>
  );
}
