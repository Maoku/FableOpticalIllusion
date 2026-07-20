import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * エイムズの部屋(強制遠近法)。
 *
 * 覗き窓の目の位置 P を基準に、まっすぐな「仮想の部屋」の各頂点を
 * 視線に沿ってスケールした歪んだ部屋を実際に構築する。
 * 点 v を v' = P + s(v)・(v - P) に動かしても P からの見え方は変わらないため、
 * 覗き窓からは普通の長方形の部屋に見える。s は画面横方向に応じて
 * 左端 1.0 → 右端 0.52 と変化させており、部屋の左奥は遠く、右奥は近い。
 * その結果、同じ大きさの 2 体の人形が、まったく違う大きさに見える。
 *
 * ローカル座標系: 覗き窓の目の位置が (0, 1.6, 0)、部屋は z < 0 に広がる。
 */

export const AMES_EYE = new THREE.Vector3(0, 1.6, 0); // 覗き窓の目の位置
const P = AMES_EYE;
const ROOM_W = 1.8; // 仮想の部屋の半幅
const ROOM_H = 2.4; // 仮想の部屋の高さ
const ROOM_NEAR = -0.4;
const ROOM_FAR = -3.4;
const S_LEFT = 1.0;
const S_RIGHT = 0.52;
const H_RANGE = 0.55; // 正規化に使う横方向視線係数の範囲

/** 画面横方向の位置に応じたスケール係数(テストのため export) */
export function scaleAt(v: THREE.Vector3): number {
  const h = (v.x - P.x) / (P.z - v.z);
  const u = THREE.MathUtils.clamp((h + H_RANGE) / (2 * H_RANGE), 0, 1);
  return THREE.MathUtils.lerp(S_LEFT, S_RIGHT, u);
}

/** 仮想の部屋の点を、視線に沿って実際の(歪んだ)位置へ動かす(テストのため export) */
export function distort(v: THREE.Vector3): THREE.Vector3 {
  return P.clone().addScaledVector(v.clone().sub(P), scaleAt(v));
}

function createCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

function drawChecker(ctx: CanvasRenderingContext2D, size: number): void {
  const n = 8;
  const cell = size / n;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#b9a98c' : '#6d5f4b';
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }
}

function drawWallpaper(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#cfc4ae';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(122, 106, 84, 0.5)';
  ctx.lineWidth = 6;
  for (let x = 0; x <= size; x += size / 6) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
}

/**
 * 仮想の部屋の面(パラメトリック定義)を歪ませたメッシュにする。
 * グリッドを細かく切ることで、視線に沿った歪みを区分線形で近似する。
 */
function buildDistortedSurface(
  pointAt: (u: number, v: number) => THREE.Vector3,
  material: THREE.Material,
  segments = 24,
): THREE.Mesh {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let iv = 0; iv <= segments; iv++) {
    for (let iu = 0; iu <= segments; iu++) {
      const u = iu / segments;
      const v = iv / segments;
      const p = distort(pointAt(u, v));
      positions.push(p.x, p.y, p.z);
      uvs.push(u, v);
    }
  }
  for (let iv = 0; iv < segments; iv++) {
    for (let iu = 0; iu < segments; iu++) {
      const a = iv * (segments + 1) + iu;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

/** 同じ大きさの単純な人形 */
function createDoll(color: number): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.24, 6, 16), material);
  body.position.y = 0.21;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), material);
  head.position.y = 0.46;
  group.add(head);
  return group;
}

