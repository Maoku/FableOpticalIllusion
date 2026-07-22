import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * オリジナル展示「消える林」。
 *
 * 壁画の前に 23 本の柱が林のように立っているが、ビュースポットに立つと
 * 林全体が壁画に溶けて一斉に消える。一歩ずれた瞬間、色の縞をまとった
 * 柱の群れが現れる。
 *
 * 作り方: 各柱の正面テクスチャを 1 ピクセルずつ「ビュースポットの目から
 * そのピクセルを通る視線が背後の壁画に当たる色」で塗る(逆投影)。
 * つまり柱の表面には「そこに柱がなければ見えたはずの景色」が正確に
 * 描かれており、視点が一致した時だけ完全なカモフラージュが成立する。
 */

const EYE = new THREE.Vector3(0, 1.6, 5.2); // ビュースポット(ローカル)
const MURAL_W = 8;
const MURAL_H = 4.2;
const MURAL_BOTTOM = 0.1;
const MURAL_CY = MURAL_BOTTOM + MURAL_H / 2;
const CANVAS_W = 1024;
const CANVAS_H = 512;

const PILLAR_W = 0.17;
const PILLAR_D = 0.09;
const DAIS_H = 0.12;
const DAIS_COLOR = '#332f38';
const WALL_COLOR = '#3d3a42';

/** 柱の配置(x, z, 高さ)。高さは投影が壁画の上端からはみ出ない範囲に抑えてある */
const PILLARS: Array<[number, number, number]> = [
  // 最前列 z=1.0(投影の拡大率が小さいので高くできる)
  [-2.8, 1.0, 3.3],
  [-1.9, 1.0, 3.5],
  [-0.9, 1.0, 3.2],
  [0.1, 1.0, 3.6],
  [1.2, 1.0, 3.4],
  [2.2, 1.0, 3.1],
  [2.9, 1.0, 3.3],
  // 2 列目 z=1.55
  [-2.4, 1.55, 3.0],
  [-1.4, 1.55, 3.2],
  [-0.4, 1.55, 2.9],
  [0.6, 1.55, 3.3],
  [1.6, 1.55, 3.1],
  [2.5, 1.55, 2.8],
  // 3 列目 z=2.1
  [-2.0, 2.1, 2.8],
  [-1.05, 2.1, 3.0],
  [-0.1, 2.1, 2.7],
  [0.9, 2.1, 2.9],
  [1.9, 2.1, 2.8],
  // 最奥列 z=2.65(壁画に近く拡大率が大きいので低め)
  [-1.6, 2.65, 2.5],
  [-0.75, 2.65, 2.7],
  [0.15, 2.65, 2.4],
  [1.05, 2.65, 2.6],
  [1.7, 2.65, 2.3],
];

/** 背後の壁画(夜の砂丘と太陽)。中間スケールの模様を多くして、ずれが分かりやすい絵にする */
function createMuralCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d')!;

  // 空: 深い藍→紫のグラデーション
  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  sky.addColorStop(0, '#171a4d');
  sky.addColorStop(0.55, '#4a2a6e');
  sky.addColorStop(1, '#7c3f74');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 星
  for (let i = 0; i < 130; i++) {
    const x = ((i * 379) % CANVAS_W) + (i % 7);
    const y = ((i * 173) % Math.floor(CANVAS_H * 0.45)) + 8;
    ctx.fillStyle = i % 3 === 0 ? '#ffe9b8' : '#cfd8ff';
    ctx.fillRect(x, y, 3, 3);
  }

  // 太陽: 同心リング
  const sunX = CANVAS_W * 0.67;
  const sunY = CANVAS_H * 0.32;
  const ringColors = ['#ffd166', '#ff9f45', '#f4633a', '#c2334d', '#ffd166'];
  for (let i = ringColors.length - 1; i >= 0; i--) {
    ctx.fillStyle = ringColors[i];
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34 + i * 26, 0, Math.PI * 2);
    ctx.fill();
  }

  // 遠景の山並み(ティール)
  ctx.fillStyle = '#1e5f6e';
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_H * 0.62);
  for (let x = 0; x <= CANVAS_W; x += 64) {
    const peak = CANVAS_H * (0.44 + 0.1 * Math.sin(x * 0.013 + 1.7));
    ctx.lineTo(x + 32, peak);
    ctx.lineTo(x + 64, CANVAS_H * 0.62);
  }
  ctx.lineTo(CANVAS_W, CANVAS_H);
  ctx.lineTo(0, CANVAS_H);
  ctx.fill();

  // 砂丘: 波打つ色帯
  const duneColors = ['#e0653f', '#b93a63', '#7c2d5e', '#4d2050'];
  duneColors.forEach((color, i) => {
    const base = CANVAS_H * (0.6 + i * 0.11);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, base);
    for (let x = 0; x <= CANVAS_W; x += 16) {
      ctx.lineTo(x, base + Math.sin(x * 0.02 + i * 2.1) * 14);
    }
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.lineTo(0, CANVAS_H);
    ctx.fill();
  });

  // 川: 蛇行するシアンの帯
  ctx.strokeStyle = '#4fd8e0';
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(CANVAS_W * 0.12, CANVAS_H);
  ctx.bezierCurveTo(
    CANVAS_W * 0.3,
    CANVAS_H * 0.82,
    CANVAS_W * 0.05,
    CANVAS_H * 0.72,
    CANVAS_W * 0.33,
    CANVAS_H * 0.63,
  );
  ctx.stroke();

  // 最下段は台座の色の帯にして、柱の足元の投影(台座色)と絵の境目を目立たなくする
  ctx.fillStyle = DAIS_COLOR;
  ctx.fillRect(0, CANVAS_H - 20, CANVAS_W, 20);

  return canvas;
}

