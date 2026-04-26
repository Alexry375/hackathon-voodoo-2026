// Persistent top-right "PLAY NOW" CTA, visible across all gameplay phases.
// Tap fires window.Voodoo.playable.redirectToInstallPage().

const W = 540;
// y=92 (below 80px HUD strip) instead of y=12 to avoid overlap with HP icons + percent labels.
const BTN = { x: W - 14 - 140, y: 92, w: 140, h: 46, r: 12 };

let _visible = false;
let _opacity = 0;
let _target = 0;
let _tapHandlerInstalled = false;

/**
 * Install a single pointerdown handler. Idempotent.
 * @param {HTMLCanvasElement} canvas
 */
export function installPersistentCta(canvas) {
  if (_tapHandlerInstalled) return;
  _tapHandlerInstalled = true;
  canvas.addEventListener('pointerdown', (ev) => {
    if (!_visible || _opacity < 0.5) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const x = (ev.clientX - rect.left) * sx;
    const y = (ev.clientY - rect.top) * sy;
    if (x < BTN.x || x > BTN.x + BTN.w || y < BTN.y || y > BTN.y + BTN.h) return;
    ev.preventDefault();
    ev.stopPropagation();
    try { /** @type {any} */ (window).Voodoo?.playable?.redirectToInstallPage(); } catch (e) { console.error(e); }
  }, true);
}

/** @param {boolean} v */
export function setPersistentCtaVisible(v) {
  _visible = !!v;
  _target = v ? 1 : 0;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t  seconds, for the pulse
 */
export function drawPersistentCta(ctx, t) {
  const ease = 0.12;
  _opacity += (_target - _opacity) * ease;
  if (_opacity <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, _opacity));

  const pulse = 1 + 0.04 * Math.sin(t * 2 * Math.PI * 1.0);
  const cx = BTN.x + BTN.w / 2;
  const cy = BTN.y + BTN.h / 2;
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.translate(-cx, -cy);

  ctx.fillStyle = '#3FB13F';
  roundRect(ctx, BTN.x, BTN.y, BTN.w, BTN.h, BTN.r);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, BTN.x + 3, BTN.y + 3, BTN.w - 6, 8, BTN.r - 4);
  ctx.fill();

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  roundRect(ctx, BTN.x, BTN.y, BTN.w, BTN.h, BTN.r);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText('PLAY NOW', cx, cy + 2);
  ctx.fillText('PLAY NOW', cx, cy + 2);

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
