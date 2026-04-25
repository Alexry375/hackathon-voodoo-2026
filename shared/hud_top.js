// Top HP bar — visible in both scenes. Owned by Alexis (confirmed by Sami
// in HANDOFF [20:00] decision (a)). Reads state.hp_self_pct / hp_enemy_pct.
// Both scenes call drawTopHud(ctx) last in their render order.
//
// Layout (from B01 ref): top 80 px, 2 horizontal bars side-by-side. Player
// (blue castle icon) on the LEFT, enemy (red castle icon) on the RIGHT.

import { state } from './state.js';
import { getImage, isImageReady } from './assets.js';

const H = 76;
const PAD = 10;
const BAR_H = 18;
const ICON_SIZE = 56;

/** @param {CanvasRenderingContext2D} ctx */
export function drawTopHud(ctx) {
  const W = ctx.canvas.width;
  // semi-transparent dark band so the bars are readable on any background
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, W, H);

  const halfW = W / 2;
  drawSide(ctx, PAD, 0, halfW - PAD * 1.5, 'BLUE_CASTLE', state.hp_self_pct, '#3DA0FF', false);
  drawSide(ctx, halfW + PAD * 0.5, 0, halfW - PAD * 1.5, 'RED_CASTLE', state.hp_enemy_pct, '#FF4848', true);
}

function drawSide(ctx, x, y, w, assetName, hpPct, fillColor, mirror) {
  // Icon
  const iconX = mirror ? x + w - ICON_SIZE - 4 : x + 4;
  const iconY = y + (H - ICON_SIZE) / 2 - 2;
  if (isImageReady(assetName)) {
    ctx.save();
    if (mirror) {
      // flip horizontally so the enemy castle faces the player
      ctx.translate(iconX + ICON_SIZE, iconY);
      ctx.scale(-1, 1);
      ctx.drawImage(getImage(assetName), 0, 0, ICON_SIZE, ICON_SIZE);
    } else {
      ctx.drawImage(getImage(assetName), iconX, iconY, ICON_SIZE, ICON_SIZE);
    }
    ctx.restore();
  } else {
    // Asset still decoding — kick the load and draw a placeholder this frame.
    getImage(assetName);
    ctx.fillStyle = fillColor;
    ctx.fillRect(iconX, iconY, ICON_SIZE, ICON_SIZE);
  }

  // Bar
  const barX = mirror ? x : x + ICON_SIZE + 8;
  const barW = w - ICON_SIZE - 8;
  const barY = y + (H - BAR_H) / 2 + 8;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(barX, barY, barW, BAR_H);
  const pct = Math.max(0, Math.min(100, hpPct)) / 100;
  const fillW = mirror ? barW * pct : barW * pct;
  const fillX = mirror ? barX + barW - fillW : barX;
  ctx.fillStyle = fillColor;
  ctx.fillRect(fillX, barY, fillW, BAR_H);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barW, BAR_H);

  // Percentage text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = mirror ? 'right' : 'left';
  const txtX = mirror ? barX + barW - 6 : barX + 6;
  ctx.fillText(`${Math.round(hpPct)}%`, txtX, barY + BAR_H / 2);
}
