// Top HUD — calque la source: gros "VS" central + icones château + texte
// "100%" gros blanc contour noir, barres de vie pleines qui se touchent au
// centre.

import { state } from './state.js';
import { getImage, isImageReady } from './assets.js';

const ICON_SIZE = 50;
const PAD = 12;

/** @param {CanvasRenderingContext2D} ctx */
export function drawTopHud(ctx) {
  const W = ctx.canvas.width;

  // Black band top
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, 22);

  // Two HP bars touching at center, with a thin VS notch
  const cx = W / 2;
  const barH = 22;
  const barY = 0;

  const bluePct = Math.max(0, Math.min(100, state.hp_self_pct)) / 100;
  const redPct  = Math.max(0, Math.min(100, state.hp_enemy_pct)) / 100;

  // Blue (player) — fills LEFT to RIGHT, anchored at left edge
  const blueBarW = (cx - 4) * bluePct;
  ctx.fillStyle = '#3DA0FF';
  ctx.fillRect(0, barY, blueBarW, barH);
  // depth shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, barY + barH - 5, blueBarW, 5);

  // Red (enemy) — fills RIGHT to LEFT, anchored at right edge
  const redBarW = (cx - 4) * redPct;
  ctx.fillStyle = '#FF4848';
  ctx.fillRect(W - redBarW, barY, redBarW, barH);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(W - redBarW, barY + barH - 5, redBarW, 5);

  // Central "VS" badge — white text, thick black outline
  ctx.save();
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeText('VS', cx, 11);
  ctx.fillText('VS', cx, 11);
  ctx.restore();

  // Player side (blue castle icon + percent text)
  drawSide(ctx, PAD, 30, 'BLUE_CASTLE', state.hp_self_pct, false);
  drawSide(ctx, W - PAD - ICON_SIZE, 30, 'RED_CASTLE', state.hp_enemy_pct, true);
}

function drawSide(ctx, iconX, iconY, assetName, hpPct, mirror) {
  // icon
  if (isImageReady(assetName)) {
    ctx.save();
    if (mirror) {
      ctx.translate(iconX + ICON_SIZE, iconY);
      ctx.scale(-1, 1);
      ctx.drawImage(getImage(assetName), 0, 0, ICON_SIZE, ICON_SIZE);
    } else {
      ctx.drawImage(getImage(assetName), iconX, iconY, ICON_SIZE, ICON_SIZE);
    }
    ctx.restore();
  } else {
    getImage(assetName);
    ctx.fillStyle = mirror ? '#9B2E29' : '#3D6FA8';
    ctx.fillRect(iconX, iconY, ICON_SIZE, ICON_SIZE);
  }

  // big percent text — white with thick black outline
  ctx.save();
  ctx.font = 'bold 28px sans-serif';
  ctx.textBaseline = 'top';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#FFFFFF';
  const txt = `${Math.round(hpPct)}%`;
  if (mirror) {
    ctx.textAlign = 'right';
    ctx.strokeText(txt, iconX - 6, iconY + 14);
    ctx.fillText(txt, iconX - 6, iconY + 14);
  } else {
    ctx.textAlign = 'left';
    ctx.strokeText(txt, iconX + ICON_SIZE + 6, iconY + 14);
    ctx.fillText(txt, iconX + ICON_SIZE + 6, iconY + 14);
  }
  ctx.restore();
}
