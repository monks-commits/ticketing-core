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

byId("partnerPrintKG7")?.addEventListener("click", () => {
  this.printKG7Selected();
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

async printKG7Selected() {
  const items = this.selectedItems();

  if (!items.length) {
    alert("Оберіть квитки для друку КГ-7.");
    return;
  }

  const docNo = prompt("Номер накладної КГ-7:", "") || "";
  if (!docNo) return;

  // ВАЖНО: окно открываем сразу после клика,
  // иначе браузер считает это pop-up и блокирует.
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Браузер заблокував вікно друку. Дозвольте pop-up для цього сайту.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html lang="uk">
    <head>
      <meta charset="utf-8">
      <title>Підготовка КГ-7</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 30px;
        }
      </style>
    </head>
    <body>
      <h2>Формую КГ-7...</h2>
    </body>
    </html>
  `);
  printWindow.document.close();

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
      note: item.note || ""
    };
  });

  this.openKG7PrintWindow({
    docNo,
    meta,
    rows,
    printWindow
  });
},
async loadSeanceMeta() {
  const fallback = {
    show: this.state.seanceId || "",
    date: "",
    time: "",
    id: this.state.seanceId || ""
  };

  if (!this.state.seanceId) return fallback;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/seances?id=eq.${encodeURIComponent(this.state.seanceId)}&select=id,show,date,time,venue_id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        cache: "no-store"
      }
    );

    const arr = await res.json();

    if (Array.isArray(arr) && arr.length) {
      return {
        ...fallback,
        ...arr[0]
      };
    }

    return fallback;

  } catch(e) {
    console.warn("loadSeanceMeta error", e);
    return fallback;
  }
},

async loadSeancePricing() {
  const empty = {
    pricing: {},
    seat_overrides: {}
  };

  if (!this.state.seanceId) return empty;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/seances_pricing?seance_id=eq.${encodeURIComponent(this.state.seanceId)}&select=pricing,seat_overrides`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        cache: "no-store"
      }
    );

    const arr = await res.json();

    if (Array.isArray(arr) && arr.length) {
      return {
        pricing: arr[0].pricing || {},
        seat_overrides: arr[0].seat_overrides || {}
      };
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

  const m = key.match(/^([PAB])(\d+)-M(\d+)$/i);
  if (!m) return 0;

  const prefix = m[1].toUpperCase();
  const row = Number(m[2]);

  for (const rule in pricing) {
    const rm = String(rule).match(/^([PAB])(\d+)-(\d+)$/i);
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
    const m = s.match(/^([A-Za-z]+)(\d+)-M(\d+)$/);

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
    const nums = places
      .filter(n => Number.isFinite(n))
      .sort((a,b) => a - b);

    if (!nums.length) {
      parts.push(`${rowKey}: ${places.join(", ")}`);
      continue;
    }

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
      map.set(key, {
        price,
        seats: [],
        count: 0,
        amount: 0
      });
    }

    const g = map.get(key);
    g.seats.push(r.seat);
    g.count += 1;
    g.amount += price;
  });

  return Array.from(map.values())
    .sort((a,b) => a.price - b.price);
},

money(n) {
  return Number(n || 0).toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
},

openKG7PrintWindow({ docNo, meta, rows, printWindow = null }) {
  const grouped = this.groupKG7Rows(rows);

  const partner =
    rows[0]?.organization ||
    rows[0]?.contact_name ||
    "—";

  const contact =
    rows[0]?.contact_name || "—";

  const totalCount = rows.length;
  const totalAmount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  const showTitle = meta?.show || meta?.id || this.state.seanceId || "—";

  const dateTime = [meta?.date, meta?.time]
    .filter(Boolean)
    .join(" ");

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
  body {
    margin: 0;
    padding: 24px;
    font-family: Arial, sans-serif;
    color: #111;
    background: #fff;
    font-size: 13px;
  }

  .sheet {
    max-width: 1120px;
    margin: 0 auto;
  }

  .top {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 20px;
    margin-bottom: 22px;
  }

  .small {
    font-size: 11px;
    color: #444;
    line-height: 1.35;
  }

  .form {
    text-align: right;
    font-size: 12px;
    line-height: 1.35;
  }

  h1 {
    margin: 18px 0 8px;
    text-align: center;
    font-size: 20px;
    text-transform: uppercase;
  }

  .docline {
    display: flex;
    justify-content: center;
    gap: 18px;
    margin-bottom: 18px;
    font-size: 15px;
    font-weight: 700;
  }

  .row {
    display: grid;
    grid-template-columns: 130px 1fr;
    gap: 10px;
    margin: 8px 0;
  }

  .label {
    color: #444;
  }

  .value {
    border-bottom: 1px solid #111;
    min-height: 18px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 18px;
  }

  th, td {
    border: 1px solid #111;
    padding: 7px 8px;
    vertical-align: top;
  }

  th {
    text-align: center;
    font-size: 12px;
  }

  .num {
    text-align: right;
    white-space: nowrap;
  }

  .totals {
    margin-top: 16px;
    display: grid;
    gap: 8px;
  }

  .signs {
    margin-top: 38px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
  }

  .sign {
    border-top: 1px solid #111;
    text-align: center;
    padding-top: 6px;
    font-size: 12px;
  }

  @media print {
    body {
      padding: 12mm;
    }
  }
</style>
</head>

<body>
  <div class="sheet">

    <div class="top">
      <div class="small">
        Дніпровський національний академічний український музично-драматичний театр ім. Т. Г. Шевченка<br>
        Ідентифікаційний код за ЄДРПОУ: __________
      </div>

      <div class="form">
        Форма № КГ-7<br>
        Накладна на видачу квитків / абонементів
      </div>
    </div>

    <h1>Накладна на видачу квитків</h1>

    <div class="docline">
      <div>№ ${this.escape(docNo)}</div>
      <div>від ${this.escape(today)}</div>
    </div>

    <div class="row">
      <div class="label">Видав</div>
      <div class="value">Квитковий відділ</div>
    </div>

    <div class="row">
      <div class="label">Одержав</div>
      <div class="value">${this.escape(partner)} / ${this.escape(contact)}</div>
    </div>

    <div class="row">
      <div class="label">Захід</div>
      <div class="value">${this.escape(showTitle)}</div>
    </div>

    <div class="row">
      <div class="label">Дата / час</div>
      <div class="value">${this.escape(dateTime)}</div>
    </div>

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

    <div class="signs">
      <div class="sign">Видав</div>
      <div class="sign">Одержав</div>
    </div>

  </div>

  <script>
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 400);
    });
  <\/script>
</body>
</html>`;

  const w = window.open("", "_blank");

  if (!w) {
    alert("Браузер заблокував вікно друку.");
    return;
  }

  w.document.open();
  w.document.write(html);
  w.document.close();
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
