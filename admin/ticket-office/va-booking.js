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
            <div class="field"><label>Організація</label><input id="bookingOrg" placeholder="Назва організації"></div>
            <div class="field"><label>Контактна особа</label><input id="bookingPerson" placeholder="ПІБ"></div>
            <div class="field"><label>Телефон</label><input id="bookingPhone" placeholder="+380..."></div>
            <div class="field"><label>Email</label><input id="bookingEmail" placeholder="email"></div>
          </div>

          <div>
            <div class="field"><label>Уповноважений</label><input id="bookingAgent" placeholder="Зберігається в buyer_name"></div>
            <div class="field"><label>Дійсна до</label><input id="bookingExpire" type="datetime-local"></div>
            <div class="field"><label>Місця</label><input id="bookingSeats" placeholder="Заповнюється з резерву" readonly></div>
            <div class="field"><label>Примітка</label><input id="bookingNote" placeholder="Коментар"></div>
          </div>
        </div>

        <div class="buttons">
          <button class="btn green" onclick="VABooking.save()">💾 Зберегти</button>
          <button class="btn ghost" onclick="VABooking.clear()">🗑 Очистити</button>
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

    this.fillReservedSeatsField();
    this.renderJournal(this.state.bookings);

    if (window.VAToolbar) {
      VAToolbar.render({
        targetId: "bookingToolbar",
        tableId: "bookingJournalTable",
        title: "Журнал броней",
        onRefresh() {
          if (typeof loadTurnover === "function") loadTurnover(seanceId);
        }
      });
    }
  },

  seatsFromBooking(b) {
    return Array.isArray(b.seats) ? b.seats :
      Array.isArray(b.seat_labels) ? b.seat_labels :
      b.seat_label ? [b.seat_label] : [];
  },

  parseBuyerName(value) {
    const text = String(value || "");
    const get = (label) => {
      const m = text.match(new RegExp(label + ":\\s*([^|]+)", "i"));
      return m ? m[1].trim() : "";
    };

    return {
      raw: text,
      org: get("Організація"),
      person: get("Контакт"),
      phone: get("Телефон"),
      agent: get("Уповноважений"),
      note: get("Примітка")
    };
  },

  getEmptyReserved() {
    return (this.state.bookings || []).filter(b => {
      const st = String(b.status || "").toLowerCase();
      const hasContact =
        String(b.buyer_name || "").trim() ||
        String(b.buyer_email || "").trim();

      return st === "reserved" && !hasContact;
    });
  },

  fillReservedSeatsField() {
    const input = document.getElementById("bookingSeats");
    if (!input) return;

    const seats = [];

    this.getEmptyReserved().forEach(b => {
      this.seatsFromBooking(b).forEach(s => {
        const key = String(s || "").trim();
        if (key) seats.push(key);
      });
    });

    input.value = seats.join(", ");
  },

  renderJournal(bookings = []) {
    const body = document.getElementById("bookingJournalBody");
    if (!body) return;

    if (!bookings.length) {
      body.innerHTML = `<tr><td colspan="8" style="padding:10px;">Броней немає.</td></tr>`;
      return;
    }

    body.innerHTML = bookings.map(b => {
      const parsed = this.parseBuyerName(b.buyer_name);

      const row = {
        date: b.created_at || "",
        org: parsed.org,
        person: parsed.person || parsed.raw,
        phone: parsed.phone,
        seats: this.seatsFromBooking(b).join(", "),
        expires: b.expires_at || "",
        status: this.statusLabel(b.status),
        note: parsed.note
      };

      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(this.formatDate(row.date))}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(row.org)}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(row.person)}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(row.phone)}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(row.seats)}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(this.formatDate(row.expires))}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(row.status)}</td>
          <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(row.note)}</td>
        </tr>
      `;
    }).join("");
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

    const emptyReserved = this.getEmptyReserved();
    const seats = [];

    emptyReserved.forEach(b => {
      this.seatsFromBooking(b).forEach(s => {
        const key = String(s || "").trim();
        if (key && !seats.includes(key)) seats.push(key);
      });
    });

    if (!seats.length) {
      alert("Немає нових резервів без контактів для заповнення.");
      return;
    }

    const buyerName = [
      org ? `Організація: ${org}` : "",
      person ? `Контакт: ${person}` : "",
      phone ? `Телефон: ${phone}` : "",
      agent ? `Уповноважений: ${agent}` : "",
      note ? `Примітка: ${note}` : ""
    ].filter(Boolean).join(" | ");

    try {
      const clearRes = await fetch(
        `https://fhusjlkneckbvnrdhbil.functions.supabase.co/clear-booking-seat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            seance_id: seanceId,
            seats
          })
        }
      );

      const clearData = await clearRes.json().catch(() => null);

      if (!clearRes.ok || !clearData?.ok) {
        console.error("clear reserve before save error", clearData);
        alert("Не вдалося зняти старий резерв перед збереженням.");
        return;
      }

      let created = 0;

      for (const seat of seats) {
        const insertPayload = {
          seance_id: seanceId,
          show_slug: "ticket-office",
          seats: [seat],
          status: "reserved",
          amount: 0,
          order_id: `reserved-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          buyer_name: buyerName,
          buyer_email: email || null,
          expires_at: expire ? new Date(expire).toISOString() : null,
          channel: "office",
          ticket_type: "full"
        };

        const insRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify(insertPayload)
        });

        const insData = await insRes.json().catch(() => null);

        if (!insRes.ok) {
          console.error("booking insert with contacts error", insData);
          alert("Не вдалося створити бронь з контактами.");
          return;
        }

        if (Array.isArray(insData)) created += insData.length;
      }

      if (!created) {
        alert("Бронь не збережена: Supabase не повернув створені записи.");
        return;
      }

      alert(`Бронь збережено. Місць: ${created}`);

      this.clear();

      if (typeof loadTurnover === "function") {
        await loadTurnover(seanceId);
      }

    } catch (e) {
      console.error("booking save exception", e);
      alert("Помилка збереження броні.");
    }
  },

  clear() {
    [
      "bookingOrg",
      "bookingPerson",
      "bookingPhone",
      "bookingEmail",
      "bookingAgent",
      "bookingExpire",
      "bookingSeats",
      "bookingNote"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    this.fillReservedSeatsField();
  },

  print() {
    if (window.VAToolbar) {
      VAToolbar.printTable("bookingJournalTable", "Журнал броней");
    }
  },

  copy() {
    if (window.VAToolbar) {
      VAToolbar.copyTable("bookingJournalTable");
    }
  },

  statusLabel(status) {
    const st = String(status || "").toLowerCase();

    const map = {
      reserved: "Активна",
      hold: "Тимчасова",
      cancelled: "Скасована",
      canceled: "Скасована",
      expired: "Прострочена",
      released: "Знята",
      paid: "Викуплена"
    };

    return map[st] || status || "";
  },

  formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);

    return d.toLocaleString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  },

  escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
};
