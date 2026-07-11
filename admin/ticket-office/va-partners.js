window.VAPartners = {
  state: {
    targetId: "",
    seanceId: "",
    bookings: [],
    partners: [],
    partnerId: "",
    selected: new Set()
  },

  render({ targetId, seanceId, bookings = [] }) {
    const target = document.getElementById(targetId);
    if (!target) return;

    this.state.targetId = targetId;
    this.state.seanceId = seanceId || "";
    this.state.bookings = Array.isArray(bookings) ? bookings : [];
    this.state.selected = new Set();

    target.innerHTML = `
      <div class="panel">
        <h3>Комісіонери / уповноважені</h3>
        <div class="note">Завантажую довідник комісіонерів...</div>
      </div>
    `;

    this.loadPartners()
      .then(() => this.renderShell())
      .catch(e => {
        console.error(e);
        target.innerHTML = `
          <div class="panel">
            <h3>Комісіонери / уповноважені</h3>
            <div class="note">Помилка завантаження довідника partners.</div>
          </div>
        `;
      });
  },

  async loadPartners() {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/partners?select=*&active=eq.true&order=name.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        cache: "no-store"
      }
    );

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const rows = await res.json();
    this.state.partners = Array.isArray(rows) ? rows : [];

    if (!this.state.partnerId || !this.state.partners.some(p => String(p.id) === String(this.state.partnerId))) {
      this.state.partnerId = this.state.partners[0]?.id || "";
    }
  },

  renderShell() {
    const target = document.getElementById(this.state.targetId);
    if (!target) return;

    if (!this.state.seanceId) {
      target.innerHTML = `
        <div class="panel">
          <h3>Комісіонери / уповноважені</h3>
          <div class="note">Оберіть сеанс.</div>
        </div>
      `;
      return;
    }

    if (!this.state.partners.length) {
      target.innerHTML = `
        <div class="panel">
          <h3>Комісіонери / уповноважені</h3>
          <div class="note">У довіднику partners ще немає комісіонерів.</div>
          <div class="buttons" style="margin-top:14px;">
            <button class="btn green" id="partnerAddBtn">➕ Додати комісіонера</button>
          </div>
        </div>
      `;

      document.getElementById("partnerAddBtn")?.addEventListener("click", () => this.addPartnerPrompt());
      return;
    }

    const partner = this.currentPartner();

    target.innerHTML = `
      <div class="panel">
        <h3>Комісіонери / уповноважені</h3>

        <div class="work-grid">
          <div>
            <div class="field">
              <label>Комісіонер / організація</label>
              <select id="partnerSelect"></select>
            </div>

            <div class="buttons">
              <button class="btn green" id="partnerAddBtn">➕ Додати</button>
              <button class="btn ghost" id="partnerRefreshBtn">Оновити</button>
            </div>
          </div>

          <div>
            <div class="stub">
              <h4 id="partnerCardTitle">${this.escape(partner?.name || "—")}</h4>
              <p>
                Контакт: <b>${this.escape(partner?.contact_name || "—")}</b><br>
                Телефон: <b>${this.escape(partner?.phone || "—")}</b><br>
                Email: <b>${this.escape(partner?.email || "—")}</b><br>
                Договір: <b>${this.escape(partner?.contract_no || "—")}</b>
              </p>
            </div>
          </div>
        </div>

        <div id="partnerSummary" class="stub-grid" style="margin-top:14px;"></div>

        <div class="stub" style="margin-top:14px;">
          <h4>Закріпити місця за комісіонером</h4>
          <p class="note">
            V1: введіть місця через кому. Наступним кроком підключимо вибір місць прямо зі схеми залу.
          </p>

          <div class="work-grid">
            <div>
              <div class="field">
                <label>Місця</label>
                <input id="partnerAttachSeats" placeholder="Наприклад: P7-M10, P7-M11, P7-M12">
              </div>
            </div>

            <div>
              <div class="field">
                <label>Дійсна до</label>
                <input id="partnerAttachExpire" type="datetime-local">
              </div>
            </div>
          </div>

          <div class="field">
            <label>Примітка</label>
            <input id="partnerAttachNote" placeholder="Коментар до закріплення">
          </div>

          <div class="buttons">
            <button class="btn green" id="partnerOpenHallBtn">🎭 Вибрати місця на схемі</button>
<button class="btn ghost" id="partnerAttachBtn">📌 Закріпити введені вручну</button>
          </div>
        </div>

        <div class="buttons" style="margin-top:14px;">
          <button class="btn ghost" id="partnerSelectAll">☑ Вибрати все</button>
          <button class="btn ghost" id="partnerSelectReserved">☑ Тільки активні броні</button>
          <button class="btn ghost" id="partnerSelectIssued">☑ Тільки видані КГ-7</button>
          <button class="btn ghost" id="partnerClearSelected">☐ Зняти вибір</button>
        </div>

        <div class="buttons" style="margin-top:10px;">
          <button class="btn green" id="partnerIssueSelected">📄 Видати вибрані за КГ-7</button>
          <button class="btn ghost" id="partnerPrintKG7">🖨 Друк КГ-7</button>
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

    this.renderPartnerSelect();
    this.renderPartnerCard();
    this.bindEvents();
  },

  renderPartnerSelect() {
    const select = document.getElementById("partnerSelect");
    if (!select) return;

    select.innerHTML = this.state.partners.map(p => `
      <option value="${this.escape(p.id)}" ${String(p.id) === String(this.state.partnerId) ? "selected" : ""}>
        ${this.escape(p.name)}
      </option>
    `).join("");

    select.addEventListener("change", () => {
      this.state.partnerId = select.value;
      this.state.selected = new Set();
      this.renderShell();
    });
  },

  bindEvents() {
    const byId = id => document.getElementById(id);

    byId("partnerAddBtn")?.addEventListener("click", () => this.addPartnerPrompt());

    byId("partnerRefreshBtn")?.addEventListener("click", async () => {
      await this.loadPartners();
      this.renderShell();
    });

    byId("partnerAttachBtn")?.addEventListener("click", () => this.attachSeatsToPartner());

    byId("partnerOpenHallBtn")?.addEventListener("click", () => this.openPartnerHallPicker());

    byId("partnerSelectAll")?.addEventListener("click", () => this.selectByStatus("all"));
    byId("partnerSelectReserved")?.addEventListener("click", () => this.selectByStatus("reserved"));
    byId("partnerSelectIssued")?.addEventListener("click", () => this.selectByStatus("issued_to_partner"));

    byId("partnerClearSelected")?.addEventListener("click", () => {
      this.state.selected = new Set();
      this.renderPartnerCard();
    });

    byId("partnerIssueSelected")?.addEventListener("click", () => this.issueSelected());
    byId("partnerPrintKG7")?.addEventListener("click", () => this.printKG7Selected());
    byId("partnerReturnSelected")?.addEventListener("click", () => this.returnSelected());
  },

openPartnerHallPicker() {
  const partner = this.currentPartner();

  if (!partner) {
    alert("Оберіть комісіонера.");
    return;
  }

  if (!this.state.seanceId) {
    alert("Оберіть сеанс.");
    return;
  }

  const url =
    `../hybrid/hall-cash.html` +
    `?seance=${encodeURIComponent(this.state.seanceId)}` +
    `&partner_attach=1` +
    `&partner_id=${encodeURIComponent(partner.id || "")}` +
    `&partner_name=${encodeURIComponent(partner.name || "")}` +
    `&partner_contact=${encodeURIComponent(partner.contact_name || "")}` +
    `&partner_phone=${encodeURIComponent(partner.phone || "")}` +
    `&partner_email=${encodeURIComponent(partner.email || "")}`;

  window.open(url, "_blank");
},
  
  currentPartner() {
    return this.state.partners.find(p => String(p.id) === String(this.state.partnerId)) || null;
  },

  partnerNameKey(value) {
    return String(value || "").trim().toLowerCase();
  },

  getCurrentPartnerRows() {
    const partner = this.currentPartner();
    if (!partner) return [];

    const targetName = this.partnerNameKey(partner.name);

    return (this.state.bookings || []).filter(b => {
      const org = this.partnerNameKey(b.organization);
      return org && org === targetName;
    });
  },

  buildSeatItems() {
    const rows = this.getCurrentPartnerRows();
    const items = [];

    rows.forEach(b => {
      this.seatsFromBooking(b).forEach(seat => {
        const cleanSeat = String(seat || "").trim();
        if (!cleanSeat) return;

        const key = `${b.id}__${cleanSeat}`;

        items.push({
          key,
          booking_id: b.id,
          booking: b,
          seat: cleanSeat,
          status: String(b.status || "").toLowerCase(),
          organization: b.organization || "",
          contact_name: b.contact_name || b.buyer_name || "",
          phone: b.buyer_phone || "",
          email: b.buyer_email || "",
          expires_at: b.expires_at || "",
          note: b.note || ""
        });
      });
    });

    return items;
  },

  renderPartnerCard() {
    const items = this.buildSeatItems();

    const reserved = items.filter(x => ["reserved", "hold"].includes(x.status)).length;
    const issued = items.filter(x => x.status === "issued_to_partner").length;
    const returned = items.filter(x => x.status === "partner_returned").length;

    const summary = document.getElementById("partnerSummary");
    if (summary) {
      summary.innerHTML = `
        <div class="stub">
          <h4>Усього місць</h4>
          <strong>${items.length}</strong>
        </div>

        <div class="stub">
          <h4>Активна бронь</h4>
          <strong>${reserved}</strong>
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
      body.innerHTML = `<tr><td colspan="7" style="padding:10px;">По цьому сеансу місця ще не закріплені.</td></tr>`;
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

        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(item.seat)}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(this.statusLabel(item.status))}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(item.contact_name)}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(item.phone)}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(this.formatDate(item.expires_at))}</td>
        <td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);">${this.escape(item.note)}</td>
      </tr>
    `).join("");

    body.querySelectorAll(".partner-seat-check").forEach(ch => {
      ch.addEventListener("change", () => {
        const key = ch.getAttribute("data-key");
        if (!key) return;

        if (ch.checked) {
          this.state.selected.add(key);
        } else {
          this.state.selected.delete(key);
        }
      });
    });
  },

  async addPartnerPrompt() {
    const name = prompt("Назва комісіонера / організації:", "");
    if (!name || !name.trim()) return;

    const contact = prompt("Контактна особа:", "") || "";
    const phone = prompt("Телефон:", "") || "";
    const email = prompt("Email:", "") || "";

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/partners`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          name: name.trim(),
          type: "commissioner",
          contact_name: contact.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          active: true
        })
      });

      const raw = await res.text();
      if (!res.ok) {
        alert(raw);
        return;
      }

      const created = raw ? JSON.parse(raw) : [];
      if (Array.isArray(created) && created[0]?.id) {
        this.state.partnerId = created[0].id;
      }

      await this.loadPartners();
      this.renderShell();

    } catch(e) {
      console.error(e);
      alert("Помилка створення комісіонера.");
    }
  },

  parseSeats(value) {
    return String(value || "")
      .split(/[\s,;]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .filter((s, i, arr) => arr.indexOf(s) === i);
  },

  existingActiveSeats() {
    const set = new Set();

    (this.state.bookings || []).forEach(b => {
      const st = String(b.status || "").toLowerCase();
      if (["cancelled", "canceled", "released", "expired", "partner_returned"].includes(st)) return;

      this.seatsFromBooking(b).forEach(seat => {
        const key = String(seat || "").trim();
        if (key) set.add(key);
      });
    });

    return set;
  },

  async attachSeatsToPartner() {
    const partner = this.currentPartner();
    if (!partner) {
      alert("Оберіть комісіонера.");
      return;
    }

    if (!this.state.seanceId) {
      alert("Оберіть сеанс.");
      return;
    }

    const seats = this.parseSeats(document.getElementById("partnerAttachSeats")?.value || "");
    if (!seats.length) {
      alert("Вкажіть місця для закріплення.");
      return;
    }

    const active = this.existingActiveSeats();
    const duplicate = seats.filter(s => active.has(s));
    const cleanSeats = seats.filter(s => !active.has(s));

    if (duplicate.length && !confirm(`Ці місця вже є в активному обороті і будуть пропущені: ${duplicate.join(", ")}\nПродовжити?`)) {
      return;
    }

    if (!cleanSeats.length) {
      alert("Немає нових місць для закріплення.");
      return;
    }

    const expire = document.getElementById("partnerAttachExpire")?.value || "";
    const note = document.getElementById("partnerAttachNote")?.value.trim() || "";

    const expiresAt = expire ? new Date(expire).toISOString() : null;

    const ok = confirm(`Закріпити за ${partner.name}: ${cleanSeats.length} місць?`);
    if (!ok) return;

    try {
      let created = 0;

      for (const seat of cleanSeats) {
        const payload = {
          seance_id: this.state.seanceId,
          show_slug: "partner",
          seats: [seat],
          status: "reserved",
          amount: 0,
          order_id: `partner-${this.state.seanceId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          buyer_name: partner.contact_name || partner.name,
          buyer_email: partner.email || null,
          buyer_phone: partner.phone || null,
          organization: partner.name,
          contact_name: partner.contact_name || "",
          agent: partner.name,
          note: note || `Комісіонер: ${partner.name}`
        };

        if (expiresAt) {
          payload.expires_at = expiresAt;
        }

        const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
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
          console.error("attach booking error", await res.text());
          continue;
        }

        created += 1;
      }

      alert(`Закріплено місць: ${created}`);

      await this.reload();

    } catch(e) {
      console.error(e);
      alert("Помилка закріплення місць.");
    }
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

currentDocYear() {
  return new Date().getFullYear();
},

async getSuggestedDocNo(docType) {
  const year = this.currentDocYear();

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/doc_counters?doc_type=eq.${encodeURIComponent(docType)}&year=eq.${encodeURIComponent(year)}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        cache: "no-store"
      }
    );

    const rows = await res.json();

    if (Array.isArray(rows) && rows.length) {
      const row = rows[0];
      const prefix = row.prefix || "";
      const nextNo = Number(row.current_no || 0) + 1;

      return `${prefix}${nextNo}`;
    }

    const createRes = await fetch(`${SUPABASE_URL}/rest/v1/doc_counters`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        doc_type: docType,
        year,
        prefix: "",
        current_no: 0
      })
    });

    if (!createRes.ok) {
      console.error("doc counter create error:", await createRes.text());
    }

    return "1";

  } catch(e) {
    console.error("getSuggestedDocNo error:", e);
    return "";
  }
},

docNumberValue(docNo) {
  const m = String(docNo || "").trim().match(/(\d+)\s*$/);
  return m ? Number(m[1]) : 0;
},

docPrefixValue(docNo) {
  return String(docNo || "")
    .trim()
    .replace(/(\d+)\s*$/, "")
    .trim();
},

async commitDocNo(docType, docNo) {
  const year = this.currentDocYear();
  const numberValue = this.docNumberValue(docNo);

  if (!numberValue) return;

  const prefix = this.docPrefixValue(docNo);

  try {
    const getRes = await fetch(
      `${SUPABASE_URL}/rest/v1/doc_counters?doc_type=eq.${encodeURIComponent(docType)}&year=eq.${encodeURIComponent(year)}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        cache: "no-store"
      }
    );

    const rows = await getRes.json();
    const current = Array.isArray(rows) && rows.length ? rows[0] : null;

    if (!current) {
      await fetch(`${SUPABASE_URL}/rest/v1/doc_counters`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          doc_type: docType,
          year,
          prefix,
          current_no: numberValue
        })
      });

      return;
    }

    const currentNo = Number(current.current_no || 0);

    if (numberValue <= currentNo) {
      return;
    }

    await fetch(
      `${SUPABASE_URL}/rest/v1/doc_counters?doc_type=eq.${encodeURIComponent(docType)}&year=eq.${encodeURIComponent(year)}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prefix,
          current_no: numberValue,
          updated_at: new Date().toISOString()
        })
      }
    );

  } catch(e) {
    console.error("commitDocNo error:", e);
  }
},
  
  async issueSelected() {
    const items = this.selectedItems().filter(x => ["reserved", "hold"].includes(x.status));

    if (!items.length) {
      alert("Немає вибраних активних броней для видачі.");
      return;
    }

    const suggestedDocNo = await this.getSuggestedDocNo("kg7");
const docNo = prompt("Номер документа КГ-7:", suggestedDocNo) || "";
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

await this.commitDocNo("kg7", docNo);
      
      const meta = await this.loadSeanceMeta();
      const pricing = await this.loadSeancePricing();

      const rows = items.map(item => {
        const price = this.priceForSeat(item.seat, pricing);
        return {
          seat: item.seat,
          price,
          amount: price,
          status: "issued_to_partner",
          organization: item.booking.organization || "",
          contact_name: item.booking.contact_name || item.booking.buyer_name || "",
          phone: item.booking.buyer_phone || "",
          note: `КГ-7: ${docNo}`
        };
      });

      this.openKG7PrintWindow({ docNo, meta, rows });
      await this.reload();

    } catch (e) {
      console.error(e);
      alert("Помилка видачі КГ-7.");
    }
  },

  async printKG7Selected() {
    const items = this.selectedItems().filter(x => x.status === "issued_to_partner");

    if (!items.length) {
      alert("Оберіть вже видані квитки КГ-7.");
      return;
    }

    const docNumbers = new Set();

    items.forEach(item => {
      const note = String(item.note || item.booking?.note || "");
      const m = note.match(/КГ-7:\s*([^\s|]+)/i);
      if (m && m[1]) docNumbers.add(m[1].trim());
    });

    if (!docNumbers.size) {
      alert("У вибраних квитків не знайдено номер КГ-7.");
      return;
    }

    if (docNumbers.size > 1) {
      alert("Вибрані квитки належать до різних КГ-7: " + Array.from(docNumbers).join(", ") + ". Оберіть квитки тільки одного документа.");
      return;
    }

    const docNo = Array.from(docNumbers)[0];
    const meta = await this.loadSeanceMeta();
    const pricing = await this.loadSeancePricing();

    const rows = items.map(item => {
      const price = this.priceForSeat(item.seat, pricing);
      return {
        seat: item.seat,
        price,
        amount: price,
        status: item.status,
        organization: item.booking.organization || "",
        contact_name: item.booking.contact_name || item.booking.buyer_name || "",
        phone: item.booking.buyer_phone || "",
        note: item.note || item.booking.note || ""
      };
    });

    this.openKG7PrintWindow({ docNo, meta, rows });
  },

async returnSelected() {
  const partner = this.currentPartner();

  if (!partner) {
    alert("Оберіть комісіонера.");
    return;
  }

  const items = this.selectedItems()
    .filter(x => x.status === "issued_to_partner");

  if (!items.length) {
    alert("Оберіть квитки зі статусом “Видано КГ-7”.");
    return;
  }

  const suggestedDocNo = await this.getSuggestedDocNo("kg8");
  const docNo = prompt("Номер документа КГ-8:", suggestedDocNo) || "";

  if (!docNo.trim()) return;

  const ok = confirm(
    `Повернути за КГ-8 №${docNo}: ${items.length} квитків?\n\n` +
    items.map(x => x.seat).join(", ")
  );

  if (!ok) return;

  const bookingIds = [...new Set(items.map(x => x.booking.id).filter(Boolean))];

  try {
    const meta = await this.loadSeanceMeta();
    const pricing = await this.loadSeancePricing();

    const rows = items.map(x => {
      const price = this.priceForSeat(x.seat, pricing);

      return {
        seat: x.seat,
        price,
        amount: price,
        row: x.row || "",
        place: x.place || ""
      };
    });

    const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const retRes = await fetch(`${SUPABASE_URL}/rest/v1/ticket_returns`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        seance_id: this.state.seanceId,
        organization: partner.name,
        contact_name: partner.contact_name || "",
        phone: partner.phone || "",
        email: partner.email || "",
        doc_no: docNo.trim(),
        seats: items.map(x => x.seat),
        qty: items.length,
        amount: totalAmount,
        note: `КГ-8: ${docNo.trim()}`
      })
    });

    if (!retRes.ok) {
      console.error("ticket_returns insert error:", await retRes.text());
      alert("Не вдалося створити запис КГ-8.");
      return;
    }

    for (const id of bookingIds) {
      await this.patchBooking(id, {
        status: "partner_returned",
        note: `КГ-8: ${docNo.trim()}`
      });
    }

    await this.commitDocNo("kg8", docNo.trim());

    this.openKG8PrintWindow({
      docNo: docNo.trim(),
      meta,
      partner,
      rows
    });

    alert(`Повернено за КГ-8: ${items.length} квитків.`);

    await this.reload();

  } catch (e) {
    console.error("returnSelected error:", e);
    alert("Помилка повернення за КГ-8.");
  }
},
  
  async patchBooking(id, patch) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(patch)
    });

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

  async loadSeanceMeta() {
    const fallback = { show: this.state.seanceId || "", date: "", time: "", id: this.state.seanceId || "" };
    if (!this.state.seanceId) return fallback;

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/seances?id=eq.${encodeURIComponent(this.state.seanceId)}&select=id,show,date,time,venue_id`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        cache: "no-store"
      });

      const arr = await res.json();
      if (Array.isArray(arr) && arr.length) return { ...fallback, ...arr[0] };
      return fallback;

    } catch(e) {
      console.warn("loadSeanceMeta error", e);
      return fallback;
    }
  },

  async loadSeancePricing() {
    const empty = { pricing: {}, seat_overrides: {} };
    if (!this.state.seanceId) return empty;

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/seances_pricing?seance_id=eq.${encodeURIComponent(this.state.seanceId)}&select=pricing,seat_overrides`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        cache: "no-store"
      });

      const arr = await res.json();
      if (Array.isArray(arr) && arr.length) {
        return { pricing: arr[0].pricing || {}, seat_overrides: arr[0].seat_overrides || {} };
      }
      return empty;

    } catch(e) {
      console.warn("loadSeancePricing error", e);
      return empty;
    }
  },

  priceForSeat(seat, cfg) {
    const key = String(seat || "").trim();
    const overrides = cfg?.seat_overrides || {};
    const pricing = cfg?.pricing || {};

    if (overrides[key] && overrides[key].price !== undefined) {
      return Number(overrides[key].price || 0);
    }

    const m = key.match(/^([PAB])([0-9]+)-M([0-9]+)$/i);
    if (!m) return 0;

    const prefix = m[1].toUpperCase();
    const row = Number(m[2]);

    for (const rule in pricing) {
      const rm = String(rule).match(/^([PAB])([0-9]+)-([0-9]+)$/i);
      if (!rm) continue;

      const rPrefix = rm[1].toUpperCase();
      const from = Number(rm[2]);
      const to = Number(rm[3]);

      if (rPrefix === prefix && row >= from && row <= to) {
        return Number(pricing[rule]?.price || 0);
      }
    }

    return 0;
  },

  compactSeatList(seats) {
    const groups = new Map();

    seats.forEach(seat => {
      const s = String(seat || "").trim();
      const m = s.match(/^([A-Za-z]+)([0-9]+)-M([0-9]+)$/);

      if (!m) {
        if (!groups.has("Інше")) groups.set("Інше", []);
        groups.get("Інше").push(s);
        return;
      }

      const zone = m[1].toUpperCase();
      const row = Number(m[2]);
      const place = Number(m[3]);
      const key = `${zone}${row}`;

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(place);
    });

    const parts = [];

    for (const [rowKey, places] of groups.entries()) {
      const nums = places.filter(n => Number.isFinite(n)).sort((a,b) => a - b);
      if (!nums.length) continue;

      const ranges = [];
      let start = nums[0];
      let prev = nums[0];

      for (let i = 1; i < nums.length; i++) {
        const n = nums[i];
        if (n === prev + 1) {
          prev = n;
          continue;
        }
        ranges.push(start === prev ? String(start) : `${start}-${prev}`);
        start = prev = n;
      }

      ranges.push(start === prev ? String(start) : `${start}-${prev}`);
      parts.push(`${rowKey}: ${ranges.join(", ")}`);
    }

    return parts.join("; ");
  },

  groupKG7Rows(rows) {
    const map = new Map();

    rows.forEach(r => {
      const price = Number(r.price || 0);
      const key = String(price);

      if (!map.has(key)) {
        map.set(key, { price, seats: [], count: 0, amount: 0 });
      }

      const g = map.get(key);
      g.seats.push(r.seat);
      g.count += 1;
      g.amount += price;
    });

    return Array.from(map.values()).sort((a,b) => a.price - b.price);
  },

  money(n) {
    return Number(n || 0).toLocaleString("uk-UA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  openKG7PrintWindow({ docNo, meta, rows }) {
    const grouped = this.groupKG7Rows(rows);
    const partner = rows[0]?.organization || rows[0]?.contact_name || "—";
    const contact = rows[0]?.contact_name || "—";
    const totalCount = rows.length;
    const totalAmount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const showTitle = meta?.show || meta?.id || this.state.seanceId || "—";
    const dateTime = [meta?.date, meta?.time].filter(Boolean).join(" ");
    const today = new Date().toLocaleDateString("uk-UA");

    const linesHtml = grouped.map(g => `
      <tr>
        <td>Квитки</td>
        <td>—</td>
        <td class="num">${this.money(g.price)}</td>
        <td>${this.escape(this.compactSeatList(g.seats))}</td>
        <td class="num">${g.count}</td>
        <td class="num">${this.money(g.amount)}</td>
      </tr>
    `).join("");

    const html = `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<title>КГ-7 № ${this.escape(docNo)}</title>
<style>
  body { margin:0; padding:24px; font-family:Arial,sans-serif; color:#111; background:#fff; font-size:13px; }
  .sheet { max-width:1120px; margin:0 auto; }
  .top { display:grid; grid-template-columns:1fr 280px; gap:20px; margin-bottom:22px; }
  .small { font-size:11px; color:#444; line-height:1.35; }
  .form { text-align:right; font-size:12px; line-height:1.35; }
  h1 { margin:18px 0 8px; text-align:center; font-size:20px; text-transform:uppercase; }
  .docline { display:flex; justify-content:center; gap:18px; margin-bottom:18px; font-size:15px; font-weight:700; }
  .row { display:grid; grid-template-columns:130px 1fr; gap:10px; margin:8px 0; }
  .label { color:#444; }
  .value { border-bottom:1px solid #111; min-height:18px; }
  table { width:100%; border-collapse:collapse; margin-top:18px; }
  th, td { border:1px solid #111; padding:7px 8px; vertical-align:top; }
  th { text-align:center; font-size:12px; }
  .num { text-align:right; white-space:nowrap; }
  .totals { margin-top:16px; display:grid; gap:8px; }
  .signs { margin-top:38px; display:grid; grid-template-columns:1fr 1fr; gap:80px; }
  .sign { border-top:1px solid #111; text-align:center; padding-top:6px; font-size:12px; }
  @media print { body { padding:12mm; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div class="small">
        Дніпровський національний академічний український музично-драматичний театр ім. Т. Г. Шевченка<br>
        Ідентифікаційний код за ЄДРПОУ: __________
      </div>
      <div class="form">Форма № КГ-7<br>Накладна на видачу квитків / абонементів</div>
    </div>

    <h1>Накладна на видачу квитків</h1>
    <div class="docline"><div>№ ${this.escape(docNo)}</div><div>від ${this.escape(today)}</div></div>

    <div class="row"><div class="label">Видав</div><div class="value">Квитковий відділ</div></div>
    <div class="row"><div class="label">Одержав</div><div class="value">${this.escape(partner)} / ${this.escape(contact)}</div></div>
    <div class="row"><div class="label">Захід</div><div class="value">${this.escape(showTitle)}</div></div>
    <div class="row"><div class="label">Дата / час</div><div class="value">${this.escape(dateTime)}</div></div>

    <table>
      <thead>
        <tr>
          <th>Вид квитків</th>
          <th>Сектор</th>
          <th>Ціна квитка, грн</th>
          <th>Місця</th>
          <th>Кількість</th>
          <th>Сума, грн</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
        <tr>
          <td colspan="4" class="num"><b>Разом</b></td>
          <td class="num"><b>${totalCount}</b></td>
          <td class="num"><b>${this.money(totalAmount)}</b></td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div><b>Усього кількість:</b> ${totalCount}</div>
      <div><b>Усього на суму:</b> ${this.money(totalAmount)} грн</div>
    </div>

    <div class="signs"><div class="sign">Видав</div><div class="sign">Одержав</div></div>
  </div>
</body>
</html>`;

    const oldFrame = document.getElementById("va-kg7-print-frame");
    if (oldFrame) oldFrame.remove();

    const frame = document.createElement("iframe");
    frame.id = "va-kg7-print-frame";
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.style.opacity = "0";

    document.body.appendChild(frame);

    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (e) {
        console.error("KG-7 print error:", e);
        alert("Не вдалося відкрити друк КГ-7.");
      }
    }, 600);
  },

openKG8PrintWindow({ docNo, meta, partner, rows }) {
  const groups = this.groupKG7Rows(rows);
  const totalQty = rows.length;
  const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const today = new Date().toLocaleDateString("uk-UA");

  const showTitle =
    meta?.title ||
    meta?.show_title ||
    meta?.name ||
    "Сеанс";

  const showDate =
    meta?.date ||
    meta?.show_date ||
    meta?.starts_at ||
    "";

  const partnerName =
    partner?.name || "";

  const contactName =
    partner?.contact_name || "";

  const html = `
<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <title>КГ-8 №${this.escape(docNo)}</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      color: #111;
      margin: 24px;
      font-size: 14px;
    }

    .top {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 18px;
    }

    .small {
      font-size: 12px;
      color: #444;
      line-height: 1.4;
    }

    h1 {
      text-align: center;
      font-size: 20px;
      margin: 18px 0 6px;
      text-transform: uppercase;
    }

    .docno {
      text-align: center;
      font-size: 16px;
      margin-bottom: 18px;
      font-weight: bold;
    }

    .meta {
      margin: 14px 0 18px;
      line-height: 1.7;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
    }

    th,
    td {
      border: 1px solid #222;
      padding: 7px 8px;
      vertical-align: top;
    }

    th {
      text-align: center;
      background: #f2f2f2;
    }

    td.num {
      text-align: right;
      white-space: nowrap;
    }

    td.center {
      text-align: center;
    }

    .totals {
      margin-top: 14px;
      text-align: right;
      font-weight: bold;
    }

    .signs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      margin-top: 54px;
    }

    .sign-line {
      border-top: 1px solid #111;
      padding-top: 7px;
      text-align: center;
      font-size: 13px;
    }

    @media print {
      body {
        margin: 14mm;
      }
    }
  </style>
</head>
<body>

  <div class="top">
    <div class="small">
      Ваш Адмін<br>
      Облік руху квитків
    </div>
    <div class="small" style="text-align:right;">
      Дата: ${this.escape(today)}<br>
      Документ: КГ-8
    </div>
  </div>

  <h1>Акт повернення квитків</h1>
  <div class="docno">КГ-8 № ${this.escape(docNo)}</div>

  <div class="meta">
    <div><b>Комісіонер / уповноважений:</b> ${this.escape(partnerName)}</div>
    <div><b>Контактна особа:</b> ${this.escape(contactName)}</div>
    <div><b>Сеанс:</b> ${this.escape(showTitle)}</div>
    <div><b>Дата / час сеансу:</b> ${this.escape(showDate)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:50px;">№</th>
        <th>Місця</th>
        <th style="width:90px;">К-сть</th>
        <th style="width:110px;">Ціна</th>
        <th style="width:120px;">Сума</th>
      </tr>
    </thead>
    <tbody>
      ${groups.map((g, i) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${this.escape(g.label)}</td>
          <td class="num">${g.qty}</td>
          <td class="num">${this.money(g.price)}</td>
          <td class="num">${this.money(g.amount)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    Разом: ${totalQty} квитків / ${this.money(totalAmount)}
  </div>

  <div class="signs">
    <div class="sign-line">
      Здав комісіонер / уповноважений
    </div>
    <div class="sign-line">
      Прийняв представник театру
    </div>
  </div>

  <script>
    window.onload = function(){
      setTimeout(function(){
        window.focus();
        window.print();
      }, 300);
    };
  </script>

</body>
</html>
`;

  const oldFrame = document.getElementById("va-kg8-print-frame");
  if (oldFrame) oldFrame.remove();

  const frame = document.createElement("iframe");
  frame.id = "va-kg8-print-frame";
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";

  document.body.appendChild(frame);

  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (e) {
      console.error("KG-8 print error:", e);
      alert("Не вдалося відкрити друк КГ-8.");
    }
  }, 600);
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
