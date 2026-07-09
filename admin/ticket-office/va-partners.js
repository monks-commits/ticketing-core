window.VAPartners = {
  state: {
    seanceId: "",
    bookings: [],
    partnerKey: "",
    selected: new Set()
  },

  render({ targetId, seanceId, bookings = [] }) {
    const target = document.getElementById(targetId);
    if (!target) return;

    this.state.seanceId = seanceId || "";
    this.state.bookings = Array.isArray(bookings) ? bookings : [];
    this.state.selected = new Set();

    const partners = this.getPartners();

    if (!partners.length) {
      target.innerHTML = `
        <div class="panel">
          <h3>Комісіонери / уповноважені</h3>
          <div class="note">
            Для цього сеансу ще немає броней з організацією.
            Спочатку в касі поставте місця у резерв, потім у вкладці “Бронь” прив’яжіть їх до організації.
          </div>
        </div>
      `;
      return;
    }

    if (!this.state.partnerKey || !partners.some(p => p.key === this.state.partnerKey)) {
      this.state.partnerKey = partners[0].key;
    }

    target.innerHTML = `
      <div class="panel">
        <h3>Комісіонери / уповноважені</h3>

        <div class="work-grid">
          <div>
            <div class="field">
              <label>Комісіонер / організація</label>
              <select id="partnerSelect"></select>
            </div>
          </div>

          <div>
            <div class="note">
              Робота не через загальний журнал, а через “особову справу” суб’єкта:
              вибір місць галочками → масова видача КГ-7 → масове повернення КГ-8.
            </div>
          </div>
        </div>

        <div id="partnerSummary" class="stub-grid" style="margin-top:14px;"></div>

        <div class="buttons" style="margin-top:14px;">
          <button class="btn ghost" id="partnerSelectAll">☑ Вибрати все</button>
          <button class="btn ghost" id="partnerSelectReserved">☑ Тільки активні броні</button>
          <button class="btn ghost" id="partnerSelectIssued">☑ Тільки видані КГ-7</button>
          <button class="btn ghost" id="partnerClearSelected">☐ Зняти вибір</button>
        </div>

        <div class="buttons" style="margin-top:10px;">
          <button class="btn green" id="partnerIssueSelected">📄 Видати вибрані за КГ-7</button>
          <button class="btn orange" id="partnerReturnSelected">↩ Прийняти вибрані за КГ-8</button>
        </div>

        <div style="overflow:auto;margin-top:14px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="text-align:left;color:#b8c4d6;">
                <th style="padding:8px;">✓</th>
                <th style="padding:8px;">Місце</th>
                <th style="padding:8px;">Статус</th>
                <th style="padding:8px;">Контакт</th>
                <th style="padding:8px;">Телефон</th>
                <th style="padding:8px;">До</th>
                <th style="padding:8px;">Примітка</th>
              </tr>
            </thead>
            <tbody id="partnerSeatsBody"></tbody>
          </table>
        </div>
      </div>
    `;

    this.renderPartnerSelect(partners);
    this.renderPartnerCard();
    this.bindEvents();
  },

  getPartners() {
    const map = new Map();

    (this.state.bookings || []).forEach(b => {
      const org = String(b.organization || "").trim();
      const person = String(b.contact_name || b.buyer_name || "").trim();

      const name = org || person;
      if (!name) return;

      const key = name.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          count: 0
        });
      }

      map.get(key).count += this.seatsFromBooking(b).length || 1;
    });

    return Array.from(map.values())
      .sort((a, b) => a.name.localeCompare(b.name, "uk"));
  },

  renderPartnerSelect(partners) {
    const select = document.getElementById("partnerSelect");
    if (!select) return;

    select.innerHTML = partners.map(p => `
      <option value="${this.escape(p.key)}" ${p.key === this.state.partnerKey ? "selected" : ""}>
        ${this.escape(p.name)} · ${p.count}
      </option>
    `).join("");

    select.addEventListener("change", () => {
      this.state.partnerKey = select.value;
      this.state.selected = new Set();
      this.renderPartnerCard();
    });
  },

  getCurrentPartnerRows() {
    const key = this.state.partnerKey;

    return (this.state.bookings || []).filter(b => {
      const org = String(b.organization || "").trim();
      const person = String(b.contact_name || b.buyer_name || "").trim();
      const name = org || person;

      return name.toLowerCase() === key;
    });
  },

  buildSeatItems() {
    const rows = this.getCurrentPartnerRows();
    const items = [];

    rows.forEach(b => {
      this.seatsFromBooking(b).forEach(seat => {
        const key = `${b.id}__${seat}`;

        items.push({
          key,
          booking_id: b.id,
          booking: b,
          seat: String(seat || "").trim(),
          status: String(b.status || "").toLowerCase(),
          organization: b.organization || "",
          contact_name: b.contact_name || b.buyer_name || "",
          phone: b.buyer_phone || "",
          expires_at: b.expires_at || "",
          note: b.note || ""
        });
      });
    });

    return items;
  },

  renderPartnerCard() {
    const items = this.buildSeatItems();

    const reserved = items.filter(x => x.status === "reserved").length;
    const issued = items.filter(x => x.status === "issued_to_partner").length;
    const returned = items.filter(x => x.status === "partner_returned").length;
    const hold = items.filter(x => x.status === "hold").length;

    const summary = document.getElementById("partnerSummary");
    if (summary) {
      summary.innerHTML = `
        <div class="stub">
          <h4>Усього місць</h4>
          <strong>${items.length}</strong>
        </div>

        <div class="stub">
          <h4>Активна бронь</h4>
          <strong>${reserved + hold}</strong>
        </div>

        <div class="stub">
          <h4>Видано КГ-7</h4>
          <strong>${issued}</strong>
        </div>

        <div class="stub">
          <h4>Повернуто КГ-8</h4>
          <strong>${returned}</strong>
        </div>
      `;
    }

    const body = document.getElementById("partnerSeatsBody");
    if (!body) return;

    if (!items.length) {
      body.innerHTML = `<tr><td colspan="7" style="padding:10px;">Місць немає.</td></tr>`;
      return;
    }

    body.innerHTML = items.map(item => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          <input
            type="checkbox"
            class="partner-seat-check"
            data-key="${this.escape(item.key)}"
            ${this.state.selected.has(item.key) ? "checked" : ""}
          >
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(item.seat)}
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(this.statusLabel(item.status))}
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(item.contact_name)}
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(item.phone)}
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(this.formatDate(item.expires_at))}
        </td>

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">
          ${this.escape(item.note)}
        </td>
      </tr>
    `).join("");

    body.querySelectorAll(".partner-seat-check").forEach(ch => {
      ch.addEventListener("change", () => {
        const key = ch.getAttribute("data-key");

        if (ch.checked) {
          this.state.selected.add(key);
        } else {
          this.state.selected.delete(key);
        }
      });
    });
  },

  bindEvents() {
    const byId = id => document.getElementById(id);

    byId("partnerSelectAll")?.addEventListener("click", () => {
      this.selectByStatus("all");
    });

    byId("partnerSelectReserved")?.addEventListener("click", () => {
      this.selectByStatus("reserved");
    });

    byId("partnerSelectIssued")?.addEventListener("click", () => {
      this.selectByStatus("issued_to_partner");
    });

    byId("partnerClearSelected")?.addEventListener("click", () => {
      this.state.selected = new Set();
      this.renderPartnerCard();
    });

    byId("partnerIssueSelected")?.addEventListener("click", () => {
      this.issueSelected();
    });

    byId("partnerReturnSelected")?.addEventListener("click", () => {
      this.returnSelected();
    });
  },

  selectByStatus(status) {
    const items = this.buildSeatItems();

    this.state.selected = new Set();

    items.forEach(item => {
      if (status === "all") {
        this.state.selected.add(item.key);
        return;
      }

      if (status === "reserved" && ["reserved", "hold"].includes(item.status)) {
        this.state.selected.add(item.key);
        return;
      }

      if (status === "issued_to_partner" && item.status === "issued_to_partner") {
        this.state.selected.add(item.key);
      }
    });

    this.renderPartnerCard();
  },

  selectedItems() {
    const all = this.buildSeatItems();
    return all.filter(item => this.state.selected.has(item.key));
  },

  async issueSelected() {
    const items = this.selectedItems()
      .filter(x => ["reserved", "hold"].includes(x.status));

    if (!items.length) {
      alert("Немає вибраних активних броней для видачі.");
      return;
    }

    const docNo = prompt("Номер документа КГ-7:", "") || "";
    if (!docNo) return;

    const seats = items.map(x => x.seat);
    const bookingIds = Array.from(new Set(items.map(x => x.booking_id)));
    const first = items[0];

    const payload = {
      booking_id: first.booking_id,
      seance_id: this.state.seanceId,
      organization: first.booking.organization || "",
      partner_name: first.booking.organization || first.booking.contact_name || first.booking.buyer_name || "",
      seats,
      booking_seats: seats,
      issued_at: new Date().toISOString(),
      issued_by: "ticket-admin",
      status: "issued",
      note: `КГ-7: ${docNo}`
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/ticket_issues`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        alert(await res.text());
        return;
      }

      for (const id of bookingIds) {
        await this.patchBooking(id, {
          status: "issued_to_partner",
          note: `КГ-7: ${docNo}`
        });
      }

      alert(`Видано за КГ-7: ${seats.length} квитків.`);

      await this.reload();

    } catch (e) {
      console.error(e);
      alert("Помилка видачі КГ-7.");
    }
  },

  async returnSelected() {
    const items = this.selectedItems()
      .filter(x => x.status === "issued_to_partner");

    if (!items.length) {
      alert("Немає вибраних виданих квитків для повернення.");
      return;
    }

    const docNo = prompt("Номер документа КГ-8:", "") || "";
    if (!docNo) return;

    const seats = items.map(x => x.seat);
    const bookingIds = Array.from(new Set(items.map(x => x.booking_id)));
    const first = items[0];

    const payload = {
      seance_id: this.state.seanceId,
      booking_ids: bookingIds,
      seats,
      organization: first.booking.organization || "",
      contact_name: first.booking.contact_name || first.booking.buyer_name || "",
      buyer_phone: first.booking.buyer_phone || "",
      buyer_email: first.booking.buyer_email || "",
      issue_doc: docNo,
      return_note: `КГ-8: ${docNo}`
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/ticket_returns`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        alert(await res.text());
        return;
      }

      for (const id of bookingIds) {
        await this.patchBooking(id, {
          status: "partner_returned",
          note: `КГ-8: ${docNo}`
        });
      }

      alert(`Повернуто за КГ-8: ${seats.length} квитків.`);

      await this.reload();

    } catch (e) {
      console.error(e);
      alert("Помилка повернення КГ-8.");
    }
  },

  async patchBooking(id, patch) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(id)}`,
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
    }
  },

  async reload() {
    this.state.selected = new Set();

    if (typeof loadTurnover === "function") {
      await loadTurnover(this.state.seanceId);
    }
  },

  seatsFromBooking(b) {
    return Array.isArray(b?.seats) ? b.seats :
      Array.isArray(b?.seat_labels) ? b.seat_labels :
      b?.seat_label ? [b.seat_label] :
      [];
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
  }
};
