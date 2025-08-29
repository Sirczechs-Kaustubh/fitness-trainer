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
} from "chart.js";


let registered = false;
export function ensureChartsRegistered() {
if (registered) return;
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, BarElement);
registered = true;
}