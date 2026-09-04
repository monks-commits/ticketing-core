(() => {
  "use strict";

  const VERSION = "1.0.0";

  function finiteNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function daysSince(dateValue, nowMs = Date.now()) {
    if (!dateValue) return 9999;
    const ts = new Date(dateValue).getTime();
    if (!Number.isFinite(ts)) return 9999;
    return Math.floor((nowMs - ts) / 86400000);
  }

  function calculate(input = {}, nowMs = Date.now()) {
    const daysFromVisit =
      input.daysFromVisit !== undefined && input.daysFromVisit !== null
        ? finiteNumber(input.daysFromVisit, 9999)
        : daysSince(input.lastVisit, nowMs);

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

    // EXACT current KB thresholds.
    let r = 1;
    let f = 1;
    let m = 1;

    if (daysFromVisit <= 30) r = 5;
    else if (daysFromVisit <= 90) r = 4;
    else if (daysFromVisit <= 180) r = 3;
    else if (daysFromVisit <= 365) r = 2;

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
