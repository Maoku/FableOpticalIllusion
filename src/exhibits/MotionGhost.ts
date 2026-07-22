import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * オリジナル展示「動きが生む幽霊」(インタラクティブ)。
 *
 * 暗いブースの中に光る点が漂っている。静止したどの一瞬を切り取っても
 * 形は読めないが、動き出した瞬間、点の群れの中に回転する人影が
 * はっきりと立ち上がる。形の情報が一枚の絵ではなく「動きの中」にだけ
 * 書き込まれた彫像——脳は共通の動きをする点を一つの物体として束ね、
 * 奥行きまで復元してしまう(運動からの構造復元)。
 *
 * クリック / F で全体を静止させると、人影は点の群れに溶けて消える。
 */

/** 人影を構成する球の集まり(中心 x, y, z と半径)。表面に点を撒く */
const FIGURE_SPHERES: Array<[number, number, number, number]> = [
  [0, 2.02, 0, 0.17], // 頭
  [0, 1.86, 0, 0.09], // 首
  [0, 1.68, 0, 0.24], // 胸
  [0, 1.5, 0, 0.26],
  [0, 1.32, 0, 0.25],
  [0, 1.16, 0, 0.23],
  [0, 1.05, 0, 0.22], // 腰
  // 脚(左右)
  [-0.13, 0.9, 0, 0.12],
  [0.13, 0.9, 0, 0.12],
  [-0.14, 0.72, 0, 0.11],
  [0.14, 0.72, 0, 0.11],
  [-0.15, 0.52, 0, 0.1],
  [0.15, 0.52, 0, 0.1],
  [-0.16, 0.32, 0, 0.1],
  [0.16, 0.32, 0, 0.1],
  [-0.17, 0.12, 0.03, 0.09],
  [0.17, 0.12, 0.03, 0.09],
  [-0.18, 0.06, 0.12, 0.08], // 足先
  [0.18, 0.06, 0.12, 0.08],
  // 腕(左右)
  [-0.3, 1.66, 0, 0.11],
  [0.3, 1.66, 0, 0.11],
  [-0.36, 1.48, 0, 0.09],
  [0.36, 1.48, 0, 0.09],
  [-0.4, 1.3, 0, 0.08],
  [0.4, 1.3, 0, 0.08],
  [-0.43, 1.12, 0, 0.08],
  [0.43, 1.12, 0, 0.08],
  [-0.45, 0.98, 0, 0.07], // 手
  [0.45, 0.98, 0, 0.07],
];

const DOT_DENSITY = 1400; // 球 1 つあたりの点数 = 半径² × この係数
const AMBIENT_COUNT = 650; // 人影を紛れさせる漂い点の数
const AMBIENT_BOUNDS = { x: 1.25, yMin: 0.05, yMax: 2.85, zMin: -0.9, zMax: 0.75 };
const ROTATE_SPEED = 0.85;

