// VSDK shim — production-shaped surface for AppLovin Playable Preview.
// Mirrors window.Voodoo.playable.{win,lose,redirectToInstallPage,on} from
// MarbleSort.html (verbatim minified VSDK is 43 KB; we don't need it for
// the AppLovin Preview env, just the public API).
//
// MRAID v2.0 bridge: AppLovin requires mraid.open(url) for click-through,
// not window.open. We try mraid first, fall back to window.open for dev.
//
// This file is loaded as a CLASSIC <script> (not ESM) by tools/build.mjs
// so window.Voodoo is set before the IIFE bundle runs.

(function () {
  if (window.Voodoo && window.Voodoo.playable) return; // dev shell already loaded one
  /** @type {Record<string, ((...a: any[]) => void)[]>} */
  const subs = {};
  function _emit(ev) { (subs[ev] || []).forEach((cb) => { try { cb(); } catch (e) { console.error(e); } }); }

  const playable = {
    win() { console.log('[VSDK] win'); _emit('win'); },
    lose() { console.log('[VSDK] lose'); _emit('lose'); },
    redirectToInstallPage() {
      console.log('[VSDK] redirectToInstallPage');
      _emit('redirect');
      const url = 'https://apps.apple.com/app/castle-clashers/';
      try {
        if (typeof mraid !== 'undefined' && typeof mraid.open === 'function') {
          mraid.open(url);
          return;
        }
      } catch (e) { /* mraid not available */ }
      try { window.open(url, '_blank'); } catch (e) { /* sandboxed iframe */ }
    },
    on(event, cb) { (subs[event] = subs[event] || []).push(cb); },
  };

  Object.defineProperty(window, 'Voodoo', {
    value: { playable },
    writable: false,
    enumerable: true,
    configurable: false,
  });

  // Forward AppLovin viewable/pause/resume events if present.
  try {
    if (typeof mraid !== 'undefined') {
      mraid.addEventListener?.('viewableChange', (viewable) => _emit(viewable ? 'resume' : 'pause'));
    }
  } catch (e) { /* noop */ }
})();
