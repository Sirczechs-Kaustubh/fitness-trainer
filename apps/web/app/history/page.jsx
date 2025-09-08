"use client";

import { useState, useEffect } from "react";
import useAuth from "@/hooks/useAuth";
import api from "@/lib/apiClient";
import Card from "@/components/ui/Card";
import { Clock, Dumbbell, Flame } from "lucide-react";

const formatTime = (s) => {
  if (!s || s < 0) return "00:00";
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const getExerciseIcon = (exerciseName) => {
  const name = exerciseName?.toLowerCase() || "";
  // In a real app, you might have a more extensive mapping
  if (name.includes("squat") || name.includes("lunge") || name.includes("deadlift")) {
    return <Dumbbell className="h-6 w-6 text-brand-accent" />;
  }
  if (name.includes("push-up") || name.includes("plank")) {
    return <Flame className="h-6 w-6 text-brand-primary" />;
  }
  return <Dumbbell className="h-6 w-6 text-brand-muted" />;
};

export default function HistoryPage() {
  const { user } = useAuth({ requireAuth: true });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get("/history");

        // Support both shapes:
        // 1) { success, data: { message, data: { docs: [...] } } }
        // 2) { success, data: { docs: [...] } }
        const docs = data?.data?.data?.docs || data?.data?.docs || [];

        if (Array.isArray(docs)) setHistory(docs);
        else setHistory([]);

      } catch (err) {
        setError("Failed to load workout history.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
}, []);

  if (loading) {
    return <div>Loading history...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Workout History</h1>
        <p className="text-sm text-brand-muted">Review your past sessions.</p>
      </div>

      <Card className="p-6">
        {error && <p className="text-red-500">{error}</p>}
        {history.length === 0 && !error && (
          <p>You haven't completed any workouts yet.</p>
        )}
        
        {/* Render workouts list */}
        <ul className="space-y-4">
          {history.map((w) => {
            const title = w?.exercises?.[0]?.name || w?.plannedExercises?.[0] || w?.title || "Workout";
            const totalReps = Array.isArray(w?.exercises)
              ? w.exercises.reduce((sum, e) => sum + (e?.reps || 0), 0)
              : 0;
            const scoreAvg = Array.isArray(w?.exercises) && w.exercises.length
              ? Math.round(
                  w.exercises.reduce((sum, e) => sum + (e?.formScore || 0), 0) /
                    w.exercises.length
                )
              : 0;
            const when = new Date(w?.endTime || w?.date || Date.now()).toLocaleString();
            const durationSeconds = (() => {
              if (typeof w?.duration === "number" && w.duration > 0) return Math.round(w.duration * 60);
              const start = w?.createdAt ? new Date(w.createdAt) : (w?.date ? new Date(w.date) : null);
              const end = w?.endTime ? new Date(w.endTime) : null;
              if (start && end && !isNaN(start) && !isNaN(end)) {
                return Math.max(0, Math.round((end - start) / 1000));
              }
              return 0;
            })();

            return (
              <li
                key={w._id}
                className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 card-glass"
              >
                {/* Left: icon + details */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="hidden sm:block p-3 rounded-full bg-brand-primary/10">
                    {getExerciseIcon(title)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{title}</p>
                    <p className="text-sm text-brand-muted">{when}</p>
                  </div>
                </div>

                {/* Right: stats */}
                <div className="grid grid-cols-3 gap-4 w-full sm:w-auto text-center">
                  <div>
                    <p className="text-xs text-brand-muted">Duration</p>
                    <p className="font-semibold text-lg text-white">{formatTime(durationSeconds)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-muted">Reps</p>
                    <p className="font-semibold text-lg text-white">{totalReps}</p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-muted">Score</p>
                    <p className="font-semibold text-lg text-white">{scoreAvg}%</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
