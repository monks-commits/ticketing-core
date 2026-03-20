// /site-project/integrations/site.js

import { renderHall } from "../../engine/renderer.js";
import { createSeatMetaGetter } from "../../adapters/seance.js";

const SUPABASE_URL = "https://fhusjlkneckbvnrdhbil.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nCCfptJOb8Lzy1uAwGBJzA_OJtDneTS";

// ================= INIT =================

export async function initHall(containerId = "hall") {
  console.log("INIT START");

  const container = document.getElementById(containerId);
  if (!container) {
    console.error("Hall container not found");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const seanceId = params.get("seance");
  const show = params.get("show") || "";
  const title = params.get("title") || show;

  console.log("SEANCE ID:", seanceId);

  // ================= LOAD SEANCE =================

  const seance = await loadSeance(seanceId);
console.log("SEANCE FULL:", seance);
console.log("PRICING:", seance.pricing);
console.log("OVERRIDES:", seance.seat_overrides);
  console.log("SEANCE DATA:", seance);

  // 🔥 ГЛАВНОЕ: hall из seance
  const hallName = seance?.hall || "academy";

  console.log("HALL FROM SEANCE:", hallName);

  // ================= LOAD HALL =================

  const hallConfig = await fetch(`../../data/hall/${hallName}.json`)
    .then(r => {
      if (!r.ok) throw new Error("hall.json not found");
      return r.json();
    })
    .catch(err => {
      console.error("HALL LOAD ERROR:", err);
      return null;
    });

  if (!hallConfig) {
    container.innerHTML = "<p>Ошибка загрузки схемы зала</p>";
    return;
  }

  console.log("HALL CONFIG OK");

  // ================= LOAD TAKEN =================

  const takenState = await loadTakenSeats(seanceId);

  console.log("TAKEN:", takenState);

  // ================= UI =================

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

  // 🔥 АДАПТЕР
  const getMeta = createSeatMetaGetter(seance || {});

  // ================= RENDER =================

  renderHall(
    container,
    hallConfig,
    takenState || {},
    {
      getSeatMeta: getMeta,

      onSelect: (selected) => {
        selectedSeats = selected;

        countEl.textContent = selected.length;

        const total = selected.reduce((sum, seatId) => {
          const [p, m] = seatId.split("-");
          const row = Number(p.replace("P", ""));
          const seat = Number(m.replace("M", ""));

          const meta = getMeta({ row, seat }) || {};
          return sum + (meta.price || 0);
        }, 0);

        amountEl.textContent = total;
        buyBtn.disabled = !selected.length;
      }
    }
  );

  // ================= NAVIGATION =================

  buyBtn.onclick = () => {
    if (!selectedSeats.length) return;

    const url = new URL("../order.html", location.href);

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

// ================= LOADERS =================

async function loadSeance(seanceId) {
  if (!seanceId) {
    console.warn("NO SEANCE ID");
    return { pricing: {}, seat_overrides: {}, hall: "academy" };
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/seances_pricing?seance_id=eq.${encodeURIComponent(seanceId)}&select=pricing,seat_overrides,hall`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );

  if (!res.ok) {
    console.error("SEANCE LOAD ERROR");
    return { pricing: {}, seat_overrides: {}, hall: "academy" };
  }

  const rows = await res.json();

  if (!rows.length) {
    console.warn("SEANCE NOT FOUND IN SUPA");
    return { pricing: {}, seat_overrides: {}, hall: "academy" };
  }

  return rows[0];
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

  if (!res.ok) {
    console.error("TAKEN LOAD ERROR");
    return {};
  }

  const rows = await res.json();

  const state = {};
  rows.forEach(r => {
    state[r.seat_label] = "taken";
  });

  return state;
}
