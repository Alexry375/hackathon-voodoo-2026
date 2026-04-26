/**
 * Ephemeral praise text floats for hit feedback.
 * Inspired by MarbleSort's RewardFeedbackScale.
 */

/** @typedef {{ text: string, x: number, y: number, color: string, rot: number, t0: number }} PraiseFloat */

const PHRASES = ['NICE!', 'DIRECT HIT!', 'BOOM!', 'CRITICAL!', 'POW!', 'BULLSEYE!'];
const LIFE_MS = 950;
const RISE_PX = 60;
const SCALE_IN_MS = 180;
const SETTLE_MS = 320;
const FADE_START_MS = 600;

/** @type {PraiseFloat[]} */
const _floats = [];
let _phraseIdx = 0;

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * @param {string} [text]
 * @param {{ x?: number, y?: number, color?: string }} [opts]
 */
export function spawnPraise(text, opts) {
  let phrase = text;
  if (phrase === undefined) {
    phrase = PHRASES[_phraseIdx % PHRASES.length];
    _phraseIdx++;
  }
  const o = opts || {};
  _floats.push({
    text: phrase,
    x: o.x ?? 270,
    y: o.y ?? 360,
    color: o.color ?? '#FFD23A',
    rot: ((Math.random() * 2 - 1) * 5) * Math.PI / 180,
    t0: (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} now
 */
export function drawPraiseFloats(ctx, now) {
  for (let i = _floats.length - 1; i >= 0; i--) {
    if (now - _floats[i].t0 >= LIFE_MS) _floats.splice(i, 1);
  }

  for (const f of _floats) {
    const age = now - f.t0;
    let scale;
    if (age < SCALE_IN_MS) {
      const t = age / SCALE_IN_MS;
      scale = 0.4 + (easeOutBack(t)) * (1.15 - 0.4);
    } else if (age < SETTLE_MS) {
      const t = (age - SCALE_IN_MS) / (SETTLE_MS - SCALE_IN_MS);
      scale = 1.15 + (1.0 - 1.15) * t;
    } else {
      scale = 1.0;
    }

    const alpha = age < FADE_START_MS ? 1 : Math.max(0, 1 - (age - FADE_START_MS) / (LIFE_MS - FADE_START_MS));
    const yOffset = (age / LIFE_MS) * RISE_PX;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(f.x, f.y - yOffset);
    ctx.rotate(f.rot);
    ctx.scale(scale, scale);
    ctx.font = 'bold 84px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#000000';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
  }
}
