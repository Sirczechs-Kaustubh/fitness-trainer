"use client";

import { useEffect, useMemo, useState } from "react";
import useAuth from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/apiClient";

const MEAL_KEYS = ["breakfast","lunch","dinner","snack"];
const DEFAULT_SPLIT = { breakfast: 0.30, lunch: 0.35, dinner: 0.30, snack: 0.05 };

function fmt(n) { return Math.round(n); }

export default function DietPage() {
  const { user, ready } = useAuth({ requireAuth: false });
  const [date, setDate] = useState(() => new Date());
  const [planDiet, setPlanDiet] = useState(null);
  const [log, setLog] = useState(null);
  const [pref, setPref] = useState("default"); // dietary preference
  const [saving, setSaving] = useState(false);

  // Load preference from localStorage
  useEffect(() => { try { const p = localStorage.getItem('diet_pref'); if (p) setPref(p); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem('diet_pref', pref); } catch {} }, [pref]);

  const isoDay = useMemo(() => toISODate(date), [date]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/diet/${isoDay}`);
        setPlanDiet(data?.planDiet || null);
        setLog(data?.log || null);
      } catch {}
    })();
  }, [isoDay]);

  const totals = useMemo(() => computeTotals(planDiet, user), [planDiet, user]);
  const meals = useMemo(() => buildMeals(planDiet, totals, log, pref), [planDiet, totals, log, pref]);
  const daySummary = useMemo(() => ({
    calories: meals.reduce((a,m)=>a+(m.calories||0),0),
    protein: meals.reduce((a,m)=>a+(m.protein||0),0),
    carbs: meals.reduce((a,m)=>a+(m.carbs||0),0),
    fats: meals.reduce((a,m)=>a+(m.fats||0),0),
  }), [meals]);

  if (!ready) return null;

  function setMealStatus(key, status) {
    const next = {
      meals: meals.map(m => m.key === key ? { ...m, status } : m),
      totals: daySummary,
    };
    setLog({ ...(log||{}), date: new Date(isoDay), meals: next.meals, totals: next.totals });
  }

  async function save() {
    setSaving(true);
    try {
      const payload = { meals: meals.map(({key,name,status,calories,protein,carbs,fats})=>({key,name,status,calories,protein,carbs,fats})), totals: daySummary };
      await api.post(`/diet/${isoDay}`, payload);
      // refresh log
      const { data } = await api.get(`/diet/${isoDay}`);
      setLog(data?.log || null);
      alert("Diet progress saved");
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Daily Diet Plan</h1>
          <p className="text-sm text-brand-muted">Aligned with your workout goals.</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" value={isoDay} onChange={(e)=>setDate(fromISODate(e.target.value))}
                 className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white" />
          <select value={pref} onChange={(e)=>setPref(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white">
            <option value="default">Default</option>
            <option value="veg">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="nonveg">Non‑veg</option>
          </select>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {meals.map((m) => (
          <Card key={m.key} title={cap(m.key)} subtitle={m.subtitle} className={`p-4 ${m.status==='completed' ? 'opacity-90 ring-1 ring-emerald-500/40' : ''}`}>
            <div className="text-sm text-brand-text whitespace-pre-wrap">{m.name}</div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <div className="card-glass p-2">
                <div className="text-xs text-brand-muted">Cals</div>
                <div className="text-sm font-semibold">{fmt(m.calories)}</div>
              </div>
              <div className="card-glass p-2">
                <div className="text-xs text-brand-muted">Protein</div>
                <div className="text-sm font-semibold">{fmt(m.protein)}g</div>
              </div>
              <div className="card-glass p-2">
                <div className="text-xs text-brand-muted">Carbs</div>
                <div className="text-sm font-semibold">{fmt(m.carbs)}g</div>
              </div>
              <div className="card-glass p-2">
                <div className="text-xs text-brand-muted">Fats</div>
                <div className="text-sm font-semibold">{fmt(m.fats)}g</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant={m.status==='completed' ? 'primary' : 'secondary'} onClick={()=>setMealStatus(m.key,'completed')}>Completed</Button>
              <Button variant={m.status==='skipped' ? 'danger' : 'secondary'} onClick={()=>setMealStatus(m.key,'skipped')}>Skipped</Button>
            </div>
          </Card>
        ))}
      </div>

      <Card title="Daily Summary" className="p-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="card-glass p-3">
            <div className="text-xs text-brand-muted">Calories</div>
            <div className="text-lg font-semibold">{fmt(daySummary.calories)}</div>
          </div>
          <div className="card-glass p-3">
            <div className="text-xs text-brand-muted">Protein</div>
            <div className="text-lg font-semibold">{fmt(daySummary.protein)}g</div>
          </div>
          <div className="card-glass p-3">
            <div className="text-xs text-brand-muted">Carbs</div>
            <div className="text-lg font-semibold">{fmt(daySummary.carbs)}g</div>
          </div>
          <div className="card-glass p-3">
            <div className="text-xs text-brand-muted">Fats</div>
            <div className="text-lg font-semibold">{fmt(daySummary.fats)}g</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function fromISODate(s) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function cap(s) { return s.charAt(0).toUpperCase()+s.slice(1); }

function computeTotals(planDiet, user) {
  // planDiet.macros are per-kg: protein, carbs, fats (grams per kg bodyweight)
  const weight = typeof user?.weight === 'number' ? user.weight : 70;
  const perKg = planDiet?.macros || { protein: 0.8, carbs: 2.0, fats: 0.8 };
  const protein = Math.round((perKg.protein || 0.8) * weight);
  const carbs = Math.round((perKg.carbs || 2.0) * weight);
  const fats = Math.round((perKg.fats || 0.8) * weight);
  const calories = Math.round(protein*4 + carbs*4 + fats*9);
  return { calories, protein, carbs, fats };
}

function buildMeals(planDiet, totals, log, pref) {
  const samples = planDiet?.sampleMeals || {};
  const split = DEFAULT_SPLIT;
  const meals = MEAL_KEYS.map((key) => {
    const pct = split[key] || 0;
    const cals = totals.calories * pct;
    const protein = totals.protein * pct;
    const carbs = totals.carbs * pct;
    const fats = totals.fats * pct;
    let name = samples[key === 'snack' ? 'snack' : key] || cap(key);
    if (pref === 'veg' || pref === 'vegan') name += ` (${cap(pref)})`;
    return { key, name, calories: cals, protein, carbs, fats, status: 'pending', subtitle: `${cap(key)} plan` };
  });
  // Apply log statuses if present
  if (log && Array.isArray(log.meals)) {
    for (const lm of log.meals) {
      const idx = meals.findIndex(m => m.key === lm.key);
      if (idx >= 0) meals[idx] = { ...meals[idx], ...lm };
    }
  }
  return meals;
}

