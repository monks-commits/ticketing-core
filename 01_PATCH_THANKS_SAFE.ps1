param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot
)
$ErrorActionPreference='Stop'
$path=Join-Path $RepoRoot 'site-project\pages\thanks.html'
if (-not (Test-Path -LiteralPath $path)) {throw "Missing file: $path"}
$source=[IO.File]::ReadAllText($path,[Text.Encoding]::UTF8)
if($source.Contains('VA_ACADEMY_SECURE_ORDER_STATUS_GATE_V2')){Write-Host 'Already patched. No changes.';exit 0}
$pattern='(?s)  const url =\s*\r?\n\s*`\$\{SUPABASE_URL\}/rest/v1/orders`\s*\+.*?  const rows = Array\.isArray\(orderRes\.json\) \? orderRes\.json : \[\];'
$rx=[regex]::new($pattern,[Text.RegularExpressions.RegexOptions]::Singleline)
$matches=$rx.Matches($source)
if($matches.Count -ne 1 -or -not $source.Contains('async function loadPaidOrder()')){
  throw "Expected original paid-order block exactly once. Found: $($matches.Count). No changes made."
}
$replacement=@'
  // VA_ACADEMY_SECURE_ORDER_STATUS_GATE_V2
  // Native checkout saved a 256-bit hold proof and seance in same-origin sessionStorage.
  // Academy: authenticate order via Edge; other venues: retain their existing path.
  let paidOrderProof = "";
  let nativeSeance = "";
  try {
    paidOrderProof = sessionStorage.getItem(`va:paid-order-proof:v1:${orderIdFromQs}`) || "";
    nativeSeance = sessionStorage.getItem(`va:paid-order-seance:v1:${orderIdFromQs}`) || "";
  } catch (_) {}

  let trustedCheckoutVenue = "";
  if (/^[a-f0-9]{64}$/.test(paidOrderProof) &&
      /^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(nativeSeance)) {
    // Public seance metadata chooses the route; never trust ?venue as paid-order proof.
    const routeRes = await fetchJson(
      `${SUPABASE_URL}/rest/v1/seances?id=eq.${encodeURIComponent(nativeSeance)}&select=venue_id&limit=1`
    );
    if (!routeRes.ok || !Array.isArray(routeRes.json) || !routeRes.json.length) {
      debugEl.textContent = "Checkout venue verification unavailable";
      msgEl.textContent = "Перевірка замовлення тимчасово недоступна. Квитки надсилаються на email після підтвердження оплати.";
      return;
    }
    trustedCheckoutVenue = String(routeRes.json[0].venue_id || "");
  }
  const academyRoute = trustedCheckoutVenue === "academy" ||
    trustedCheckoutVenue === "academy-ruhu" ||
    ["academy", "academy-ruhu"].includes(String(qs.get("venue") || ""));

  let rows = [];
  if (academyRoute) {
    // Set return target BEFORE network request. If payment is pending,
    // the buyer must still return to the right Academy storefront.
    returnLinkEl.href = getReturnHrefByVenue("academy", nativeSeance);
    if (!/^[a-f0-9]{64}$/.test(paidOrderProof)) {
      debugEl.textContent = "Academy order proof not available in this browser tab";
      msgEl.textContent = "Перевірка оплати в цій вкладці недоступна. Квитки надсилаються на email після підтвердження платежу.";
      return;
    }
    let orderStatus;
    let httpStatus = 0;
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/va-academy-order-status-v1`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ order_id: orderIdFromQs, hold_token: paidOrderProof }),
        cache: "no-store"
      });
      httpStatus = response.status;
      orderStatus = await response.json();
      if (!response.ok || !orderStatus?.ok) throw Error("protected_summary_unavailable");
    } catch (_) {
      debugEl.textContent = `Protected Academy order status unavailable; HTTP ${httpStatus}`;
      msgEl.textContent = "Перевірка оплати тимчасово недоступна. Квитки будуть надіслані на email після підтвердження платежу.";
      return;
    }
    if (orderStatus.status !== "paid") {
      debugEl.textContent = "Protected Academy order is processing";
      msgEl.textContent = "Платіж ще обробляється. Оновіть сторінку через 10–20 секунд.";
      return;
    }
    rows = [orderStatus];
    debugEl.textContent = "Protected Academy paid-order summary (no buyer data)";
  } else {
    // Historical non-Academy routes are unchanged at this stage.
    // Remove this branch only after their own secure status migration.
    const url =
      `${SUPABASE_URL}/rest/v1/orders` +
      `?select=*` +
      `&order_id=eq.${encodeURIComponent(orderIdFromQs)}` +
      `&status=eq.paid` +
      `&limit=1`;
    const orderRes = await fetchJson(url);
    debugEl.textContent = `GET ${url}\nstatus=${orderRes.status}\nresponse:\n${orderRes.text}`;
    if (!orderRes.ok) {
      msgEl.textContent = "Оплату отримано, але дані цього замовлення не завантажились. Оновіть сторінку або зверніться до підтримки.";
      return;
    }
    rows = Array.isArray(orderRes.json) ? orderRes.json : [];
  }
'@
$new=$rx.Replace($source,[Text.RegularExpressions.MatchEvaluator]{param($m) $replacement},1)
if($new -eq $source -or -not $new.Contains('VA_ACADEMY_SECURE_ORDER_STATUS_GATE_V2')){throw 'Patch failed. No changes made.'}
$backup="$path.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
Copy-Item -LiteralPath $path -Destination $backup -ErrorAction Stop
[IO.File]::WriteAllText($path,$new,[Text.UTF8Encoding]::new($false))
Write-Host "LOCAL PATCH SUCCESS: $path"
Write-Host "BACKUP: $backup"
Write-Host 'No deploy, no SQL, no database changes.'
