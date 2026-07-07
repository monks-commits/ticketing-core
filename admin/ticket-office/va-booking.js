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
            <div class="field"><label>Уповноважений</label><input id="bookingAgent" placeholder="Хто передав бронь"></div>
            <div class="field"><label>Дійсна до</label><input id="bookingExpire" type="datetime-local"></div>
            <div class="field"><label>Місця</label><input id="bookingSeats" readonly></div>
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
                <th>Дата</th><th>Організація</th><th>Контакт</th><th>Телефон</th>
                <th>Місця</th><th>До</th><th>Статус</th><th>Примітка</th>
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
    return Array.isArray(b.seats) ? b.seats : [];
  },

  getEmptyReserved() {
    return (this.state.bookings || []).filter(b => {
      return String(b.status || "").toLowerCase() === "reserved" &&
        !String(b.buyer_name || "").trim() &&
        !String(b.organization || "").trim() &&
        !String(b.contact_name || "").trim() &&
        !String(b.buyer_phone || "").trim();
    });
  },

  fillReservedSeatsField() {
    const input = document.getElementById("bookingSeats");
    if (!input) return;

    const seats = [];
    this.getEmptyReserved().forEach(b => {
      this.seatsFromBooking(b).forEach(s => seats.push(String(s).trim()));
    });

    input.value = seats.filter(Boolean).join(", ");
  },

  renderJournal(bookings = []) {
    const body = document.getElementById("bookingJournalBody");
    if (!body) return;

    if (!bookings.length) {
      body.innerHTML = `<tr><td colspan="8" style="padding:10px;">Броней немає.</td></tr>`;
      return;
    }

    body.innerHTML = bookings.map(b => `
      <tr>
        <td>${this.escape(this.formatDate(b.created_at))}</td>
        <td>${this.escape(b.organization || "")}</td>
        <td>${this.escape(b.contact_name || b.buyer_name || "")}</td>
        <td>${this.escape(b.buyer_phone || "")}</td>
        <td>${this.escape(this.seatsFromBooking(b).join(", "))}</td>
        <td>${this.escape(this.formatDate(b.expires_at))}</td>
        <td>${this.escape(this.statusLabel(b.status))}</td>
        <td>${this.escape(b.note || "")}</td>
      </tr>
    `).join("");
  },

  async save() {
    const seanceId = this.state.seanceId;
    if (!seanceId) return alert("Не обрано сеанс.");

    const org = document.getElementById("bookingOrg")?.value.trim() || "";
    const person = document.getElementById("bookingPerson")?.value.trim() || "";
    const phone = document.getElementById("bookingPhone")?.value.trim() || "";
    const email = document.getElementById("bookingEmail")?.value.trim() || "";
    const agent = document.getElementById("bookingAgent")?.value.trim() || "";
    const expire = document.getElementById("bookingExpire")?.value || "";
    const note = document.getElementById("bookingNote")?.value.trim() || "";

    if (!person && !org) return alert("Вкажіть контактну особу або організацію.");
    if (!phone) return alert("Вкажіть телефон.");

    const rows = this.getEmptyReserved();
    if (!rows.length) return alert("Немає нових резервів без контактів.");

    const patch = {
      buyer_name: person || org,
      buyer_email: email || null,
      buyer_phone: phone,
      organization: org,
      contact_name: person,
      agent,
      note,
      expires_at: expire ? new Date(expire).toISOString() : null
    };

    let updated = 0;

    for (const b of rows) {
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

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("booking save error", data);
        return alert("Не вдалося оновити бронь.");
      }

      updated += Array.isArray(data) ? data.length : 0;
    }

    alert(`Бронь оновлено. Записів: ${updated}`);

    this.clear();

    if (typeof loadTurnover === "function") {
      await loadTurnover(seanceId);
    }
  },

  clear() {
    [
      "bookingOrg","bookingPerson","bookingPhone","bookingEmail",
      "bookingAgent","bookingExpire","bookingSeats","bookingNote"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    this.fillReservedSeatsField();
  },

  print() {
    if (window.VAToolbar) VAToolbar.printTable("bookingJournalTable", "Журнал броней");
  },

  copy() {
    if (window.VAToolbar) VAToolbar.copyTable("bookingJournalTable");
  },

  statusLabel(status) {
    const map = {
      reserved: "Активна",
      hold: "Тимчасова",
      cancelled: "Скасована",
      expired: "Прострочена",
      paid: "Викуплена"
    };
    return map[String(status || "").toLowerCase()] || status || "";
  },

  formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("uk-UA", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit"
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
