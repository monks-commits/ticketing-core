export async function loadAllSeatsState({
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SEANCE_ID,
  takenSeats
}) {

  if (!SEANCE_ID) return;

  try {

    takenSeats.clear();

    const now = new Date();

    // === ПРОДАННЫЕ ===
    const soldRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tickets?seance_id=eq.${encodeURIComponent(SEANCE_ID)}&select=seat_label`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    const soldRows = await soldRes.json();

    soldRows.forEach(r => {
      if (r.seat_label) {
        takenSeats.add(r.seat_label.trim());
      }
    });

    // === HOLD ===
    const bookingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?seance_id=eq.${encodeURIComponent(SEANCE_ID)}&select=seats,expires_at,status`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    const bookings = await bookingRes.json();

    // 🔥 чистим все классы перед применением
    document.querySelectorAll(".seat").forEach(btn => {
      btn.classList.remove("seat--hold");
      btn.classList.remove("seat--taken");
      btn.disabled = false;
    });

    // === применяем HOLD ===
    for (const b of bookings) {

      if (b.status !== "hold") continue;
      if (b.expires_at && new Date(b.expires_at) <= now) continue;

      const arr = Array.isArray(b.seats) ? b.seats : [];

      for (const seat of arr) {

        if (!seat) continue;

        const key = seat.trim();

        takenSeats.add(key);

        document.querySelectorAll(".seat").forEach(btn => {
          if (btn.dataset?.key === key) {
            btn.classList.add("seat--hold"); // 🔴
          }
        });
      }
    }

    // === применяем ПРОДАННЫЕ (перекрывают HOLD) ===
    soldRows.forEach(r => {

      if (!r.seat_label) return;

      const key = r.seat_label.trim();

      document.querySelectorAll(".seat").forEach(btn => {
        if (btn.dataset?.key === key) {
          btn.classList.remove("seat--hold");
          btn.classList.add("seat--taken");
          btn.disabled = true;
        }
      });

    });

  } catch (e) {
    console.warn("loadAllSeatsState error", e);
  }
}
