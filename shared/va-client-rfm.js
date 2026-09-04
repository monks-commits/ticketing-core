(() => {
  "use strict";

  const VERSION = "1.0.1";

  function finiteNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function validDate(value) {
    if (!value) return null;
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : null;
  }

  function daysSince(value, nowMs = Date.now()) {
    const ts = validDate(value);
    if (ts === null) return 9999;
    return Math.max(0, Math.floor((nowMs - ts) / 86400000));
  }

  function calculate(input = {}, nowMs = Date.now()) {
    const lastVisit =
      input.lastVisit ||
      input.last_visit ||
      input.lastVisitedAt ||
      null;

    const lastOrder =
      input.lastOrder ||
      input.lastOrderAt ||
      input.last_order ||
      input.lastPurchase ||
      null;

    const visitTs = validDate(lastVisit);
    const orderTs = validDate(lastOrder);

    // daysFromVisit keeps its literal meaning.
    const daysFromVisit =
      visitTs !== null
        ? daysSince(lastVisit, nowMs)
        : 9999;

    const daysFromOrder =
      orderTs !== null
        ? daysSince(lastOrder, nowMs)
        : 9999;

    // Critical fix:
    // RFM Recency uses the latest factual visit when it exists.
    // If a buyer has NEVER been scanned/visited yet, use the last paid purchase
    // rather than interpreting "no visit" as 9999 days of inactivity.
    const recencyBasis =
      visitTs !== null
        ? "visit"
        : orderTs !== null
          ? "purchase"
          : "none";

    const daysRecency =
      recencyBasis === "visit"
        ? daysFromVisit
        : recencyBasis === "purchase"
          ? daysFromOrder
          : 9999;

    const frequency =
      input.frequency !== undefined && input.frequency !== null
        ? finiteNumber(input.frequency, 0)
        : finiteNumber(input.visited, 0);

    const monetary =
      input.monetary !== undefined && input.monetary !== null
        ? finiteNumber(input.monetary, 0)
        : finiteNumber(
            input.totalAmount !== undefined ? input.totalAmount : input.total,
            0
          );

    // Current KB score thresholds remain unchanged.
    let r = 1;
    let f = 1;
    let m = 1;

    if (daysRecency <= 30) r = 5;
    else if (daysRecency <= 90) r = 4;
    else if (daysRecency <= 180) r = 3;
    else if (daysRecency <= 365) r = 2;

    if (frequency >= 10) f = 5;
    else if (frequency >= 5) f = 4;
    else if (frequency >= 3) f = 3;
    else if (frequency >= 2) f = 2;

    if (monetary >= 10000) m = 5;
    else if (monetary >= 5000) m = 4;
    else if (monetary >= 2000) m = 3;
    else if (monetary >= 1000) m = 2;

    let rfmTitle = "Активний";

    if (r === 1) {
      rfmTitle = "Втрачений";
    } else if (r === 2) {
      rfmTitle = "Під ризиком";
    } else if (r === 3) {
      rfmTitle = "Засинає";
    } else if (r === 4) {
      rfmTitle = "Остигає";
    } else if (r === 5 && f === 1) {
      rfmTitle = "Новий";
    } else if (r === 5 && f >= 4) {
      rfmTitle = "VIP";
    } else if (r === 5 && f >= 2) {
      rfmTitle = "Постійний";
    }

    return {
      version: VERSION,
      daysFromVisit,
      daysFromOrder,
      daysRecency,
      recencyBasis,
      frequency,
      monetary,
      r,
      f,
      m,
      rfmSegment: `${r}${f}${m}`,
      rfmTitle
    };
  }

  function apply(client, nowMs = Date.now()) {
    if (!client || typeof client !== "object") return client;
    Object.assign(client, calculate(client, nowMs));
    return client;
  }

  window.VAClientRFM = Object.freeze({
    VERSION,
    calculate,
    apply
  });
})();
