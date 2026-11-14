
/* VA Native HOLD V2 — browser helper (STAGING). Load on hall, order, checkout.
   A secure random 256-bit proof is stored in sessionStorage, never in URL.
   Gateway code does not use this helper.
*/
(() => {
  'use strict';
  const PROJECT_URL = 'https://fhusjlkneckbvnrdhbil.supabase.co';
  // Publishable key is public, NOT the service_role secret.
  // Required by the deployed Supabase Edge gateway's Verify JWT check.
  const PUBLISHABLE_KEY = 'sb_publishable_nCCfptJOb8Lzy1uAwGBJzA_OJtDneTS';
  const API = `${PROJECT_URL}/functions/v1/va-native-seat-hold-v2`;
  const PREFIX = 'va:native-hold:v2:';
  const key = (seance) => PREFIX + String(seance || '').trim();
  const valid = (token) => /^[a-f0-9]{64}$/.test(String(token || ''));
  const newProof = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),
    x => x.toString(16).padStart(2, '0')).join('');

  function getToken(seance) {
    const value = sessionStorage.getItem(key(seance)) || '';
    return valid(value) ? value : '';
  }
  function ensureToken(seance) {
    const present = getToken(seance);
    if (present) return present;
    const token = newProof();
    sessionStorage.setItem(key(seance), token);
    return token;
  }
  async function call(action, data) {
    const resp = await fetch(API, {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'apikey': PUBLISHABLE_KEY},
      body: JSON.stringify({action, ...data})
    });
    const result = await resp.json().catch(() => ({ok:false,code:'invalid_server_response'}));
    if (!resp.ok || !result.ok) {
      const err = new Error(result.message || result.code || 'Не вдалося змінити HOLD');
      err.code = result.code || `http_${resp.status}`;
      throw err;
    }
    return result;
  }
  async function acquire({seance_id, seat, amount, show_slug}) {
    if (!seance_id || !seat) throw Error('Невідоме місце або сеанс');
    const hold_token = ensureToken(seance_id);
    return call('acquire', {seance_id, seat, amount, show_slug, hold_token});
  }
  async function release({seance_id, seat}) {
    const hold_token = getToken(seance_id);
    if (!hold_token) throw Error('HOLD недоступний у цій сесії');
    return call('release', {seance_id, seat, hold_token});
  }
  Object.defineProperty(window, 'VANativeHoldV2', {
    value: Object.freeze({acquire, release, getToken}),
    writable:false, configurable:false
  });
})();
