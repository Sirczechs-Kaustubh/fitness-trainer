"use client";

import useAuth from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Sparkles, Dumbbell, ClipboardList, ChefHat } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/apiClient";

function calcBMI(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null;
  const m = heightCm / 100;
  return +(weightKg / (m * m)).toFixed(1);
}

function planFromGoals(goals = []) {
  const g = goals.map((x) => x.toLowerCase());
  const wantsLoss = g.some((x) => x.includes("loss") || x.includes("fat"));
  const wantsMuscle = g.some((x) => x.includes("muscle") || x.includes("strength") || x.includes("hypertrophy"));
  const wantsEndurance = g.some((x) => x.includes("endurance") || x.includes("cardio"));
  const wantsMobility = g.some((x) => x.includes("mobility") || x.includes("flexibility"));

  // Base weekly split
  const days = [];
  if (wantsMuscle) {
    days.push(
      { day: "Mon", focus: "Upper Body Strength", items: ["Push-ups", "Shoulder Press", "Bicep Curls", "Tricep Dips", "Core"] },
      { day: "Wed", focus: "Lower Body Strength", items: ["Squats", "Lunges", "Glute Bridge", "Calf Raises", "Core"] },
      { day: "Fri", focus: "Full Body Circuit", items: ["Push-ups", "Squats", "Rows (band)", "Plank", "Mountain Climbers"] },
    );
  } else {
    days.push(
      { day: "Mon", focus: "Full Body", items: ["Squats", "Push-ups", "Hip Hinge", "Core"] },
      { day: "Fri", focus: "Full Body", items: ["Lunges", "Dips", "Rows (band)", "Core"] },
    );
  }

  if (wantsLoss || wantsEndurance) {
    days.push(
      { day: "Tue", focus: "Cardio / HIIT", items: ["Brisk Walk/Jog", "Jumping Jacks", "High Knees", "Shadow Boxing"] },
      { day: "Thu", focus: "Zone 2 Cardio", items: ["Bike/Walk 30–45m at conversational pace"] },
    );
  } else {
    days.push({ day: "Tue", focus: "Light Cardio", items: ["Walk 30m", "Optional bike/row"] });
  }

  days.push({ day: "Sat", focus: "Mobility & Core", items: ["Hip Openers", "Thoracic Rotations", "Hamstring Floss", "Planks"] });
  days.push({ day: "Sun", focus: "Rest / Steps", items: ["10–12k steps", "Gentle stretch"] });

  // Sets / reps suggestions
  const strength = wantsMuscle ? { sets: 4, reps: "6–10" } : { sets: 3, reps: "8–12" };

  // Macro suggestion
  let macros;
  if (wantsLoss) macros = { protein: 0.8, carbs: 1.5, fats: 0.8, note: "High protein, moderate carbs around training." };
  else if (wantsMuscle) macros = { protein: 1.0, carbs: 2.0, fats: 0.8, note: "Slight surplus, carbs pre/post workout." };
  else if (wantsEndurance) macros = { protein: 0.8, carbs: 2.5, fats: 0.7, note: "Higher carbs to support sessions." };
  else macros = { protein: 0.8, carbs: 2.0, fats: 0.8, note: "Balanced intake for general fitness." };

  return { days, strength, macros, wantsLoss, wantsMuscle, wantsEndurance, wantsMobility };
}

function calorieGuidance(weightKg, heightCm, age) {
  if (!weightKg || !heightCm || !age) return null;
  // Mifflin-St Jeor without sex; show a range between female and male constants
  const sFemale = -161;
  const sMale = 5;
  const bmrFemale = 10 * weightKg + 6.25 * heightCm - 5 * age + sFemale;
  const bmrMale = 10 * weightKg + 6.25 * heightCm - 5 * age + sMale;
  const maintLow = Math.round(bmrFemale * 1.4);
  const maintHigh = Math.round(bmrMale * 1.6);
  return { maintain: [maintLow, maintHigh] };
}

