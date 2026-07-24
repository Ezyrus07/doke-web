/* Doke AUTH-A05 recovery boot marker.
   Captures only whether the current URL contains a legitimate recovery signal.
   Token values are never copied, logged or persisted by this script. */
(function () {
  'use strict';

  const readParams = (value) => {
    try {
      return new URLSearchParams(String(value || '').replace(/^[?#]/, ''));
    } catch {
      return new URLSearchParams();
    }
  };

  const query = readParams(window.location.search);
  const hash = readParams(window.location.hash);
  const type = String(hash.get('type') || query.get('type') || '').trim().toLowerCase();
  const credentialSignal = ['access_token', 'refresh_token', 'code', 'token_hash']
    .some((key) => hash.has(key) || query.has(key));

  window.DOKE_AUTH_RECOVERY_BOOT = Object.freeze({
    version: 'AUTH-A05',
    requested: type === 'recovery' && credentialSignal,
    observedAt: Date.now()
  });
})();
