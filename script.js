// ---------- Settings ----------
// Change these prices (rupees per litre) whenever fuel rates change
const PRICES = { petrol: 94.72, diesel: 87.62 };
const STORAGE_KEY = "hpStationData_v1";

// Demo workers (shown the first time you open the page)
const SEED_WORKERS = [
  { id: 1, name: "Ramesh Kumar",  shift: "Morning",   pump: "Pump 1" },
  { id: 2, name: "Suresh Yadav",  shift: "Morning",   pump: "Pump 2" },
  { id: 3, name: "Anil Verma",    shift: "Afternoon", pump: "Pump 3" },
  { id: 4, name: "Mohit Singh",   shift: "Afternoon", pump: "Pump 4" },
  { id: 5, name: "Deepak Gupta",  shift: "Night",     pump: "Pump 5" },
  { id: 6, name: "Rahul Mishra",  shift: "Night",     pump: "Pump 6" }
];

// ---------- Helpers ----------
const $ = id => document.getElementById(id);

const money = n =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const litres = n =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Escape text so names typed by users can't break the page
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

const nextId = list => list.reduce((m, x) => Math.max(m, x.id), 0) + 1;

// ---------- Data ----------
// Creates the same sample fuel entries every time (fixed seed)
function makeSeedEntries(workers) {
  let seed = 42;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const entries = [];
  let id = 1;
  const now = Date.now();

  workers.forEach(w => {
    const count = 12 + Math.floor(rnd() * 14);
    for (let i = 0; i < count; i++) {
      entries.push({
        id: id++,
        workerId: w.id,
        fuel: rnd() < 0.55 ? "petrol" : "diesel",
        litres: Math.round((3 + rnd() * 37) * 10) / 10,
        time: new Date(now - Math.floor(rnd() * 8 * 3600 * 1000)).toISOString()
      });
    }
  });
  return entries;
}

function freshState() {
  const workers = SEED_WORKERS.map(w => ({ ...w }));
  return { workers, entries: makeSeedEntries(workers) };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.workers) && Array.isArray(s.entries)) return s;
    }
  } catch (e) { /* ignore and use demo data */ }
  return freshState();
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

let state = loadState();

// ---------- Calculations ----------
function computeStats() {
  return state.workers.map(w => {
    const mine = state.entries.filter(e => e.workerId === w.id);
    const petrol = mine.filter(e => e.fuel === "petrol").reduce((s, e) => s + e.litres, 0);
    const diesel = mine.filter(e => e.fuel === "diesel").reduce((s, e) => s + e.litres, 0);
    return {
      ...w,
      vehicles: mine.length,
      petrol,
      diesel,
      total: petrol + diesel,
      sales: petrol * PRICES.petrol + diesel * PRICES.diesel
    };
  });
}

// ---------- Rendering ----------
function renderKpis(all) {
  const sum = key => all.reduce((s, w) => s + w[key], 0);
  $("kpiWorkers").textContent = all.length;
  $("kpiVehicles").textContent = sum("vehicles");
  $("kpiPetrol").textContent = litres(sum("petrol"));
  $("kpiDiesel").textContent = litres(sum("diesel"));
  $("kpiLitres").textContent = litres(sum("total"));
  $("kpiSales").textContent = money(sum("sales"));
}

function renderTable(all) {
  const q = $("searchInput").value.trim().toLowerCase();
  const shift = $("shiftFilter").value;
  const sortBy = $("sortBy").value;
  const grand = all.reduce((s, w) => s + w.total, 0);

  const rows = all.filter(w =>
    (shift === "all" || w.shift === shift) &&
    (w.name.toLowerCase().includes(q) || w.pump.toLowerCase().includes(q))
  );

  rows.sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return b[sortBy] - a[sortBy];
  });

  const pctOf = w => (grand ? (w.total / grand) * 100 : 0);

  $("workersBody").innerHTML = rows.length
    ? rows.map((w, i) => `
        <tr>
          <td>${i + 1}</td>
          <td class="name">${esc(w.name)}</td>
          <td><span class="shift shift-${esc(w.shift.toLowerCase().replace(/[^a-z]/g, ""))}">${esc(w.shift)}</span></td>
          <td>${esc(w.pump)}</td>
          <td class="num">${w.vehicles}</td>
          <td class="num">${litres(w.petrol)}</td>
          <td class="num">${litres(w.diesel)}</td>
          <td class="num strong">${litres(w.total)}</td>
          <td class="num strong">${money(w.sales)}</td>
          <td>
            <div class="bar"><span style="width:${pctOf(w).toFixed(1)}%"></span></div>
            <small>${pctOf(w).toFixed(1)}%</small>
          </td>
        </tr>`).join("")
    : `<tr><td colspan="10" class="empty">No workers found</td></tr>`;

  // Total row for the workers currently shown
  const t = rows.reduce((acc, w) => ({
    vehicles: acc.vehicles + w.vehicles,
    petrol: acc.petrol + w.petrol,
    diesel: acc.diesel + w.diesel,
    total: acc.total + w.total,
    sales: acc.sales + w.sales,
    pct: acc.pct + pctOf(w)
  }), { vehicles: 0, petrol: 0, diesel: 0, total: 0, sales: 0, pct: 0 });

  const filtered = rows.length !== all.length;
  $("workersFoot").innerHTML = `
    <tr>
      <td colspan="4">TOTAL WORK${filtered ? " (shown workers)" : ""}</td>
      <td class="num">${t.vehicles}</td>
      <td class="num">${litres(t.petrol)}</td>
      <td class="num">${litres(t.diesel)}</td>
      <td class="num">${litres(t.total)}</td>
      <td class="num">${money(t.sales)}</td>
      <td>${t.pct.toFixed(1)}%</td>
    </tr>`;
}

