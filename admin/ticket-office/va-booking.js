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

  save() {
    alert("Збереження броні підключимо наступним кроком.");
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

  formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("uk-UA", {
      day:"2-digit",
      month:"2-digit",
      year:"2-digit",
      hour:"2-digit",
      minute:"2-digit"
    });
  },

  escape(value) {
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }
};
