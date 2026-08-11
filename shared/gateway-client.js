/*
  VA -> Philharmonic Gateway browser client
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

  const VERSION = "3.0-browser";
  const DEFAULT_VENUE_CODE = "filarmoniya";
  const DEFAULT_VENUE_NAME = "Дніпровська філармонія";
  const DEFAULT_CITY_CODE = "dnipro";

  function text(value) {
    return String(value ?? "").trim();
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

  function normalizeSeance(row) {
    const venueCode =
      text(row?.gateway_venue_code) ||
      text(row?.venue_id) ||
      DEFAULT_VENUE_CODE;

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
        DEFAULT_VENUE_NAME,
      city_code:
        text(row?.city_code) ||
        DEFAULT_CITY_CODE
    };
  }

  async function listSeances() {
    const data = await request(
      `${CLIENT_URL}?action=seances&_=${Date.now()}`
    );

    const seances = Array.isArray(data?.seances)
      ? data.seances
          .map(normalizeSeance)
          .filter(item => item.id)
      : [];

    return {
      ...data,
      seances,
      count: seances.length,
      browser_client_version: VERSION
    };
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
    `[VA Gateway] browser client ${VERSION} loaded; route = browser -> VA server -> Philharmonic Gateway`
  );
})();
