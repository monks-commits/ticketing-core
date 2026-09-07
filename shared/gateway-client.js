/*
  VA -> Universal Gateway browser client
  Version: 3.0-browser

  Public file. Contains NO Gateway secret.

  Route:
    VA storefront / VA Hall
      -> VA Edge Function: philharmonic-gateway-client
      -> Philharmonic Gateway
      -> venue-connector V5
      -> Philharmonic DB

  Compatible with current VA pages:
    index.html:
      VA_GATEWAY.listSeances()

    hall.html:
      VA_GATEWAY.getOrCreateHoldRef(seanceId)
      VA_GATEWAY.stateRead(seanceId, holdRef)
      VA_GATEWAY.setHold(seanceId, holdRef, seatKeys)
      VA_GATEWAY.releaseHold(seanceId, holdRef)

    checkout.html:
      VA_GATEWAY.existingHoldRef(seanceId)
      VA_GATEWAY.stateRead(seanceId, holdRef)
*/

(() => {
  "use strict";

  const CLIENT_URL =
    "https://fhusjlkneckbvnrdhbil.supabase.co/functions/v1/philharmonic-gateway-client";

  const VERSION = "3.2-universal-list";
  // Existing state/hold/release transport stays on the proven adapter.
  // Only seance discovery is switched to the Universal Gateway path.
  const SAAS_SUPABASE_URL =
    "https://fhusjlkneckbvnrdhbil.supabase.co";

  const SAAS_ANON_KEY =
    "sb_publishable_nCCfptJOb8Lzy1uAwGBJzA_OJtDneTS";

  const UNIVERSAL_GATEWAY_URL =
    `${SAAS_SUPABASE_URL}/functions/v1/gateway-saas-universal`;

  const VENUE_CATALOG_URL =
    "https://lyvdrqilglqwkmajmbai.supabase.co/functions/v1/venue-demo-catalog";

  function text(value) {
    return String(value ?? "").trim();
  }

  function cityCode(value) {
    const raw = text(value);
    if (!raw) return "";

    const normalized = raw
      .toLocaleLowerCase("uk-UA")
      .replace(/[’']/g, "")
      .replace(/[^a-zа-яіїєґ0-9]+/gi, " ")
      .trim();

    if (normalized === "дніпро" || normalized === "dnipro") return "dnipro";
    if (
      normalized === "кривий ріг" ||
      normalized === "кривой рог" ||
      normalized === "kryvyi rih"
    ) return "kryvyi-rih";

    return normalized
      .replace(/[а-яіїєґ]+/gi, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  async function requestUniversalSeances(venueId) {
    const response = await fetch(UNIVERSAL_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SAAS_ANON_KEY,
        Authorization: `Bearer ${SAAS_ANON_KEY}`
      },
      body: JSON.stringify({
        action: "seances",
        venue_id: venueId
      }),
      cache: "no-store"
    });

    const data = await readJson(response);

    if (!response.ok || data?.ok === false) {
      throw gatewayError(
        data?.error ||
        data?.message ||
        `gateway_http_${response.status}`,
        data,
        response.status
      );
    }

    return data;
  }

  async function readVenueCatalog() {
    const response = await fetch(
      `${VENUE_CATALOG_URL}?_=${Date.now()}`,
      { cache: "no-store" }
    );

    const data = await readJson(response);

    if (!response.ok || data?.ok === false) {
      throw gatewayError(
        data?.error ||
        data?.message ||
        `catalog_http_${response.status}`,
        data,
        response.status
      );
    }

    return data;
  }

  function validUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(text(value));
  }

  function holdStorageKey(seanceId) {
    return `va-philharmonic-hold-ref:${text(seanceId)}`;
  }

  function existingHoldRef(seanceId) {
    const id = text(seanceId);
    if (!id) return "";

    const value = text(localStorage.getItem(holdStorageKey(id)));
    return validUuid(value) ? value : "";
  }

  function getOrCreateHoldRef(seanceId) {
    const id = text(seanceId);
    if (!id) {
      throw new Error("gateway_seance_id_required");
    }

    const existing = existingHoldRef(id);
    if (existing) return existing;

    const value = crypto.randomUUID();
    localStorage.setItem(holdStorageKey(id), value);
    return value;
  }

  function forgetHoldRef(seanceId) {
    const id = text(seanceId);
    if (!id) return;
    localStorage.removeItem(holdStorageKey(id));
  }

  async function readJson(response) {
    const raw = await response.text();

    if (!raw) return {};

    try {
      return JSON.parse(raw);
    } catch {
      const error = new Error("gateway_invalid_json_response");
      error.status = response.status;
      error.raw = raw;
      throw error;
    }
  }

  function gatewayError(message, data, status) {
    const error = new Error(message || "gateway_request_failed");
    error.data = data || null;
    error.status = status || 0;
    return error;
  }

  async function request(url, options = {}) {
    let response;

    try {
      response = await fetch(url, {
        cache: "no-store",
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {})
        }
      });
    } catch (cause) {
      const error = gatewayError("gateway_network_error", null, 0);
      error.cause = cause;
      throw error;
    }

    const data = await readJson(response);

    if (!response.ok || data?.ok === false) {
      throw gatewayError(
        data?.error ||
        data?.message ||
        `gateway_http_${response.status}`,
        data,
        response.status
      );
    }

    return data;
  }

  function requireSucceeded(data, fallbackMessage) {
    const result = text(data?.result);

    if (result && result !== "succeeded") {
      throw gatewayError(
        data?.response_code ||
        data?.failure_code ||
        fallbackMessage ||
        "gateway_operation_rejected",
        data,
        409
      );
    }

    return data;
  }

  function normalizeSeance(row, venueMeta = null) {
    const venueCode =
      text(row?.gateway_venue_code) ||
      text(row?.venue_id) ||
      text(venueMeta?.id) ||
      text(venueMeta?.slug);

    return {
      ...row,

      id: text(row?.id),
      show: text(row?.show) || "Подія",
      date: text(row?.date),
      time: text(row?.time),
      status: text(row?.status) || "published",

      venue_id: venueCode,
      hall_id: text(row?.hall_id),
      hall: row?.hall ?? null,

      active: true,
      gateway_source: true,
      gateway_venue_code: venueCode,

      venue_name:
        text(row?.venue_name) ||
        text(row?.venue?.name) ||
        text(venueMeta?.name) ||
        text(venueMeta?.title) ||
        venueCode,

      city_code:
        text(row?.city_code) ||
        text(row?.venue?.city_code) ||
        text(venueMeta?.city_code) ||
        cityCode(row?.venue?.city) ||
        cityCode(venueMeta?.city)
    };
  }

  async function listSeances() {
    /*
      Universal discovery:
        Venue Catalog
          -> every active venue_id
          -> gateway-saas-universal(action=seances, venue_id)
          -> only Gateway-authorized seances are returned.

      State/HOLD/release below stay on the already proven transport.
    */
    try {
      const catalog = await readVenueCatalog();

      const venues =
        Array.isArray(catalog?.venues)
          ? catalog.venues.filter(v => v?.is_active !== false)
          : [];

      const results = await Promise.allSettled(
        venues.map(async venue => {
          const venueId =
            text(venue?.id) ||
            text(venue?.slug);

          if (!venueId) return [];

          const data = await requestUniversalSeances(venueId);

          const rows =
            Array.isArray(data?.seances)
              ? data.seances
              : [];

          return rows
            .map(row => normalizeSeance(row, venue))
            .filter(item => item.id && item.venue_id);
        })
      );

      const seances = results.flatMap(result =>
        result.status === "fulfilled"
          ? result.value
          : []
      );

      return {
        ok: true,
        service: "va-universal-gateway-browser-client",
        mode: "catalog+universal-gateway",
        seances,
        count: seances.length,
        browser_client_version: VERSION
      };
    } catch (universalError) {
      console.warn(
        "[VA Gateway] universal seance discovery failed; legacy fallback",
        universalError
      );

      // Emergency compatibility only: preserve the previously working
      // Philharmonic adapter if catalog/universal discovery is unavailable.
      const data = await request(
        `${CLIENT_URL}?action=seances&_=${Date.now()}`
      );

      const seances = Array.isArray(data?.seances)
        ? data.seances
            .map(row => normalizeSeance(row, {
              id: text(row?.venue_id) || "filarmoniya",
              name: text(row?.venue_name) || "Дніпровська філармонія",
              city_code: text(row?.city_code) || "dnipro"
            }))
            .filter(item => item.id && item.venue_id)
        : [];

      return {
        ...data,
        seances,
        count: seances.length,
        browser_client_version: VERSION,
        discovery_fallback: "legacy"
      };
    }
  }

  async function stateRead(seanceId, holdRef = "") {
    const id = text(seanceId);
    if (!id) {
      throw new Error("gateway_seance_id_required");
    }

    const ref = text(holdRef) || existingHoldRef(id);

    if (ref && !validUuid(ref)) {
      throw new Error("gateway_hold_ref_invalid");
    }

    const params = new URLSearchParams({
      action: "state",
      seance_id: id,
      _: String(Date.now())
    });

    if (ref) params.set("hold_ref", ref);

    const data = await request(`${CLIENT_URL}?${params.toString()}`);
    return requireSucceeded(data, "gateway_state_failed");
  }

  async function setHold(seanceId, holdRef, seatKeys) {
    const id = text(seanceId);
    const ref = text(holdRef) || getOrCreateHoldRef(id);

    const keys = [
      ...new Set(
        (Array.isArray(seatKeys) ? seatKeys : [])
          .map(text)
          .filter(Boolean)
      )
    ];

    if (!id) throw new Error("gateway_seance_id_required");
    if (!validUuid(ref)) throw new Error("gateway_hold_ref_invalid");
    if (!keys.length) throw new Error("gateway_seat_keys_required");
    if (keys.length > 12) throw new Error("gateway_too_many_seats");

    localStorage.setItem(holdStorageKey(id), ref);

    const data = await request(CLIENT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "hold",
        seance_id: id,
        hold_ref: ref,
        seat_keys: keys
      })
    });

    return requireSucceeded(data, "gateway_hold_failed");
  }

  async function releaseHold(seanceId, holdRef) {
    const id = text(seanceId);
    const ref = text(holdRef) || existingHoldRef(id);

    if (!id) throw new Error("gateway_seance_id_required");

    if (!ref) {
      return {
        ok: true,
        result: "succeeded",
        response_code: "nothing_to_release",
        seance_id: id,
        browser_client_version: VERSION
      };
    }

    if (!validUuid(ref)) {
      throw new Error("gateway_hold_ref_invalid");
    }

    const data = await request(CLIENT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "release",
        seance_id: id,
        hold_ref: ref
      })
    });

    return requireSucceeded(data, "gateway_release_failed");
  }

  const api = Object.freeze({
    VERSION,
    CLIENT_URL,

    listSeances,
    stateRead,
    setHold,
    releaseHold,

    getOrCreateHoldRef,
    existingHoldRef,
    forgetHoldRef,

    list: listSeances,
    state: stateRead,
    holdCreate: setHold,
    holdRelease: releaseHold
  });

  window.VA_GATEWAY = api;

  console.info(
    `[VA Gateway] browser client ${VERSION} loaded; list = Catalog -> Universal Gateway; state/HOLD = proven VA adapter`
  );
})();