/** 壁画キャンバス上の色を取り出すサンプラー */
function createMuralSampler(canvas: HTMLCanvasElement) {
  const data = canvas.getContext('2d')!.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
  return (x: number, y: number): string => {
    // 壁画ローカル座標(x: 中心 0、y: 床から)→ キャンバスピクセル
    const px = Math.floor(((x + MURAL_W / 2) / MURAL_W) * CANVAS_W);
    const py = Math.floor(((MURAL_BOTTOM + MURAL_H - y) / MURAL_H) * CANVAS_H);
    if (px < 0 || px >= CANVAS_W || py < 0 || py >= CANVAS_H) {
      // 壁画の外: 下は台座の色、それ以外は建物の壁の色に合わせる
      return y < MURAL_BOTTOM + 0.25 ? DAIS_COLOR : WALL_COLOR;
    }
    const i = (py * CANVAS_W + px) * 4;
    return `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
  };
}

/** 柱 1 本分の正面テクスチャを、目からの視線の逆投影で 1 ピクセルずつ塗る */
function createPillarCanvas(
  x: number,
  z: number,
  h: number,
  yaw: number,
  sample: (x: number, y: number) => string,
): HTMLCanvasElement {
  const W = 48;
  const H = 384;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const n = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); // 正面の法線(目の方向)
  const r = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); // 正面のローカル +x 方向
  const fx = x + n.x * (PILLAR_D / 2);
  const fz = z + n.z * (PILLAR_D / 2);

  const p = new THREE.Vector3();
  for (let py = 0; py < H; py++) {
    const y = DAIS_H + (1 - (py + 0.5) / H) * h;
    for (let px = 0; px < W; px++) {
      const lateral = ((px + 0.5) / W - 0.5) * PILLAR_W;
      p.set(fx + r.x * lateral, y, fz + r.z * lateral);
      // 目 → ピクセルの視線を壁画平面(z=0)まで延長する
      const t = (0 - EYE.z) / (p.z - EYE.z);
      const hitX = EYE.x + (p.x - EYE.x) * t;
      const hitY = EYE.y + (p.y - EYE.y) * t;
      ctx.fillStyle = sample(hitX, hitY);
      ctx.fillRect(px, py, 1, 1);
    }
  }
  return canvas;
}

export function createVanishingGrove(): Exhibit {
  const root = new THREE.Group();

  const muralCanvas = createMuralCanvas();
  const sample = createMuralSampler(muralCanvas);

  // 壁画(照明で色が変わるとカモフラージュが崩れるため、柱ともども MeshBasicMaterial)
  const muralTexture = new THREE.CanvasTexture(muralCanvas);
  muralTexture.colorSpace = THREE.SRGBColorSpace;
  muralTexture.anisotropy = 8;
  const mural = new THREE.Mesh(
    new THREE.PlaneGeometry(MURAL_W, MURAL_H),
    new THREE.MeshBasicMaterial({ map: muralTexture }),
  );
  mural.position.set(0, MURAL_CY, 0.004);
  root.add(mural);

  // 台座(柱の足元の投影先になるため、単色・無照明で塗りを一致させる)
  const dais = new THREE.Mesh(
    new THREE.BoxGeometry(MURAL_W + 0.5, DAIS_H, 3.5),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(DAIS_COLOR) }),
  );
  dais.position.set(0, DAIS_H / 2, 1.6);
  root.add(dais);

  // 柱の林
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x232026, roughness: 0.95 });
  for (const [x, z, h] of PILLARS) {
    const yaw = Math.atan2(EYE.x - x, EYE.z - z);
    const texture = new THREE.CanvasTexture(createPillarCanvas(x, z, h, yaw, sample));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const frontMat = new THREE.MeshBasicMaterial({ map: texture });
    // BoxGeometry のマテリアル順: [+x, -x, +y, -y, +z(正面), -z]
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(PILLAR_W, h, PILLAR_D), [
      sideMat,
      sideMat,
      sideMat,
      sideMat,
      frontMat,
      sideMat,
    ]);
    pillar.position.set(x, DAIS_H + h / 2, z);
    pillar.rotation.y = yaw;
    root.add(pillar);
  }

  return {
    id: 'vanishing-grove',
    title: '消える林',
    hint:
      '壁画の前には 23 本の柱が林のように立っています。しかし金のマーカーに立った瞬間、林はまるごと壁画に溶けて消えます。各柱の表面には「ビュースポットからその柱越しに見えるはずの景色」が 1 ピクセルずつ逆投影で描いてあり、視点が一致した時だけ完全なカモフラージュが成立するのです。一歩ずれると、縞をまとった柱の群れが姿を現します。既知の錯視の再現ではなく、Fable が考案したオリジナル作品です。',
    root,
    viewSpot: {
      position: EYE.clone(),
      target: new THREE.Vector3(0, 2.0, 0),
    },
    triggerRadius: 6.8,
    colliders: [
      new THREE.Box3(new THREE.Vector3(-4.35, 0, -0.2), new THREE.Vector3(4.35, 2.2, 3.45)),
    ],
  };
}
