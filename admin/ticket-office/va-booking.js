window.VABooking = {

  state: {
    seanceId: "",
    bookings: []
  },
  
  render({ targetId, seanceId, bookings = [] }) {
    const target = document.getElementById(targetId);
    if (!target) return;

    this.state.seanceId = seanceId || "";
    this.state.bookings = Array.isArray(bookings) ? bookings : [];
    
    target.innerHTML = `
      <div class="panel">
        <h3>Бронювання місць</h3>

        <div class="work-grid">
          <div>
            <div class="field">
              <label>Організація</label>
              <input id="bookingOrg" placeholder="Назва організації">
            </div>

            <div class="field">
              <label>Контактна особа</label>
              <input id="bookingPerson" placeholder="ПІБ">
            </div>

            <div class="field">
              <label>Телефон</label>
              <input id="bookingPhone" placeholder="+380...">
            </div>

            <div class="field">
              <label>Email</label>
              <input id="bookingEmail" placeholder="email">
            </div>
          </div>

          <div>
            <div class="field">
              <label>Уповноважений</label>
              <input id="bookingAgent" placeholder="Хто передав бронь">
            </div>

            <div class="field">
              <label>Дійсна до</label>
              <input id="bookingExpire" type="datetime-local">
            </div>

            <div class="field">
              <label>Місця</label>
              <input id="bookingSeats" placeholder="P1-M1, P1-M2">
            </div>

            <div class="field">
              <label>Примітка</label>
              <input id="bookingNote" placeholder="Коментар">
            </div>
          </div>
        </div>

        <div class="buttons">
          <button class="btn green" onclick="VABooking.save()">💾 Зберегти бронь</button>
          <button class="btn ghost" onclick="VABooking.print()">🖨 Друк</button>
          <button class="btn ghost" onclick="VABooking.copy()">📋 Копіювати</button>
        </div>
      </div>

      <div class="stub" style="margin-top:14px;">
        <h4>Журнал броней</h4>
        <div id="bookingToolbar"></div>

        <div style="overflow:auto;margin-top:12px;">
          <table id="bookingJournalTable" style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="text-align:left;color:#b8c4d6;">
                <th style="padding:8px;border-bottom:1px solid rgba(255,255,255,.14);">Дата</th>
                <th style="padding:8px;border-bottom:1px solid rgba(255,255,255,.14);">Організація</th>
                <th style="padding:8px;border-bottom:1px solid rgba(255,255,255,.14);">Контакт</th>
                <th style="padding:8px;border-bottom:1px solid rgba(255,255,255,.14);">Телефон</th>
                <th style="padding:8px;border-bottom:1px solid rgba(255,255,255,.14);">Місця</th>
                <th style="padding:8px;border-bottom:1px solid rgba(255,255,255,.14);">До</th>
                <th style="padding:8px;border-bottom:1px solid rgba(255,255,255,.14);">Статус</th>
                <th style="padding:8px;border-bottom:1px solid rgba(255,255,255,.14);">Примітка</th>
              </tr>
            </thead>
            <tbody id="bookingJournalBody"></tbody>
          </table>
        </div>
      </div>
    `;

    this.renderJournal(bookings);

    if (window.VAToolbar) {
      VAToolbar.render({
        targetId: "bookingToolbar",
        tableId: "bookingJournalTable",
        title: "Журнал броней",
        onRefresh() {
          if (typeof loadTurnover === "function") {
            loadTurnover(seanceId);
          }
        }
      });
    }
  },

  renderJournal(bookings = []) {
    const body = document.getElementById("bookingJournalBody");
    if (!body) return;

    if (!bookings.length) {
      body.innerHTML = `<tr><td colspan="8" style="padding:10px;">Броней немає.</td></tr>`;
      return;
    }

    const rows = [];

    bookings.forEach(b => {
      const seats =
        Array.isArray(b.seats) ? b.seats :
        Array.isArray(b.seat_labels) ? b.seat_labels :
        b.seat_label ? [b.seat_label] :
        [];

      rows.push({
        date: b.created_at || "",
        org: b.organization || b.buyer_org || "",
        person: b.contact_name || b.buyer_name || "",
        phone: b.phone || b.buyer_phone || "",
        seats: seats.join(", "),
        expires: b.expires_at || "",
        status: b.status || "",
        note: b.note || b.comment || ""
      });
    });

    body.innerHTML = rows.map(r => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(this.formatDate(r.date))}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(r.org)}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(r.person)}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(r.phone)}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(r.seats)}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(this.formatDate(r.expires))}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(r.status)}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(r.note)}</td>
      </tr>
    `).join("");
  },

  async save() {
  const seanceId = this.state.seanceId;

  if (!seanceId) {
    alert("Не обрано сеанс.");
    return;
  }

  const org = document.getElementById("bookingOrg")?.value.trim() || "";
  const person = document.getElementById("bookingPerson")?.value.trim() || "";
  const phone = document.getElementById("bookingPhone")?.value.trim() || "";
  const email = document.getElementById("bookingEmail")?.value.trim() || "";
  const agent = document.getElementById("bookingAgent")?.value.trim() || "";
  const expire = document.getElementById("bookingExpire")?.value || "";
  const note = document.getElementById("bookingNote")?.value.trim() || "";

  if (!person && !org) {
    alert("Вкажіть контактну особу або організацію.");
    return;
  }

  if (!phone) {
    alert("Вкажіть телефон.");
    return;
  }

  const emptyReserved = (this.state.bookings || []).filter(b => {
    const st = String(b.status || "").toLowerCase();
    const hasContact =
      b.buyer_name ||
      b.contact_name ||
      b.buyer_phone ||
      b.phone ||
      b.organization;

    return st === "reserved" && !hasContact;
  });

  if (!emptyReserved.length) {
    alert("Немає нових резервів без контактів для заповнення.");
    return;
  }

  const patch = {
    buyer_name: person,
    buyer_phone: phone,
    buyer_email: email,

    organization: org,
    contact_name: person,
    phone,
    email,
    agent,
    note,

    expires_at: expire ? new Date(expire).toISOString() : null
  };

  try {
    for (const b of emptyReserved) {
      if (!b.id) continue;

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(b.id)}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(patch)
        }
      );

      if (!res.ok) {
        console.error("booking patch error", await res.text());
        alert("Не вдалося оновити бронь.");
        return;
      }
    }

    alert("Контакти додано до броні.");

    this.clear();

    if (typeof loadTurnover === "function") {
      await loadTurnover(seanceId);
    }

  } catch (e) {
    console.error("booking save exception", e);
    alert("Помилка збереження броні.");
  }
},
