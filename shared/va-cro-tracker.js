/* ==========================================================================
   VA CRO Tracker V1
   Anonymous first-party funnel tracking for VA ticket sales.

   It does NOT store buyer name, email or phone.
   It does NOT modify bookings, LiqPay callback, Gateway or tickets.

   Persistent identity:
     localStorage  -> va_cro_visitor_id_v1
   Purchase session:
     sessionStorage -> va_cro_session_id_v1
   First source snapshot:
     sessionStorage -> va_cro_source_v1

   Default backend is current VA Supabase.
   A white-label/client platform may override BEFORE loading this file:

     window.VA_CRO_CONFIG = {
       supabaseUrl: "https://....supabase.co",
       anonKey: "sb_publishable_..."
     };
   ========================================================================== */

(() => {
  "use strict";

  const VERSION = "1.1.0";

  const DEFAULT_CONFIG = Object.freeze({
    supabaseUrl: "https://fhusjlkneckbvnrdhbil.supabase.co",
    anonKey: "sb_publishable_nCCfptJOb8Lzy1uAwGBJzA_OJtDneTS"
  });

  const VISITOR_KEY = "va_cro_visitor_id_v1";
  const SESSION_KEY = "va_cro_session_id_v1";
  const SOURCE_KEY = "va_cro_source_v1";
  const SOURCE_TOUCH_KEY = "va_cro_source_touch_sent_v1";
  const EXPERIMENT_KEY = "va_ab_experiment_v1";

  const ALLOWED_EVENTS = new Set([
    "source_touch",
    "experiment_exposure",
    "hall_open",
    "seat_selected",
    "order_open",
    "checkout_open",
    "payment_started",
    "payment_init_error",
    "technical_error"
  ]);

  function clean(value, max = 200) {
    return String(value == null ? "" : value).trim().slice(0, max);
  }

  function uuid() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

    // RFC4122-shaped fallback for older browsers.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getStorage(storage, key) {
    try {
      return storage.getItem(key) || "";
    } catch {
      return "";
    }
  }

  function setStorage(storage, key, value) {
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function ensureUuid(storage, key) {
    const existing = getStorage(storage, key);
    if (/^[0-9a-f-]{36}$/i.test(existing)) return existing;

    const next = uuid();
    setStorage(storage, key, next);
    return next;
  }

  function visitorId() {
    return ensureUuid(localStorage, VISITOR_KEY);
  }

  function sessionId() {
    return ensureUuid(sessionStorage, SESSION_KEY);
  }

  function safeJsonParse(raw) {
    try {
      const parsed = JSON.parse(raw || "null");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function marketingContext() {
    return safeJsonParse(
      getStorage(sessionStorage, "va_marketing_attribution_v1")
    ) || {};
  }

  function refCodeFromExistingVA() {
    const qs = new URLSearchParams(location.search);
    return clean(
      qs.get("ref") ||
      getStorage(sessionStorage, "va_ref_code") ||
      "",
      120
    );
  }

  function externalReferrerHost() {
    const raw = document.referrer || "";
    if (!raw) return "";

    try {
      const u = new URL(raw);
      const host = clean(u.hostname, 255);
      const currentHost = clean(location.hostname || "", 255);
      if (!host || (currentHost && host === currentHost)) return "";
      return host;
    } catch {
      return "";
    }
  }


  function experimentContext() {
    const qs = new URLSearchParams(location.search);

    const urlExperimentId = clean(
      qs.get("experiment_id") || qs.get("exp_id") || "",
      160
    );

    const urlVariant = clean(
      qs.get("ab_variant") || qs.get("variant") || "",
      8
    ).toUpperCase();

    const saved = safeJsonParse(
      getStorage(sessionStorage, EXPERIMENT_KEY)
    ) || {};

    const experimentId =
      urlExperimentId ||
      clean(saved.experiment_id || "", 160);

    const variant =
      (urlVariant === "A" || urlVariant === "B")
        ? urlVariant
        : clean(saved.variant || "", 8).toUpperCase();

    if (experimentId && (variant === "A" || variant === "B")) {
      const next = {
        experiment_id: experimentId,
        variant,
        seance_id: clean(
          qs.get("seance") ||
          qs.get("seance_id") ||
          saved.seance_id ||
          "",
          200
        ) || null,
        assigned_at: saved.assigned_at || new Date().toISOString()
      };

      setStorage(sessionStorage, EXPERIMENT_KEY, JSON.stringify(next));
      return next;
    }

    return {};
  }

  function deviceType() {
    const ua = navigator.userAgent || "";
    const w = Math.max(
      Number(window.innerWidth || 0),
      Number(screen?.width || 0)
    );

    if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return "tablet";
    if (/Mobi|iPhone|Android/i.test(ua) || (w > 0 && w <= 767)) return "mobile";
    if (w >= 768) return "desktop";
    return "unknown";
  }

  function currentSourceCandidate() {
    const qs = new URLSearchParams(location.search);
    const marketing = marketingContext();

    const campaignId = clean(
      qs.get("campaign_id") ||
      marketing.campaign_id ||
      "",
      160
    );

    const refCode = refCodeFromExistingVA();

    const utmSource = clean(
      qs.get("utm_source") ||
      marketing.utm_source ||
      "",
      120
    );

    const utmMedium = clean(
      qs.get("utm_medium") ||
      marketing.utm_medium ||
      "",
      120
    );

    const utmCampaign = clean(
      qs.get("utm_campaign") ||
      marketing.utm_campaign ||
      "",
      160
    );

    return {
      campaign_id: campaignId || null,
      ref_code: refCode || null,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      referrer_host: externalReferrerHost() || null,
      entry_path: clean(
        location.pathname + location.search,
        500
      ) || null,
      captured_at: new Date().toISOString()
    };
  }

  function sourceContext() {
    const saved = safeJsonParse(getStorage(sessionStorage, SOURCE_KEY));

    if (saved) {
      // Existing VA attribution may appear one redirect later.
      // Fill only missing fields; never overwrite the first known source.
      const now = currentSourceCandidate();
      const merged = {
        ...saved,
        campaign_id: saved.campaign_id || now.campaign_id || null,
        ref_code: saved.ref_code || now.ref_code || null,
        utm_source: saved.utm_source || now.utm_source || null,
        utm_medium: saved.utm_medium || now.utm_medium || null,
        utm_campaign: saved.utm_campaign || now.utm_campaign || null,
        referrer_host: saved.referrer_host || now.referrer_host || null
      };
      setStorage(sessionStorage, SOURCE_KEY, JSON.stringify(merged));
      return merged;
    }

    const first = currentSourceCandidate();
    setStorage(sessionStorage, SOURCE_KEY, JSON.stringify(first));
    return first;
  }

  function config() {
    const override =
      globalThis.VA_CRO_CONFIG &&
      typeof globalThis.VA_CRO_CONFIG === "object"
        ? globalThis.VA_CRO_CONFIG
        : {};

    return {
      supabaseUrl: clean(
        override.supabaseUrl || DEFAULT_CONFIG.supabaseUrl,
        500
      ).replace(/\/+$/, ""),
      anonKey: clean(
        override.anonKey || DEFAULT_CONFIG.anonKey,
        1000
      )
    };
  }

  async function send(row) {
    const cfg = config();
    if (!cfg.supabaseUrl || !cfg.anonKey) return false;

    try {
      const response = await fetch(
        `${cfg.supabaseUrl}/rest/v1/cro_events`,
        {
          method: "POST",
          keepalive: true,
          headers: {
            // Supabase publishable keys authenticate the anonymous API role
            // through the apikey header. They are NOT bearer JWTs.
            apikey: cfg.anonKey,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          },
          body: JSON.stringify(row)
        }
      );

      if (!response.ok) {
        let details = "";
        try { details = await response.text(); } catch (_) {}
        console.warn("VA CRO insert failed", response.status, details);
        return false;
      }

      return true;
    } catch (error) {
      // Analytics must never break ticket sale.
      console.warn("VA CRO unavailable", error);
      return false;
    }
  }

  function baseRow(eventName, data = {}) {
    const source = sourceContext();

    const seanceId = clean(
      data.seance_id ||
      data.seance ||
      new URLSearchParams(location.search).get("seance") ||
      new URLSearchParams(location.search).get("seance_id") ||
      "",
      200
    );

    const pageCode = clean(
      data.page_code ||
      document.body?.dataset?.croPage ||
      location.pathname.split("/").pop() ||
      "",
      80
    );

    const seatCountRaw =
      data.seat_count == null ? null : Number(data.seat_count);

    const amountRaw =
      data.amount == null ? null : Number(data.amount);

    const metadata =
      data.metadata &&
      typeof data.metadata === "object" &&
      !Array.isArray(data.metadata)
        ? data.metadata
        : {};

    return {
      visitor_id: visitorId(),
      session_id: sessionId(),
      event_name: eventName,
      seance_id: seanceId || null,
      page_code: pageCode || null,

      campaign_id: source.campaign_id || null,
      ref_code: source.ref_code || null,
      utm_source: source.utm_source || null,
      utm_medium: source.utm_medium || null,
      utm_campaign: source.utm_campaign || null,

      referrer_host: source.referrer_host || null,
      entry_path: source.entry_path || null,

      idempotency_key: clean(data.idempotency_key || "", 200) || null,
      order_id: clean(data.order_id || "", 200) || null,

      seat_count:
        Number.isFinite(seatCountRaw) && seatCountRaw >= 0
          ? Math.trunc(seatCountRaw)
          : null,

      amount:
        Number.isFinite(amountRaw) && amountRaw >= 0
          ? Math.round(amountRaw * 100) / 100
          : null,

      device_type: deviceType(),

      experiment_id: clean(
        data.experiment_id ||
        experimentContext().experiment_id ||
        "",
        160
      ) || null,

      experiment_variant: clean(
        data.experiment_variant ||
        data.variant ||
        experimentContext().variant ||
        "",
        8
      ).toUpperCase() || null,

      metadata: {
        tracker_version: VERSION,
        ...metadata
      }
    };
  }

  function track(eventName, data = {}) {
    const name = clean(eventName, 64);

    if (!ALLOWED_EVENTS.has(name)) {
      console.warn("VA CRO ignored unknown event:", name);
      return Promise.resolve(false);
    }

    return send(baseRow(name, data));
  }

  function sourceTouch(data = {}) {
    if (getStorage(sessionStorage, SOURCE_TOUCH_KEY) === "1") {
      return Promise.resolve(false);
    }

    // Mark first so repeated page loads cannot create a storm.
    setStorage(sessionStorage, SOURCE_TOUCH_KEY, "1");

    return track("source_touch", {
      page_code: data.page_code,
      seance_id: data.seance_id || data.seance || null,
      metadata: data.metadata || {}
    });
  }

  function getIdentity() {
    return Object.freeze({
      visitor_id: visitorId(),
      session_id: sessionId()
    });
  }

  function getSource() {
    return Object.freeze({ ...sourceContext() });
  }

  // Capture the first source as soon as the tracker is loaded.
  // This is intentionally fire-and-forget.
  sourceTouch().catch(() => {});

  globalThis.VACRO = Object.freeze({
    version: VERSION,
    track,
    sourceTouch,
    identity: getIdentity,
    source: getSource
  });
})();