export default function AIPlanPage() {
  const { user, ready } = useAuth({ requireAuth: false });
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remotePlan, setRemotePlan] = useState(null); // { planObject?, planText? }

  // Load stored key (BYOK convenience) and latest saved plan
  useEffect(() => {
    try {
      const k = localStorage.getItem("llm_key_google");
      if (k) { setApiKey(k); setRemember(true); }
    } catch {}
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/plans/latest");
        if (data?.plan) setRemotePlan(data.plan.planObject ? { planObject: data.plan.planObject } : { planText: data.plan.planText });
      } catch {}
    })();
  }, []);

  async function handleGenerate(save = true) {
    if (!apiKey) return alert("Please enter your Google Gemini API key.");
    setLoading(true);
    try {
      const { data } = await api.post("/plans/generate", { apiKey, provider: "google", model: "gemini-1.5-flash", save });
      const rp = data?.planObject ? { planObject: data.planObject } : { planText: data?.planText };
      setRemotePlan(rp);
      if (remember) {
        try { localStorage.setItem("llm_key_google", apiKey); } catch {}
      } else {
        try { localStorage.removeItem("llm_key_google"); } catch {}
      }
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!remotePlan) return;
    try {
      await api.post("/plans/save", remotePlan);
      alert("Plan saved.");
    } catch (e) {
      alert("Failed to save plan.");
    }
  }

  const bmi = useMemo(() => calcBMI(user?.height, user?.weight), [user]);
  const goals = user?.fitnessGoals || [];
  const plan = useMemo(() => planFromGoals(goals), [goals]);
  const calories = useMemo(() => calorieGuidance(user?.weight, user?.height, user?.age), [user]);

  if (!ready) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Sparkles className="h-6 w-6 text-emerald-400"/>AI Workout & Diet Plan</h1>
          <p className="text-sm text-brand-muted">Personalized from your profile and goals.</p>
        </div>
        <div className="flex gap-2">
          <Button as="a" href="/workout" className="!p-3"><Dumbbell className="h-4 w-4 mr-2"/>Start Workout</Button>
          <Button as="a" href="/profile" variant="secondary" className="!p-3"><ClipboardList className="h-4 w-4 mr-2"/>Edit Profile</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Your Profile" className="lg:col-span-1">
          <ul className="text-sm space-y-2 text-brand-muted">
            <li><span className="text-brand-text">Name:</span> {user?.name || "—"}</li>
            <li><span className="text-brand-text">Age:</span> {user?.age ?? "—"}</li>
            <li><span className="text-brand-text">Height:</span> {user?.height ? `${user.height} cm` : "—"}</li>
            <li><span className="text-brand-text">Weight:</span> {user?.weight ? `${user.weight} kg` : "—"}</li>
            <li><span className="text-brand-text">BMI:</span> {bmi ?? "—"}</li>
            <li><span className="text-brand-text">Goals:</span> {goals.length ? goals.join(", ") : "Set goals in your profile for a tighter plan."}</li>
          </ul>
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">Google Gemini API Key (BYOK)</label>
            <input type="password" value={apiKey} onChange={(e)=>setApiKey(e.target.value)} placeholder="AIza..."
                   className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white" />
            <label className="flex items-center gap-2 text-xs text-brand-muted">
              <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} />
              Remember key on this device
            </label>
            <div className="flex gap-2 pt-1">
              <Button onClick={() => handleGenerate(true)} disabled={loading} className="!py-2">
                <Sparkles className="h-4 w-4 mr-2"/>{loading ? 'Generating…' : 'Generate & Save'}
              </Button>
              <Button variant="secondary" onClick={() => handleGenerate(false)} disabled={loading} className="!py-2">
                Regenerate
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Weekly Workout Plan" subtitle="AI-generated if available; otherwise template" className="lg:col-span-2">
          {remotePlan?.planObject ? (
            <div className="space-y-3">
              <p className="text-sm text-brand-muted">{remotePlan.planObject.overview}</p>
              <div className="grid md:grid-cols-2 gap-4">
                {remotePlan.planObject.weeklyPlan?.map((d, idx) => (
                  <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-brand-muted">{d.day}</p>
                    <p className="text-base font-medium mt-1">{d.focus}</p>
                    <ul className="mt-2 text-sm text-brand-muted list-disc pl-5">
                      {(d.items||[]).map((it, i) => <li key={i}>{it}</li>)}
                    </ul>
                    {(d.sets || d.reps || d.duration) && (
                      <p className="text-xs text-brand-muted mt-2">{[d.sets && `Sets: ${d.sets}`, d.reps && `Reps: ${d.reps}`, d.duration && `Duration: ${d.duration}`].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : remotePlan?.planText ? (
            <pre className="text-xs whitespace-pre-wrap text-brand-muted bg-white/5 rounded-2xl p-3 border border-white/10 max-h-[500px] overflow-auto">{remotePlan.planText}</pre>
          ) : (
            <div>
              <div className="grid md:grid-cols-2 gap-4">
                {plan.days.map((d) => (
                  <div key={d.day} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-brand-muted">{d.day}</p>
                    <p className="text-base font-medium mt-1">{d.focus}</p>
                    <ul className="mt-2 text-sm text-brand-muted list-disc pl-5">
                      {d.items.map((it, i) => <li key={i}>{it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-brand-muted">Strength sessions: {plan.strength.sets} sets × {plan.strength.reps} reps. Rest 60–90s.</p>
            </div>
          )}
          {remotePlan && (
            <div className="mt-3">
              <Button variant="secondary" onClick={handleSave} className="!py-2">Save Current Plan</Button>
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Diet Guidance" subtitle="Macros and calorie guidance" className="lg:col-span-2">
          <div className="flex items-start gap-4">
            <ChefHat className="h-5 w-5 text-amber-300 mt-1"/>
            <div className="text-sm text-brand-muted space-y-2">
              {remotePlan?.planObject ? (
                <div>
                  <p>
                    Estimated maintenance: {remotePlan.planObject?.calories?.maintainLow}–{remotePlan.planObject?.calories?.maintainHigh} kcal/day.
                    Adjust per goal: {remotePlan.planObject?.calories?.delta} kcal/day.
                  </p>
                  <p>
                    Suggested macros (per kg bodyweight): Protein {remotePlan.planObject?.diet?.macros?.protein} g, Carbs {remotePlan.planObject?.diet?.macros?.carbs} g, Fats {remotePlan.planObject?.diet?.macros?.fats} g.
                    <span className="block">Note: {remotePlan.planObject?.diet?.note}</span>
                  </p>
                  <div>
                    <p className="font-medium text-brand-text mb-1">Sample Day</p>
                    <ul className="list-disc pl-5">
                      <li>Breakfast: {remotePlan.planObject?.diet?.sampleMeals?.breakfast}</li>
                      <li>Lunch: {remotePlan.planObject?.diet?.sampleMeals?.lunch}</li>
                      <li>Snack: {remotePlan.planObject?.diet?.sampleMeals?.snack}</li>
                      <li>Dinner: {remotePlan.planObject?.diet?.sampleMeals?.dinner}</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  {calories ? (
                    <p>
                      Estimated maintenance: {calories.maintain[0]}–{calories.maintain[1]} kcal/day.
                      Adjust based on goal: {plan.wantsLoss ? "−300 to −500" : plan.wantsMuscle ? "+200 to +300" : "±0"} kcal/day.
                    </p>
                  ) : (
                    <p>Add age, height, and weight in your profile to see calorie targets.</p>
                  )}
                  <p>
                    Suggested macros (per kg bodyweight): Protein {plan.macros.protein} g, Carbs {plan.macros.carbs} g, Fats {plan.macros.fats} g.
                    <span className="block">Note: {plan.macros.note}</span>
                  </p>
                  <div>
                    <p className="font-medium text-brand-text mb-1">Sample Day</p>
                    <ul className="list-disc pl-5">
                      <li>Breakfast: Greek yogurt, berries, oats, nuts</li>
                      <li>Lunch: Grilled chicken, quinoa, mixed greens, olive oil</li>
                      <li>Snack: Protein shake, fruit</li>
                      <li>Dinner: Salmon, rice or potatoes, veggies</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card title="Tips">
          <ul className="text-sm text-brand-muted list-disc pl-5 space-y-2">
            <li>Prioritize sleep (7–9h) and hydration.</li>
            <li>Progressively overload: add reps, sets, or tempo weekly.</li>
            <li>Place carbs around training; keep protein consistent daily.</li>
            <li>Track workouts from the Workout page to refine this plan.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
