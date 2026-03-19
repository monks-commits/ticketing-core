// /integrations/site.js

import { renderHall } from "../core/engine/renderer.js";
import { createSeatMetaGetter } from "../core/adapters/seance.js";

const SUPABASE_URL = "https://fhusjlkneckbvnrdhbil.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nCCfptJOb8Lzy1uAwGBJzA_OJtDneTS";

// ===================== INIT =====================

export async function initHall(containerId = "hall") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("Hall container not found");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const seanceId = params.get("seance");
  const show = params.get("show") || "";
  const title = params.get("title") || show;

  // ===================== LOAD DATA =====================

  const hallConfig = await fetch("../../data/hall/academy.json")
    .then(r => r.json());

  const seance = await loadSeance(seanceId);
  const takenState = await loadTakenSeats(seanceId);

  // ===================== UI =====================

  const summary = document.createElement("div");
  summary.innerHTML = `
    <div style="margin-top:16px;">
      <p>Місць: <b id="count">0</b></p>
      <p>Сума: <b id="amount">0</b> грн</p>
      <button id="buyBtn" disabled>Оформити</button>
    </div>
  `;
  container.after(summary);

  const countEl = document.getElementById("count");
  const amountEl = document.getElementById("amount");
  const buyBtn = document.getElementById("buyBtn");

  let selectedSeats = [];

  // ===================== RENDER =====================

  renderHall(
    container,
    hallConfig,
    takenState,
    {
      getSeatMeta: createSeatMetaGetter(seance),

      onSelect: (selected) => {
        selectedSeats = selected;

        countEl.textContent = selected.length;

        const total = selected.reduce((sum, seatId) => {
          const [p, m] = seatId.split("-");
          const row = Number(p.replace("P", ""));
          const seat = Number(m.replace("M", ""));

          const meta = createSeatMetaGetter(seance)({ row, seat }) || {};
          return sum + (meta.price || 0);
        }, 0);

        amountEl.textContent = total;
        buyBtn.disabled = !selected.length;
      }
    }
  );

  // ===================== NAVIGATION =====================

  buyBtn.onclick = () => {
    if (!selectedSeats.length) return;

    const url = new URL("../pages/order.html", location.href);

    url.searchParams.set("show", show);
    if (title) url.searchParams.set("title", title);
    url.searchParams.set("seats", selectedSeats.join(","));
    url.searchParams.set("amount", amountEl.textContent);

    if (seanceId) {
      url.searchParams.set("seance", seanceId);
    }

    location.href = url.toString();
  };
}

// ===================== LOADERS =====================

async function loadSeance(seanceId) {
  if (!seanceId) return { pricing: {}, seat_overrides: {} };

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/seances_pricing?seance_id=eq.${encodeURIComponent(seanceId)}&select=pricing,seat_overrides`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );

  const rows = await res.json();
  return rows[0] || { pricing: {}, seat_overrides: {} };
}

async function loadTakenSeats(seanceId) {
  if (!seanceId) return {};

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tickets?seance_id=eq.${encodeURIComponent(seanceId)}&select=seat_label`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );

  const rows = await res.json();

  const state = {};
  rows.forEach(r => {
    state[r.seat_label] = "taken";
  });

  return state;
}
