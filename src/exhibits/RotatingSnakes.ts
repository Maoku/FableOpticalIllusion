import * as THREE from 'three';
import type { Exhibit } from './Exhibit';
import { createWallLabel } from '../museum/TitlePlate';

/**
 * 回転蛇錯視(北岡明佳の「蛇の回転」型)。
 *
 * 完全な静止画なのに、周辺視で見るとディスクが回転して見える。
 * 黒 → 青 → 白 → 黄 の非対称な輝度勾配の繰り返しが、
 * 網膜と視覚野の応答速度差により運動信号として誤検出されるために起こる。
 * テクスチャは Canvas でプロシージャル生成する。
 */

const COLORS = ['#141418', '#4054c8', '#f5f2e8', '#d8a828'];

function drawDisk(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  reverse: boolean,
): void {
  const seq = reverse ? [...COLORS].reverse() : COLORS;
  const rings = 5;
  const repeats = 18; // 1 周あたりの 4 色パターンの繰り返し数
  for (let ring = rings; ring >= 1; ring--) {
    const r1 = (radius * ring) / rings;
    const r0 = (radius * (ring - 1)) / rings;
    // リングごとに位相を半パターンずらすと回転感が強まる
    const phase = (ring % 2) * (Math.PI / repeats / 2);
    const wedges = repeats * 4;
    for (let i = 0; i < wedges; i++) {
      const a0 = phase + (i / wedges) * Math.PI * 2;
      const a1 = phase + ((i + 1) / wedges) * Math.PI * 2 + 0.003;
      ctx.fillStyle = seq[i % 4];
      ctx.beginPath();
      ctx.arc(cx, cy, r1, a0, a1);
      ctx.arc(cx, cy, r0, a1, a0, true);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.fillStyle = '#8a8a92';
  ctx.beginPath();
  ctx.arc(cx, cy, radius / rings / 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function createSnakesCanvas(): HTMLCanvasElement {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8a8a92';
  ctx.fillRect(0, 0, size, size);

  const r = 236;
  drawDisk(ctx, 262, 262, r, false);
  drawDisk(ctx, 762, 262, r, true);
  drawDisk(ctx, 262, 762, r, true);
  drawDisk(ctx, 762, 762, r, false);
  return canvas;
}

const SIZE = 2.3;

export function createRotatingSnakes(): Exhibit {
  const root = new THREE.Group();

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(SIZE + 0.18, SIZE + 0.18, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x2a2016, roughness: 0.6 }),
  );
  frame.position.y = 1.8;
  frame.castShadow = true;
  root.add(frame);

  const texture = new THREE.CanvasTexture(createSnakesCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const painting = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE, SIZE),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }),
  );
  painting.position.set(0, 1.8, 0.04);
  root.add(painting);

  const label = createWallLabel('回転蛇錯視');
  label.position.set(0.45, 0.5, 0.02);
  root.add(label);

  return {
    id: 'rotating-snakes',
    title: '回転蛇錯視',
    hint:
      'この絵は完全な静止画です。それでも視線を動かしたり周辺視で眺めたりすると、円盤がゆっくり回転して見えます。黒 → 青 → 白 → 黄という明るさの非対称な並びを、目と脳の応答速度の差が「動き」として誤検出するためです。1 点をじっと見つめると回転は止まります。',
    root,
    triggerRadius: 3.4,
  };
}
