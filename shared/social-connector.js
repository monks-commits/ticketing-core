(function (global) {
  "use strict";

  const DEFAULT_FACEBOOK_FUNCTION = "social-facebook-publish";

  function clean(value) {
    return value == null ? "" : String(value).trim();
  }

  async function callEdgeFunction({
    supabaseUrl,
    anonKey,
    functionName,
    payload,
  }) {
    const base = clean(supabaseUrl).replace(/\/+$/, "");
    const key = clean(anonKey);
    const fn = clean(functionName);

    if (!base) throw new Error("Social Connector: SUPABASE_URL не задано.");
    if (!key) throw new Error("Social Connector: SUPABASE_ANON_KEY не задано.");
    if (!fn) throw new Error("Social Connector: Edge Function не задана.");

    const response = await fetch(`${base}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });

    const raw = await response.text();
    let result = {};

    try {
      result = raw ? JSON.parse(raw) : {};
    } catch {
      result = { raw };
    }

    if (!response.ok || result?.ok === false) {
      const providerMessage =
        result?.meta?.error?.message ||
        result?.message ||
        result?.error ||
        `HTTP ${response.status}`;

      throw new Error(providerMessage);
    }

    return result;
  }

  function buildTrackedUrl(rawUrl, options = {}) {
    const source = clean(options.source || "facebook");
    const medium = clean(options.medium || "social");
    const campaign = clean(options.campaign || options.seanceId || "");
    const sourceModule = clean(options.sourceModule || "");

    try {
      const url = new URL(rawUrl, global.location?.href || undefined);

      if (source) {
        url.searchParams.set("ref", source);
        url.searchParams.set("utm_source", source);
      }

      if (medium) url.searchParams.set("utm_medium", medium);
      if (campaign) url.searchParams.set("utm_campaign", campaign);
      if (sourceModule) url.searchParams.set("va_source", sourceModule);

      return url.toString();
    } catch {
      return clean(rawUrl);
    }
  }

  async function publishFacebook(options = {}) {
    const payload = {
      message: clean(options.message),
      target_url: clean(options.targetUrl || options.target_url),
      file_url: clean(options.fileUrl || options.file_url),
      mime_type: clean(options.mimeType || options.mime_type),
      file_kind: clean(options.fileKind || options.file_kind),
      output_id: clean(options.outputId || options.output_id),
      queue_id: clean(options.queueId || options.queue_id),
      publication_mode: clean(options.publicationMode || options.publication_mode),
      destination_url: clean(options.destinationUrl || options.destination_url),

      // Контекст VA. Поточна Facebook Edge Function може його ігнорувати;
      // поля вже передаються, щоб транспорт не був прив'язаний до одного модуля.
      venue_id: clean(options.venueId || options.venue_id),
      seance_id: clean(options.seanceId || options.seance_id),
      source_module: clean(options.sourceModule || options.source_module),
    };

    return callEdgeFunction({
      supabaseUrl: options.supabaseUrl,
      anonKey: options.anonKey,
      functionName:
        clean(options.functionName) || DEFAULT_FACEBOOK_FUNCTION,
      payload,
    });
  }

  async function publish(options = {}) {
    const channel = clean(options.channel).toLowerCase();

    if (channel === "facebook" || channel === "fb") {
      return publishFacebook(options);
    }

    throw new Error(
      `Social Connector: канал «${channel || "—"}» ще не підключений.`,
    );
  }

  global.VA_SOCIAL = Object.freeze({
    version: "1.1.0",
    publish,
    publishFacebook,
    buildTrackedUrl,
  });
})(window);