export function createMotionGhost(): Exhibit {
  const root = new THREE.Group();

  // --- 暗いブース(前面開放) ---
  const innerMat = new THREE.MeshStandardMaterial({ color: 0x131118, roughness: 1 });
  const addBox = (w: number, h: number, d: number, x: number, y: number, z: number): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), innerMat);
    mesh.position.set(x, y, z);
    root.add(mesh);
  };
  addBox(2.9, 2.95, 0.1, 0, 1.475, -1.0); // 奥壁
  addBox(0.1, 2.95, 1.9, -1.4, 1.475, -0.05); // 左壁
  addBox(0.1, 2.95, 1.9, 1.4, 1.475, -0.05); // 右壁
  addBox(2.9, 0.1, 1.9, 0, 3.0, -0.05); // 天板
  addBox(2.9, 0.04, 1.9, 0, 0.02, -0.05); // 床板

  // 手すり(中に入って種を近くで見られないように)
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x8a713f,
    roughness: 0.4,
    metalness: 0.5,
  });
  for (const x of [-1.25, 1.25]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 10), railMat);
    post.position.set(x, 0.4, 0.86);
    root.add(post);
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 10), railMat);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 0.8, 0.86);
  root.add(rail);

  // --- 点群: 人影(球面サンプル)+漂う点 ---
  const figureBase: number[] = [];
  const v = new THREE.Vector3();
  for (const [cx, cy, cz, r] of FIGURE_SPHERES) {
    const count = Math.max(6, Math.round(r * r * DOT_DENSITY));
    for (let i = 0; i < count; i++) {
      v.randomDirection().multiplyScalar(r);
      figureBase.push(cx + v.x, cy + v.y, cz + v.z);
    }
  }
  const figureCount = figureBase.length / 3;

  const ambientPos: number[] = [];
  const ambientVel: number[] = [];
  for (let i = 0; i < AMBIENT_COUNT; i++) {
    ambientPos.push(
      (Math.random() * 2 - 1) * AMBIENT_BOUNDS.x,
      AMBIENT_BOUNDS.yMin + Math.random() * (AMBIENT_BOUNDS.yMax - AMBIENT_BOUNDS.yMin),
      AMBIENT_BOUNDS.zMin + Math.random() * (AMBIENT_BOUNDS.zMax - AMBIENT_BOUNDS.zMin),
    );
    ambientVel.push(
      (Math.random() * 2 - 1) * 0.05,
      (Math.random() * 2 - 1) * 0.05,
      (Math.random() * 2 - 1) * 0.05,
    );
  }

  const positions = new Float32Array((figureCount + AMBIENT_COUNT) * 3);
  positions.set(figureBase);
  positions.set(ambientPos, figureCount * 3);
  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute('position', posAttr);
  // 点は毎フレーム動くため、バウンディングは固定で持たせて再計算を避ける
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.5, 0), 3);

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xdce6ff, size: 0.024, sizeAttenuation: true }),
  );
  root.add(points);

  let paused = false;
  let envelope = 1;
  let theta = 0;

  return {
    id: 'motion-ghost',
    title: '動きが生む幽霊',
    hint:
      'ブースの中にあるのは、光る点の群れだけ。静止させると奥行きが消え、平らな点の紋様にしか見えません。しかし動き出した瞬間、点の群れは回転する立体の人影として立ち上がります。人影の点はどれも背景の点と同じただの光点で、違いは「一緒に動くかどうか」だけ。脳は共通の運命をたどる点を一つの物体として束ね、その動きから立体構造まで復元してしまうのです。形が一枚の絵ではなく時間の中にだけ存在する彫像——Fable が考案したオリジナル作品です。',
    root,
    viewSpot: {
      position: new THREE.Vector3(0, 1.6, 3.0),
      target: new THREE.Vector3(0, 1.45, 0),
    },
    triggerRadius: 4.5,
    interactionHint: 'クリック / F: 動きを止める / 動かす',
    touchInteractionHint: '「操作」: 動きを止める / 動かす',
    onOperate(): void {
      paused = !paused;
    },
    update(dt: number): void {
      envelope += ((paused ? 0 : 1) - envelope) * Math.min(1, dt * 3);
      if (envelope < 0.005) return;

      theta += dt * ROTATE_SPEED * envelope;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      for (let i = 0; i < figureCount; i++) {
        const bx = figureBase[i * 3];
        const bz = figureBase[i * 3 + 2];
        positions[i * 3] = bx * cos + bz * sin;
        positions[i * 3 + 2] = -bx * sin + bz * cos;
      }
      const drift = dt * envelope;
      for (let i = 0; i < AMBIENT_COUNT; i++) {
        const o = (figureCount + i) * 3;
        positions[o] += ambientVel[i * 3] * drift;
        positions[o + 1] += ambientVel[i * 3 + 1] * drift;
        positions[o + 2] += ambientVel[i * 3 + 2] * drift;
        // 範囲を出たら反対側から戻す
        if (positions[o] > AMBIENT_BOUNDS.x) positions[o] = -AMBIENT_BOUNDS.x;
        if (positions[o] < -AMBIENT_BOUNDS.x) positions[o] = AMBIENT_BOUNDS.x;
        if (positions[o + 1] > AMBIENT_BOUNDS.yMax) positions[o + 1] = AMBIENT_BOUNDS.yMin;
        if (positions[o + 1] < AMBIENT_BOUNDS.yMin) positions[o + 1] = AMBIENT_BOUNDS.yMax;
        if (positions[o + 2] > AMBIENT_BOUNDS.zMax) positions[o + 2] = AMBIENT_BOUNDS.zMin;
        if (positions[o + 2] < AMBIENT_BOUNDS.zMin) positions[o + 2] = AMBIENT_BOUNDS.zMax;
      }
      posAttr.needsUpdate = true;
    },
    colliders: [
      new THREE.Box3(new THREE.Vector3(-1.45, 0, -1.05), new THREE.Vector3(-1.35, 3.05, 0.9)),
      new THREE.Box3(new THREE.Vector3(1.35, 0, -1.05), new THREE.Vector3(1.45, 3.05, 0.9)),
      new THREE.Box3(new THREE.Vector3(-1.45, 0, -1.05), new THREE.Vector3(1.45, 3.05, -0.95)),
      // 手すり
      new THREE.Box3(new THREE.Vector3(-1.35, 0, 0.78), new THREE.Vector3(1.35, 0.85, 0.94)),
    ],
  };
}
