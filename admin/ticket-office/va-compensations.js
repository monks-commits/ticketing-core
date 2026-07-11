window.VACompensations = {
  state: {
    targetId: "",
    seanceId: "",
    events: [],
    tokens: [],
    audit: []
  },

  async render({ targetId, seanceId }) {
    this.state.targetId = targetId;
    this.state.seanceId = seanceId || "";

    const target = document.getElementById(targetId);
    if (!target) return;

    if (!this.state.seanceId) {
      target.innerHTML = `
        <div class="stub">
          <h3>Компенсації</h3>
          <p>Оберіть сеанс.</p>
        </div>
      `;
      return;
    }

    target.innerHTML = `
      <div class="stub">
        <h3>Компенсації</h3>
        <p>Завантаження компенсацій...</p>
      </div>
    `;

    try {
      await this.load();
      this.draw();
    } catch (e) {
      console.error("VACompensations render error:", e);
      target.innerHTML = `
        <div class="stub">
          <h3>Компенсації</h3>
          <p>Помилка завантаження компенсацій.</p>
          <pre style="white-space:pre-wrap;color:#ffb4b4;">${this.escape(e.message || e)}</pre>
        </div>
      `;
    }
  },

  async load() {
    const seanceId = this.state.seanceId;

    const eventsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/recovery_events?source_seance_id=eq.${encodeURIComponent(seanceId)}&select=*&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        cache: "no-store"
      }
    );

    if (!eventsRes.ok) {
      throw new Error(await eventsRes.text());
    }

    const events = await eventsRes.json();
    this.state.events = Array.isArray(events) ? events : [];

    const eventIds = this.state.events.map(e => e.id).filter(Boolean);

    if (!eventIds.length) {
      this.state.tokens = [];
      this.state.audit = [];
      return;
    }

    const inList = eventIds.map(id => `"${String(id).replace(/"/g, "")}"`).join(",");

    const tokensRes = await fetch(
      `${SUPABASE_URL}/rest/v1/recovery_tokens?recovery_event_id=in.(${inList})&select=*&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        cache: "no-store"
      }
    );

    if (!tokensRes.ok) {
      throw new Error(await tokensRes.text());
    }

    const tokens = await tokensRes.json();
    this.state.tokens = Array.isArray(tokens) ? tokens : [];

    const auditRes = await fetch(
      `${SUPABASE_URL}/rest/v1/recovery_audit?recovery_event_id=in.(${inList})&select=*&order=created_at.desc&limit=200`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        cache: "no-store"
      }
    );

    if (auditRes.ok) {
      const audit = await auditRes.json();
      this.state.audit = Array.isArray(audit) ? audit : [];
    } else {
      this.state.audit = [];
      console.warn("recovery_audit load error:", await auditRes.text());
    }
  },

  draw() {
    const target = document.getElementById(this.state.targetId);
    if (!target) return;

    const events = this.state.events || [];
    const tokens = this.state.tokens || [];
    const audit = this.state.audit || [];

    const total = tokens.length;
    const used = tokens.filter(t => t.compensation_used === true).length;
    const unused = Math.max(total - used, 0);

    const ok = audit.filter(a => a.result === "OK").length;
    const already = audit.filter(a => a.result === "ALREADY_USED").length;
    const notFound = audit.filter(a => a.result === "NOT_FOUND").length;

    const lastEvent = events[0] || null;

    const rowsHtml = tokens.length
      ? tokens.map(t => `
        <tr>
          <td style="padding:8px;">
            <b>${this.escape(t.token || "—")}</b>
          </td>

          <td style="padding:8px;">
            ${this.escape(t.owner_name || "—")}
          </td>

          <td style="padding:8px;">
            ${this.escape(t.source_seat_label || t.seat_label || "без місця")}
          </td>

          <td style="padding:8px;">
            ${t.compensation_used === true
              ? `<span style="color:#22c55e;font-weight:800;">Використано</span>`
              : `<span style="color:#f5b400;font-weight:800;">Не використано</span>`
            }
          </td>

          <td style="padding:8px;">
            ${this.escape(this.formatDate(t.compensation_used_at || t.used_at || ""))}
          </td>

          <td style="padding:8px;">
            ${this.escape(t.compensation_used_by || t.used_by || "—")}
          </td>

          <td style="padding:8px;">
            ${this.escape(t.note || "—")}
          </td>
        </tr>
      `).join("")
      : `
        <tr>
          <td colspan="7" style="padding:14px 8px;">
            Для цього сеансу компенсації ще не створені.
          </td>
        </tr>
      `;

    const auditHtml = audit.length
      ? audit.slice(0, 20).map(a => `
        <tr>
          <td style="padding:8px;">${this.escape(this.formatDate(a.created_at))}</td>
          <td style="padding:8px;">${this.escape(a.token || "—")}</td>
          <td style="padding:8px;">${this.badge(a.result)}</td>
          <td style="padding:8px;">${this.escape(a.scanned_by || "—")}</td>
          <td style="padding:8px;">${this.escape(a.action || "—")}</td>
        </tr>
      `).join("")
      : `
        <tr>
          <td colspan="5" style="padding:14px 8px;">
            Журнал погашення поки порожній.
          </td>
        </tr>
      `;

    target.innerHTML = `
      <div class="stub">
        <h3>Компенсації</h3>
        <p class="note">
          Компенсаційний прохід — це право входу без місця. 
          Створюється тільки по погашених квитках перерваного заходу.
        </p>
      </div>

      <div class="stub-grid" style="margin-top:14px;">
        <div class="stub">
          <h4>Створено компенсацій</h4>
          <b>${total}</b>
        </div>

        <div class="stub">
          <h4>Використано</h4>
          <b>${used}</b>
        </div>

        <div class="stub">
          <h4>Не використано</h4>
          <b>${unused}</b>
        </div>

        <div class="stub">
          <h4>Повторні спроби</h4>
          <b>${already}</b>
        </div>
      </div>

      <div class="stub-grid" style="margin-top:14px;">
        <div class="stub">
          <h4>OK сканувань</h4>
          <b>${ok}</b>
        </div>

        <div class="stub">
          <h4>Не знайдено</h4>
          <b>${notFound}</b>
        </div>

        <div class="stub">
          <h4>Recovery event</h4>
          <b style="font-size:13px;word-break:break-all;">${this.escape(lastEvent?.id || "—")}</b>
        </div>

        <div class="stub">
          <h4>Політика</h4>
          <b>${this.escape(lastEvent?.target_policy || "any_repertoire")}</b>
        </div>
      </div>

      <div class="stub" style="margin-top:14px;">
        <h4>Журнал компенсаційних прав</h4>

        <div style="overflow:auto;margin-top:12px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="text-align:left;color:#b8c4d6;">
                <th style="padding:8px;">Token</th>
                <th style="padding:8px;">Глядач</th>
                <th style="padding:8px;">Старе місце</th>
                <th style="padding:8px;">Статус</th>
                <th style="padding:8px;">Погашено</th>
                <th style="padding:8px;">Сканер</th>
                <th style="padding:8px;">Примітка</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <div class="stub" style="margin-top:14px;">
        <h4>Останні сканування Recovery</h4>

        <div style="overflow:auto;margin-top:12px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="text-align:left;color:#b8c4d6;">
                <th style="padding:8px;">Час</th>
                <th style="padding:8px;">Token</th>
                <th style="padding:8px;">Результат</th>
                <th style="padding:8px;">Сканер</th>
                <th style="padding:8px;">Дія</th>
              </tr>
            </thead>
            <tbody>
              ${auditHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  badge(result) {
    const r = String(result || "").trim();

    if (r === "OK") {
      return `<span style="color:#22c55e;font-weight:800;">OK</span>`;
    }

    if (r === "ALREADY_USED") {
      return `<span style="color:#f59e0b;font-weight:800;">ВЖЕ ВИКОРИСТАНО</span>`;
    }

    if (r === "NOT_FOUND") {
      return `<span style="color:#ef4444;font-weight:800;">НЕ ЗНАЙДЕНО</span>`;
    }

    return this.escape(r || "—");
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