export function createAmesRoom(): Exhibit {
  const root = new THREE.Group();

  const side = THREE.DoubleSide;
  const floorMat = new THREE.MeshStandardMaterial({
    map: createCanvasTexture(drawChecker, 3, 3),
    roughness: 0.9,
    side,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    map: createCanvasTexture(drawWallpaper, 3, 1),
    roughness: 1,
    side,
  });
  const backMat = new THREE.MeshStandardMaterial({
    map: createCanvasTexture(drawWallpaper, 2, 1),
    roughness: 1,
    side,
  });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 1, side });

  const lerp = THREE.MathUtils.lerp;
  // 床・天井・奥壁・左右の壁(仮想の部屋 → 歪ませて構築)
  root.add(
    buildDistortedSurface(
      (u, v) => new THREE.Vector3(lerp(-ROOM_W, ROOM_W, u), 0.001, lerp(ROOM_NEAR, ROOM_FAR, v)),
      floorMat,
    ),
    buildDistortedSurface(
      (u, v) => new THREE.Vector3(lerp(-ROOM_W, ROOM_W, u), ROOM_H, lerp(ROOM_NEAR, ROOM_FAR, v)),
      ceilMat,
    ),
    buildDistortedSurface(
      (u, v) => new THREE.Vector3(lerp(-ROOM_W, ROOM_W, u), lerp(0, ROOM_H, v), ROOM_FAR),
      backMat,
    ),
    buildDistortedSurface(
      (u, v) => new THREE.Vector3(-ROOM_W, lerp(0, ROOM_H, v), lerp(ROOM_NEAR, ROOM_FAR, u)),
      wallMat,
    ),
    buildDistortedSurface(
      (u, v) => new THREE.Vector3(ROOM_W, lerp(0, ROOM_H, v), lerp(ROOM_NEAR, ROOM_FAR, u)),
      wallMat,
    ),
  );

  // 同じ大きさの人形を左奥(遠い)と右奥(近い)へ
  const dollLeft = createDoll(0xc84b4b);
  const posLeft = distort(new THREE.Vector3(-1.25, 0, -3.0));
  dollLeft.position.copy(posLeft);
  root.add(dollLeft);

  const dollRight = createDoll(0x4b6ec8);
  const posRight = distort(new THREE.Vector3(1.25, 0, -3.0));
  dollRight.position.copy(posRight);
  root.add(dollRight);

  // 部屋の中の照明
  const light = new THREE.PointLight(0xfff0dd, 5, 10, 1.8);
  light.position.copy(distort(new THREE.Vector3(0, 1.75, -1.4)));
  root.add(light);

  // --- 外側の囲い(覗き窓のある箱) ---
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x35313c, roughness: 0.9 });
  const shell = new THREE.Group();
  const addShellBox = (
    cx: number,
    cy: number,
    cz: number,
    w: number,
    h: number,
    d: number,
  ): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shellMat);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true;
    shell.add(mesh);
  };
  const W = 2.1; // 囲い半幅
  const D = 3.7; // 囲い奥行き
  const H = 3.0; // 囲い高さ
  const T = 0.12; // 壁厚
  // 覗き窓(0.46 x 0.36、中心 y=1.6)の開いた前面壁
  const winW = 0.52;
  const winH = 0.52;
  addShellBox(-(W / 2 + winW / 4), H / 2, T / 2, W - winW / 2, H, T);
  addShellBox(W / 2 + winW / 4, H / 2, T / 2, W - winW / 2, H, T);
  addShellBox(0, (1.6 - winH / 2) / 2, T / 2, winW, 1.6 - winH / 2, T);
  addShellBox(0, 1.6 + winH / 2 + (H - 1.6 - winH / 2) / 2, T / 2, winW, H - 1.6 - winH / 2, T);
  // 背面・側面・天井
  addShellBox(0, H / 2, -D - T / 2, 2 * W + 2 * T, H, T);
  addShellBox(-W - T / 2, H / 2, -D / 2, T, H, D + T);
  addShellBox(W + T / 2, H / 2, -D / 2, T, H, D + T);
  addShellBox(0, H + T / 2, -D / 2, 2 * W + 2 * T, T, D + T);
  root.add(shell);

  return {
    id: 'ames-room',
    title: 'エイムズの部屋',
    hint:
      '覗き窓から見えるのは普通の長方形の部屋ですが、実際の部屋は大きく歪んでいます。左奥の角は遠く低く、右奥の角は近く高い台形の部屋で、覗き窓の一点からだけ長方形に見えるよう設計されています。2 体の人形はまったく同じ大きさですが、片方は遠く、片方は近くに立っているため、大きさが激変して見えます。',
    root,
    viewSpot: {
      position: new THREE.Vector3(0, 1.6, 0.5),
      target: new THREE.Vector3(0, 1.25, -2.5),
    },
    triggerRadius: 3.2,
    colliders: [
      new THREE.Box3(new THREE.Vector3(-W - T, 0, -D - T), new THREE.Vector3(W + T, H + T, T)),
    ],
  };
}
