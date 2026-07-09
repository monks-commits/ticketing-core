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
              <input id="bookingSeats" readonly>
            </div>

            <div class="field">
              <label>Примітка</label>
              <input id="bookingNote" placeholder="Коментар">
            </div>
          </div>
        </div>

        <div class="buttons">
          <button class="btn green" onclick="VABooking.save()">💾 Зберегти</button>
          <button class="btn green" onclick="VABooking.issue()">🎫 Видати квитки</button>
          <button class="btn ghost" onclick="VABooking.clear()">🗑 Очистити</button>
          <button class="btn ghost" onclick="VABooking.print()">🖨 Друк</button>
          <button class="btn ghost" onclick="VABooking.copy()">📋 Копіювати</button>
        </div>

        <div class="note">
          Порядок V1: каса ставить місця у резерв → квитковий відділ прив’язує резерв до організації →
          видає квитки за КГ-7. Після видачі статус броні змінюється на “Видано КГ-7”.
        </div>
      </div>

      <div class="stub" style="margin-top:14px;">
        <h4>Журнал броней</h4>
        <div id="bookingToolbar"></div>

        <div style="overflow:auto;margin-top:12px;">
          <table id="bookingJournalTable" style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="text-align:left;color:#b8c4d6;">
                <th>Дата</th>
                <th>Організація</th>
                <th>Контакт</th>
                <th>Телефон</th>
                <th>Місця</th>
                <th>До</th>
                <th>Статус</th>
                <th>Примітка</th>
                <th>Дія</th>
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
      b.seat_label ? [b.seat_label] :
      [];
  },

  getReservedWithoutContacts() {
    return (this.state.bookings || []).filter(b => {
      const st = String(b.status || "").toLowerCase();

      const hasContacts =
        String(b.buyer_name || "").trim() ||
        String(b.buyer_email || "").trim() ||
        String(b.buyer_phone || "").trim() ||
        String(b.organization || "").trim() ||
        String(b.contact_name || "").trim();

      return ["reserved", "hold"].includes(st) && !hasContacts;
    });
  },

  fillReservedSeatsField() {
    const input = document.getElementById("bookingSeats");
    if (!input) return;

    const seats = [];

    this.getReservedWithoutContacts().forEach(b => {
      this.seatsFromBooking(b).forEach(s => {
        const key = String(s || "").trim();
        if (key && !seats.includes(key)) seats.push(key);
      });
    });

    input.value = seats.join(", ");
  },

  pickBooking(id) {
    const booking = (this.state.bookings || []).find(b => String(b.id) === String(id));
    if (!booking) {
      alert("Бронь не знайдено.");
      return;
    }

    const org = document.getElementById("bookingOrg");
    const person = document.getElementById("bookingPerson");
    const phone = document.getElementById("bookingPhone");
    const email = document.getElementById("bookingEmail");
    const agent = document.getElementById("bookingAgent");
    const expire = document.getElementById("bookingExpire");
    const seats = document.getElementById("bookingSeats");
    const note = document.getElementById("bookingNote");

    if (org) org.value = booking.organization || "";
    if (person) person.value = booking.contact_name || booking.buyer_name || "";
    if (phone) phone.value = booking.buyer_phone || "";
    if (email) email.value = booking.buyer_email || "";
    if (agent) agent.value = booking.agent || "";
    if (note) note.value = booking.note || "";

    if (expire && booking.expires_at) {
      const d = new Date(booking.expires_at);
      if (!Number.isNaN(d.getTime())) {
        expire.value = d.toISOString().slice(0, 16);
      }
    }

    if (seats) {
      seats.value = this.seatsFromBooking(booking).join(", ");
    }
  },

  renderJournal(bookings = []) {
    const body = document.getElementById("bookingJournalBody");
    if (!body) return;

    if (!bookings.length) {
      body.innerHTML = `<tr><td colspan="9" style="padding:10px;">Броней немає.</td></tr>`;
      return;
    }

    body.innerHTML = bookings.map(b => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(this.formatDate(b.created_at))}
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(b.organization || "")}
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(b.contact_name || b.buyer_name || "")}
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(b.buyer_phone || "")}
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(this.seatsFromBooking(b).join(", "))}
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(this.formatDate(b.expires_at))}
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(this.statusLabel(b.status))}
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(b.note || "")}
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          <button class="btn ghost" style="min-height:32px;padding:0 10px;"
            onclick="VABooking.pickBooking('${this.escapeJs(b.id)}')">
            Обрати
          </button>
        </td>
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
    const seatsRaw = document.getElementById("bookingSeats")?.value.trim() || "";

    if (!person && !org) {
      alert("Вкажіть контактну особу або організацію.");
      return;
    }

    if (!phone) {
      alert("Вкажіть телефон.");
      return;
    }

    const selectedSeats = seatsRaw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    if (!selectedSeats.length) {
      alert("Немає місць для оновлення.");
      return;
    }

    const rowsToUpdate = (this.state.bookings || []).filter(b => {
      const st = String(b.status || "").toLowerCase();
      if (!["reserved", "hold"].includes(st)) return false;

      const rowSeats = this.seatsFromBooking(b).map(s => String(s || "").trim());
      return rowSeats.some(seat => selectedSeats.includes(seat));
    });

    if (!rowsToUpdate.length) {
      alert("Не знайдено записів броні для цих місць.");
      return;
    }

    const patch = {
      buyer_name: person || org,
      buyer_email: email || null,
      buyer_phone: phone,
      organization: org,
      contact_name: person,
      agent,
      note,
      status: "reserved",
      expires_at: expire
        ? new Date(expire).toISOString()
        : new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };

    let updated = 0;

    try {
      for (const b of rowsToUpdate) {
        if (!b.id) {
          console.error("booking row without id", b);
          continue;
        }

        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(b.id)}&select=id`,
          {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=representation"
            },
            body: JSON.stringify(patch)
          }
        );

        const raw = await res.text();

        if (!res.ok) {
          console.error("PATCH STATUS:", res.status);
          console.error("PATCH RESPONSE:", raw);
          alert(raw);
          return;
        }

        const data = raw ? JSON.parse(raw) : null;

        if (Array.isArray(data) && data.length) {
          updated += data.length;
        } else {
          updated += 1;
        }
      }

      alert(`Бронь оновлено. Записів: ${updated}`);

      if (typeof loadTurnover === "function") {
        await loadTurnover(seanceId);
      }

    } catch (e) {
      console.error("booking save exception", e);
      alert("Помилка збереження броні.");
    }
  },

  async issue() {
    const seanceId = this.state.seanceId;

    if (!seanceId) {
      alert("Не обрано сеанс.");
      return;
    }

    const org =
      document.getElementById("bookingOrg")?.value.trim() || "";

    const person =
      document.getElementById("bookingPerson")?.value.trim() || "";

    const seats =
      document.getElementById("bookingSeats")?.value
        .split(",")
        .map(s => s.trim())
        .filter(Boolean) || [];

    if (!seats.length) {
      alert("Немає місць для видачі.");
      return;
    }

    const rowsToIssue = (this.state.bookings || []).filter(b => {
      const st = String(b.status || "").toLowerCase();

      if (!["reserved", "hold"].includes(st)) return false;

      const bSeats = this.seatsFromBooking(b)
        .map(s => String(s || "").trim());

      return bSeats.some(s => seats.includes(s));
    });

    if (!rowsToIssue.length) {
      alert("Не знайдено бронь для цих місць.");
      return;
    }

    const booking = rowsToIssue[0];

    const partnerName =
      booking.organization ||
      org ||
      booking.contact_name ||
      booking.buyer_name ||
      person ||
      "";

    if (!partnerName) {
      alert("Вкажіть отримувача.");
      return;
    }

    const kg7Doc = prompt("Номер документа КГ-7:", "") || "";

    const baseNote =
      document.getElementById("bookingNote")?.value.trim() ||
      booking.note ||
      "";

    const issueNote = [
      kg7Doc ? `КГ-7: ${kg7Doc}` : "",
      baseNote
    ].filter(Boolean).join(" | ");

    const payload = {
      booking_id: booking.id,

      seance_id: seanceId,

      organization:
        booking.organization || org,

      partner_name: partnerName,

      seats: seats,

      booking_seats: seats,

      issued_at: new Date().toISOString(),

      issued_by: "ticket-admin",

      status: "issued",

      note: issueNote
    };

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/ticket_issues`,
        {
          method: "POST",

          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },

          body: JSON.stringify(payload)
        }
      );

      const raw = await res.text();

      if (!res.ok) {
        console.error(raw);
        alert(raw);
        return;
      }

      for (const row of rowsToIssue) {
        if (!row.id) continue;

        const patch = {
          status: "issued_to_partner"
        };

        if (issueNote) {
          patch.note = issueNote;
        }

        const upd = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(row.id)}`,
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

        if (!upd.ok) {
          console.error("booking status update error:", await upd.text());
        }
      }

      alert("Квитки видані за КГ-7.");

      this.clear();

      if (typeof loadTurnover === "function") {
        await loadTurnover(seanceId);
      }

    } catch (e) {
      console.error(e);
      alert("Помилка видачі квитків.");
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
    const map = {
      reserved: "Активна",
      hold: "Тимчасова",
      issued_to_partner: "Видано КГ-7",
      partner_returned: "Повернуто КГ-8",
      cancelled: "Скасована",
      canceled: "Скасована",
      expired: "Прострочена",
      released: "Знята",
      paid: "Викуплена"
    };

    return map[String(status || "").toLowerCase()] || status || "";
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
  },

  escapeJs(value) {
    return String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "");
  }
};
