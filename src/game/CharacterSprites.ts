import { SpriteFrame, SpriteSheet, loadImage } from '../assets/SpriteSheet';

export type CharacterSpriteSets = {
  playable: SpriteFrame[]; // top row (5)
  enemies: SpriteFrame[];  // middle row (5)
  unlockable: SpriteFrame[]; // bottom row (5)
};

function detectCircleCropFrames(img: HTMLImageElement, cols: number, rows: number): SpriteFrame[][] {
  const sheet = new SpriteSheet(img, cols, rows, 0);
  
  // Create a processed image canvas to remove outer black rings
  const processedCanvas = document.createElement('canvas');
  processedCanvas.width = img.naturalWidth;
  processedCanvas.height = img.naturalHeight;
  const processedCtx = processedCanvas.getContext('2d');
  if (!processedCtx) return Array.from({ length: rows }, (_, r) => sheet.framesRow(r, cols));
  
  // Copy original image to processed canvas
  processedCtx.drawImage(img, 0, 0);

  // Process each tile to remove outer black rings (no cropping, just replace black pixels)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const base = sheet.frameAt(c, r);
      // Get image data for this tile from the processed canvas
      const tileData = processedCtx.getImageData(base.sx, base.sy, base.sw, base.sh);
      const data = tileData.data;
      
      const cx = base.sw / 2;
      const cy = base.sh / 2;
      const maxRadius = Math.min(base.sw, base.sh) / 2;
      
      // Replace black pixels in outer 30% ring area
      for (let y = 0; y < base.sh; y++) {
        for (let x = 0; x < base.sw; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const distance = Math.hypot(dx, dy);
          const idx = (y * base.sw + x) * 4;
          
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          
          // Only replace dark pixels that are in the outer 50% ring area
          const outerRingStart = maxRadius * 0.50; // Start at 50% radius (outer 50%)
          const isInOuterRing = distance >= outerRingStart && distance <= maxRadius;
          const isDarkPixel = r < 50 && g < 50 && b < 50 && a > 100;
          
          if (isInOuterRing && isDarkPixel) {
            data[idx + 3] = 0; // Make black outer ring pixels transparent
          }
        }
      }
      
      // Put the processed tile data back
      processedCtx.putImageData(tileData, base.sx, base.sy);
    }
  }

  // Create frames using the processed image (no cropping - keep original dimensions)
  const frames: SpriteFrame[][] = [];
  for (let r = 0; r < rows; r++) {
    const rowFrames: SpriteFrame[] = [];
    for (let c = 0; c < cols; c++) {
      const base = sheet.frameAt(c, r);
      // Use the processed canvas with original dimensions
      rowFrames.push({ 
        image: processedCanvas, 
        sx: base.sx, 
        sy: base.sy, 
        sw: base.sw, 
        sh: base.sh 
      });
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
