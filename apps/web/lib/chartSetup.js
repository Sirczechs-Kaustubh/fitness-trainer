// apps/web/lib/chartSetup.js
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,    // <— NEW for doughnut/pie
  Filler,        // smooth area fills (nice on lines)
} from "chart.js";

let registered = false;
export function ensureChartsRegistered() {
  if (registered) return;
  ChartJS.register(
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    BarElement,
    ArcElement,
    Filler
  );
  registered = true;
}