function renderActivity() {
  const byId = Object.fromEntries(state.workers.map(w => [w.id, w]));
  const recent = [...state.entries]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 10);

  $("activityList").innerHTML = recent.length
    ? recent.map(e => {
        const w = byId[e.workerId];
        const when = new Date(e.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        return `
          <li>
            <div>
              <div class="who">${esc(w ? w.name : "Unknown")}</div>
              <div class="when">${when}</div>
            </div>
            <span class="pill pill-${e.fuel === "diesel" ? "diesel" : "petrol"}">${e.fuel === "diesel" ? "Diesel" : "Petrol"}</span>
            <div class="amt">${litres(e.litres)} L<br>${money(e.litres * PRICES[e.fuel])}</div>
          </li>`;
      }).join("")
    : `<li class="empty">No activity yet</li>`;
}

function fillWorkerSelect() {
  const sel = $("entryWorker");
  const current = sel.value;
  sel.innerHTML = state.workers
    .map(w => `<option value="${w.id}">${esc(w.name)} (${esc(w.pump)})</option>`)
    .join("");
  if (current && state.workers.some(w => String(w.id) === current)) sel.value = current;
}

function render() {
  const all = computeStats();
  renderKpis(all);
  renderTable(all);
  renderActivity();
}

// ---------- Small UI helpers ----------
let toastTimer;
function toast(msg, isError) {
  const el = $("toast");
  el.textContent = msg;
  el.className = "toast show" + (isError ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = "toast"; }, 2500);
}

function updateAmountPreview() {
  const l = parseFloat($("entryLitres").value);
  const price = PRICES[$("entryFuel").value];
  $("amountPreview").textContent = "Amount: " + money(Number.isFinite(l) && l > 0 ? l * price : 0);
}

function tickClock() {
  const d = new Date();
  $("dateText").textContent = d.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  $("timeText").textContent = d.toLocaleTimeString("en-IN");
}

// ---------- Events ----------
$("searchInput").addEventListener("input", render);
$("shiftFilter").addEventListener("change", render);
$("sortBy").addEventListener("change", render);
$("entryLitres").addEventListener("input", updateAmountPreview);
$("entryFuel").addEventListener("change", updateAmountPreview);

$("entryForm").addEventListener("submit", ev => {
  ev.preventDefault();
  const workerId = Number($("entryWorker").value);
  const fuel = $("entryFuel").value;
  const l = Math.round(parseFloat($("entryLitres").value) * 10) / 10;

  if (!state.workers.some(w => w.id === workerId)) return toast("Please choose a worker", true);
  if (!Number.isFinite(l) || l < 0.1 || l > 500) return toast("Enter litres between 0.1 and 500", true);

  state.entries.push({
    id: nextId(state.entries),
    workerId,
    fuel,
    litres: l,
    time: new Date().toISOString()
  });
  saveState();
  render();
  $("entryLitres").value = "";
  updateAmountPreview();
  toast("Fuel entry added ✔");
});

$("workerForm").addEventListener("submit", ev => {
  ev.preventDefault();
  const name = $("workerName").value.trim();
  const pump = $("workerPump").value.trim();
  const shift = $("workerShift").value;

  if (!name || !pump) return toast("Please fill name and pump", true);
  if (state.workers.some(w => w.name.toLowerCase() === name.toLowerCase())) {
    return toast("A worker with this name already exists", true);
  }

  state.workers.push({ id: nextId(state.workers), name, shift, pump });
  saveState();
  fillWorkerSelect();
  render();
  $("workerForm").reset();
  toast("Worker added ✔");
});

$("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset everything back to the demo data?")) return;
  state = freshState();
  saveState();
  fillWorkerSelect();
  render();
  toast("Demo data restored");
});

// ---------- Start ----------
$("pricePetrol").textContent = money(PRICES.petrol);
$("priceDiesel").textContent = money(PRICES.diesel);
tickClock();
setInterval(tickClock, 1000);
fillWorkerSelect();
updateAmountPreview();
render();