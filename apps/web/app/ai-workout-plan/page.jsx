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
      { day: "Mon", focus: "Upper Body Strength", items: ["Push-up", "Shoulder Press", "Bicep Curl", "Tricep Dip"] },
      { day: "Wed", focus: "Lower Body Strength", items: ["Squat", "Lunge"] },
      { day: "Fri", focus: "Full Body Circuit", items: ["Push-up", "Squat", "Jumping Jack", "Mountain Climber"] },
    );
  } else {
    days.push(
      { day: "Mon", focus: "Full Body", items: ["Squat", "Push-up", "Lunge"] },
      { day: "Fri", focus: "Full Body", items: ["Lunge", "Tricep Dip", "Bicep Curl"] },
    );
  }

  if (wantsLoss || wantsEndurance) {
    days.push(
      { day: "Tue", focus: "Cardio / HIIT", items: ["Jumping Jack", "Mountain Climber", "Squat", "Lunge"] },
      { day: "Thu", focus: "Cardio", items: ["Jumping Jack", "Mountain Climber"] },
    );
  } else {
    days.push({ day: "Tue", focus: "Light Cardio", items: ["Jumping Jack"] });
  }

  days.push({ day: "Sat", focus: "Mobility & Core", items: ["Lunge", "Squat"] });
  days.push({ day: "Sun", focus: "Rest / Steps", items: [] });

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
  const goals = Array.isArray(user?.fitnessGoals) ? user.fitnessGoals : [];
  const plan = useMemo(() => planFromGoals(goals), [goals]);
  const calories = useMemo(() => calorieGuidance(user?.weight, user?.height, user?.age), [user]);

  if (!ready) return null;

  return (
    <div className="space-y-8">
      {/* Quick actions for workflow */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI Workout Plan</h1>
          <p className="text-sm text-brand-muted">Generate and review your weekly plan.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button as="a" href="/workout" className="card-glass !py-2">
            <Dumbbell className="mr-2" /> Start Workout
          </Button>
          <Button as="a" href="/diet" variant="secondary" className="card-glass !py-2">
            <ChefHat className="mr-2" /> Daily Diet Plan
          </Button>
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="AI Workout & Diet Plan" subtitle="Bring your own key (Gemini)">
          <div className="text-sm text-brand-muted space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-emerald-400 mt-0.5"/>
              <div>
                <p className="text-brand-text font-medium">Personalized Plan</p>
                <p>Uses your goals and profile to generate a weekly workout split and diet guidance.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ClipboardList className="h-5 w-5 text-brand-accent mt-0.5"/>
              <div>
                <p className="text-brand-text font-medium">Strict Exercise Library</p>
                <p>Generated plans use only exercises from the app’s library to ensure compatibility with form checks.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Dumbbell className="h-5 w-5 text-brand-primary mt-0.5"/>
              <div>
                <p className="text-brand-text font-medium">BYOK</p>
                <p>Paste your Google Gemini API key. Nothing is stored unless you choose to remember it in your browser.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="password" value={apiKey} onChange={(e)=>setApiKey(e.target.value)} placeholder="AIza..."
                     className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-full focus:outline-none"/>
              <label className="text-xs text-brand-muted flex items-center gap-2">
                <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} /> Remember
              </label>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => handleGenerate(true)} disabled={loading} className="!py-2">
                Generate & Save
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
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
