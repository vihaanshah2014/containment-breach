export type SpriteFrame = {
  image: HTMLImageElement;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

export class SpriteSheet {
  image: HTMLImageElement;
  cols: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  padding: number;

  constructor(image: HTMLImageElement, cols: number, rows: number, padding = 0) {
    this.image = image;
    this.cols = cols;
    this.rows = rows;
    this.padding = padding;
    this.tileWidth = Math.floor(image.naturalWidth / cols);
    this.tileHeight = Math.floor(image.naturalHeight / rows);
  }

  frameAt(col: number, row: number): SpriteFrame {
    const sx = col * this.tileWidth + this.padding;
    const sy = row * this.tileHeight + this.padding;
    const sw = this.tileWidth - this.padding * 2;
    const sh = this.tileHeight - this.padding * 2;
    return { image: this.image, sx, sy, sw, sh };
  }

  framesRow(row: number, count?: number): SpriteFrame[] {
    const n = count ?? this.cols;
    const out: SpriteFrame[] = [];
    for (let c = 0; c < n && c < this.cols; c++) out.push(this.frameAt(c, row));
    return out;
  }
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

