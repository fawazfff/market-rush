import Phaser from "phaser";

export type PixelPalette = Record<string, number>;

export function pixelSprite(
  scene: Phaser.Scene,
  rows: string[],
  palette: PixelPalette,
  cell = 2,
): Phaser.GameObjects.Graphics {
  const sprite = scene.add.graphics();
  const width = Math.max(...rows.map((row) => row.length));
  const left = Math.floor(width / 2);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const color = palette[row[x]];
      if (color === undefined) continue;
      sprite.fillStyle(color, 1);
      sprite.fillRect((x - left) * cell, (y - rows.length + 1) * cell, cell, cell);
    }
  });
  return sprite;
}

export function pixelShadow(scene: Phaser.Scene, width = 18): Phaser.GameObjects.Graphics {
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x10130f, 0.48);
  shadow.fillRect(-width, 5, width * 2, 3);
  shadow.fillRect(-width + 4, 2, width * 2 - 8, 3);
  return shadow;
}

export function drawStoneFloor(scene: Phaser.Scene, top: number, bottom: number): void {
  const g = scene.add.graphics();
  g.fillStyle(0x171d1a);
  g.fillRect(0, 0, 960, 600);
  for (let y = top; y < bottom; y += 32) {
    for (let x = 32; x < 928; x += 32) {
      const shade = ((x / 32 * 7 + y / 32 * 11) % 5);
      const base = [0x41483b, 0x454c3e, 0x3d4539, 0x424a3d, 0x3b4338][shade];
      g.fillStyle(base);
      g.fillRect(x, y, 32, 32);
      g.fillStyle(0x59604b, 0.58);
      g.fillRect(x + 1, y + 1, 30, 2);
      g.fillRect(x + 1, y + 1, 2, 30);
      g.fillStyle(0x252d26, 0.78);
      g.fillRect(x, y + 30, 32, 2);
      g.fillRect(x + 30, y, 2, 32);
      const mark = (x * 13 + y * 7) % 9;
      if (mark === 0) {
        g.fillStyle(0x68705a, 0.5);
        g.fillRect(x + 8, y + 9, 5, 2);
        g.fillRect(x + 11, y + 11, 2, 5);
      } else if (mark === 1) {
        g.fillStyle(0x252d26, 0.55);
        g.fillRect(x + 20, y + 18, 4, 2);
      }
    }
  }
  g.fillStyle(0x222b25);
  g.fillRect(0, top - 24, 960, 24);
  g.fillRect(0, bottom, 960, 32);
  for (let x = 0; x < 960; x += 32) {
    g.fillStyle(x % 64 === 0 ? 0x59604d : 0x4b5344);
    g.fillRect(x + 1, top - 22, 30, 20);
    g.fillStyle(0x141a16);
    g.fillRect(x + 1, top - 3, 30, 3);
    g.fillStyle(x % 64 === 0 ? 0x4b5344 : 0x59604d);
    g.fillRect(x + 1, bottom + 1, 30, 20);
  }
  g.fillStyle(0x222b25);
  g.fillRect(0, top, 32, bottom - top);
  g.fillRect(928, top, 32, bottom - top);
  for (let y = top; y < bottom; y += 32) {
    g.fillStyle(0x59604d);
    g.fillRect(1, y + 1, 30, 30);
    g.fillRect(929, y + 1, 30, 30);
    g.fillStyle(0x141a16);
    g.fillRect(1, y + 29, 30, 3);
    g.fillRect(957, y + 1, 3, 30);
  }
}

export function drawPixelPillar(scene: Phaser.Scene, x: number, y: number): void {
  const g = scene.add.graphics();
  g.fillStyle(0x111713, 0.55);
  g.fillRect(x - 23, y + 12, 46, 8);
  g.fillRect(x - 17, y + 8, 34, 4);
  g.fillStyle(0x272f29);
  g.fillRect(x - 18, y - 20, 36, 36);
  g.fillStyle(0x6b7058);
  g.fillRect(x - 16, y - 22, 32, 5);
  g.fillRect(x - 20, y - 17, 4, 30);
  g.fillRect(x + 16, y - 17, 4, 30);
  g.fillStyle(0x929073);
  g.fillRect(x - 13, y - 17, 26, 3);
  g.fillStyle(0x394236);
  g.fillRect(x - 13, y - 12, 26, 22);
  g.fillStyle(0x1b231d);
  g.fillRect(x - 13, y + 10, 26, 4);
}
