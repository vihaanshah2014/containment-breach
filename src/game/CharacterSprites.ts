import { SpriteFrame, SpriteSheet, loadImage } from '../assets/SpriteSheet';

export type CharacterSpriteSets = {
  playable: SpriteFrame[]; // top row (5)
  enemies: SpriteFrame[];  // middle row (5)
  unlockable: SpriteFrame[]; // bottom row (5)
};

function detectCircleCropFrames(img: HTMLImageElement, cols: number, rows: number): SpriteFrame[][] {
  const sheet = new SpriteSheet(img, cols, rows, 0);
  const frames: SpriteFrame[][] = [];
  const tileW = sheet.tileWidth;
  const tileH = sheet.tileHeight;

  const off = document.createElement('canvas');
  off.width = tileW;
  off.height = tileH;
  const offCtx = off.getContext('2d');
  if (!offCtx) return Array.from({ length: rows }, (_, r) => sheet.framesRow(r, cols));

  for (let r = 0; r < rows; r++) {
    const rowFrames: SpriteFrame[] = [];
    for (let c = 0; c < cols; c++) {
      const base = sheet.frameAt(c, r);
      // Draw tile into offscreen canvas
      offCtx.clearRect(0, 0, tileW, tileH);
      offCtx.drawImage(base.image, base.sx, base.sy, base.sw, base.sh, 0, 0, tileW, tileH);

      const imgData = offCtx.getImageData(0, 0, tileW, tileH).data;
      const cx = tileW / 2;
      const cy = tileH / 2;
      let maxDistNonBlack = 0;
      for (let y = 0; y < tileH; y++) {
        for (let x = 0; x < tileW; x++) {
          const idx = (y * tileW + x) * 4;
          const rch = imgData[idx];
          const gch = imgData[idx + 1];
          const bch = imgData[idx + 2];
          const a = imgData[idx + 3];
          if (a < 8) continue; // transparent -> ignore
          // treat near-black (background and outline) as black, ignore
          if (rch < 35 && gch < 35 && bch < 35) continue;
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.hypot(dx, dy);
          if (d > maxDistNonBlack) maxDistNonBlack = d;
        }
      }

      // Expand a bit to include the black ring outline
      const pad = 12;
      const radius = Math.min(Math.min(tileW, tileH) / 2 - 1, maxDistNonBlack + pad);
      const size = Math.max(16, Math.floor(radius * 2));
      const sx = Math.max(0, Math.floor(base.sx + cx - size / 2));
      const sy = Math.max(0, Math.floor(base.sy + cy - size / 2));
      const sw = Math.min(size, img.naturalWidth - sx);
      const sh = Math.min(size, img.naturalHeight - sy);
      rowFrames.push({ image: img, sx, sy, sw, sh });
    }
    frames.push(rowFrames);
  }
  return frames;
}

export async function loadCharacterSpriteSets(url: string): Promise<CharacterSpriteSets> {
  const img = await loadImage(url);
  // Detect per-token crop based on non-black content + ring pad
  const rows = detectCircleCropFrames(img, 5, 3);
  return {
    playable: rows[0],
    enemies: rows[1],
    unlockable: rows[2],
  };
}
