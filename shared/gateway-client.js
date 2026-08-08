(function(){
  "use strict";

  const DEFAULT_BRIDGE_URL = "http://127.0.0.1:8096";

  function normalizeBase(value){
    return String(value || "").trim().replace(/\/+$/, "");
  }

  function bridgeUrl(){
    return normalizeBase(
      window.VA_GATEWAY_BRIDGE_URL ||
      window.VA_CONFIG?.gateway_bridge_url ||
      DEFAULT_BRIDGE_URL
    );
  }

  async function request(path, { method = "GET", body = null } = {}){
    const options = {
      method,
      cache: "no-store",
      mode: "cors",
      headers: {
        "Accept": "application/json"
      }
    };

    if (body !== null) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${bridgeUrl()}${path}`, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false) {
      const err = new Error(
        data?.error ||
        data?.failure_code ||
        data?.response_code ||
        `gateway_bridge_http_${res.status}`
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  function storageKey(seanceRef){
    return `va_gateway_hold_ref:${String(seanceRef || "").trim()}`;
  }

  function existingHoldRef(seanceRef){
    return String(sessionStorage.getItem(storageKey(seanceRef)) || "").trim();
  }

  function getOrCreateHoldRef(seanceRef){
    let value = existingHoldRef(seanceRef);
    if (!value) {
      value = crypto.randomUUID();
      sessionStorage.setItem(storageKey(seanceRef), value);
    }
    return value;
  }

  function clearHoldRef(seanceRef){
    sessionStorage.removeItem(storageKey(seanceRef));
  }

  async function listSeances(){
    return request("/api/seances");
  }

  async function stateRead(seanceRef, holdRef = null){
    return request("/api/state", {
      method: "POST",
      body: {
        seance_ref: String(seanceRef || "").trim(),
        hold_ref: holdRef || null
      }
    });
  }

  async function setHold(seanceRef, holdRef, seatKeys){
    const keys = Array.isArray(seatKeys)
      ? [...new Set(seatKeys.map(x => String(x || "").trim()).filter(Boolean))]
      : [];

    if (!keys.length) {
      return releaseHold(seanceRef, holdRef);
    }

    return request("/api/hold", {
      method: "POST",
      body: {
        seance_ref: String(seanceRef || "").trim(),
        hold_ref: String(holdRef || "").trim(),
        seat_keys: keys
      }
    });
  }

  async function releaseHold(seanceRef, holdRef){
    return request("/api/release", {
      method: "POST",
      body: {
        seance_ref: String(seanceRef || "").trim(),
        hold_ref: String(holdRef || "").trim()
      }
    });
  }

  window.VA_GATEWAY = Object.freeze({
    bridgeUrl,
    listSeances,
    stateRead,
    setHold,
    releaseHold,
    existingHoldRef,
    getOrCreateHoldRef,
    clearHoldRef
  });
})();
