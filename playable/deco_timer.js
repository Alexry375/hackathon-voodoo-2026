// Decorative MarbleSort-style countdown timer (top-left pill).
// PURE COSMETIC — does NOT gate gameplay. Counts down from a starting value
// to create urgency / FOMO; freezes at 0:00. Hidden during the endcard.

const W = 540;
// y=92 mirrors persistent_cta — sits below the 80px HUD strip with blue HP.
const PILL = { x: 14, y: 92, w: 124, h: 46, r: 16 };
const START_SECONDS = 90;       // shows "01:30" initially
const DECAY_PER_SEC  = 0.6;     // ticks ~slower than realtime so it lingers

let _t0 = 0;
let _visible = false;

export function startDecoTimer() {
  _t0 = performance.now();
  _visible = true;
}

/** @param {boolean} v */
export function setDecoTimerVisible(v) { _visible = !!v; }

/**
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawDecoTimer(ctx) {
  if (!_visible || !_t0) return;
  const elapsed = (performance.now() - _t0) / 1000;
  const remaining = Math.max(0, START_SECONDS - elapsed * DECAY_PER_SEC);
  const m = Math.floor(remaining / 60);
  const s = Math.floor(remaining % 60);
  const label = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  // Color shifts to red as the clock runs down (under 30s remaining).
  const danger = remaining < 30;

  ctx.save();
  // Pill body
  ctx.fillStyle = danger ? '#C13838' : '#1F2A44';
  roundRect(ctx, PILL.x, PILL.y, PILL.w, PILL.h, PILL.r);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, PILL.x + 3, PILL.y + 3, PILL.w - 6, 12, PILL.r - 4);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  roundRect(ctx, PILL.x, PILL.y, PILL.w, PILL.h, PILL.r);
  ctx.stroke();

  // Clock icon (small circle with two hands)
  const icx = PILL.x + 22, icy = PILL.y + PILL.h / 2;
  ctx.fillStyle = '#FFD23A';
  ctx.beginPath(); ctx.arc(icx, icy, 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(icx, icy, 12, 0, Math.PI * 2); ctx.stroke();
  // hands
  ctx.beginPath();
  ctx.moveTo(icx, icy); ctx.lineTo(icx, icy - 7);
  ctx.moveTo(icx, icy); ctx.lineTo(icx + 5, icy + 1);
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Label
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const lx = PILL.x + 44;
  ctx.strokeText(label, lx, icy + 1);
  ctx.fillText(label, lx, icy + 1);

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

void W;
