import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * オリジナル展示「二つの真実(REAL / FAKE)」。
 *
 * 宙に浮かぶ数千個の金のキューブの雲。それ自体は無意味な点群だが、
 * 南のビュースポットから見ると「REAL」、東のビュースポットから見ると
 * 「FAKE」と読める。2 視点アナモルフォーシス。
 *
 * 作り方: 雲の直方体の中で点をランダムに採り、その点を両方の視点へ
 * 透視投影する。投影先が「両方の視点の文字ビットマップの黒い画素」に
 * 同時に載る点だけを採用(棄却サンプリング)してキューブを置く。
 * つまり各キューブは、2 つの文字の視線束が空中で交差する場所にだけ存在する。
 */

const WORD_A = 'REAL';
const WORD_B = 'FAKE';

const CLOUD = { w: 1.35, h: 0.52, d: 1.35 }; // 雲の直方体サイズ
const CLOUD_CY = 1.22; // 雲の中心高さ
const EYE_A = new THREE.Vector3(0, 1.6, 3.1); // 南のビュースポット
const EYE_B = new THREE.Vector3(3.1, 1.6, 0); // 東のビュースポット
const CENTER = new THREE.Vector3(0, CLOUD_CY, 0);
const MAX_CUBES = 9000;
const MAX_TRIES = 400000;

interface WordBitmap {
  isOn(u: number, v: number): boolean; // u, v ∈ [0,1](左上原点)
}

function createWordBitmap(word: string): WordBitmap {
  const W = 256;
  const H = 88;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 72px 'Arial Black', 'Hiragino Sans', sans-serif`;
  // 文字間を空けて、キューブの太りによる潰れを防ぐ
  ctx.letterSpacing = '8px';
  ctx.fillText(word, W / 2, H / 2 + 4);
  const data = ctx.getImageData(0, 0, W, H).data;
  return {
    isOn(u: number, v: number): boolean {
      if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
      const x = Math.floor(u * W);
      const y = Math.floor(v * H);
      return data[(y * W + x) * 4 + 3] > 96;
    },
  };
}

/** 視点ごとの透視投影(点 → 文字ビットマップの UV) */
class Projector {
  private readonly eye: THREE.Vector3;
  private readonly forward: THREE.Vector3;
  private readonly right: THREE.Vector3;
  private readonly up: THREE.Vector3;
  private readonly tanU: number;
  private readonly tanV: number;

  constructor(eye: THREE.Vector3) {
    this.eye = eye;
    this.forward = CENTER.clone().sub(eye).normalize();
    this.right = new THREE.Vector3().crossVectors(this.forward, new THREE.Vector3(0, 1, 0));
    this.right.normalize();
    this.up = new THREE.Vector3().crossVectors(this.right, this.forward).normalize();
    // 文字が雲の幅・高さいっぱいに見えるように視野を決める
    const dist = CENTER.distanceTo(eye);
    this.tanU = CLOUD.w / 2 / dist;
    this.tanV = (CLOUD.h / 2 / dist) * 1.05;
  }

  /** 戻り値は [0,1]^2 の UV(ビットマップ座標)。範囲外もそのまま返す */
  project(p: THREE.Vector3): [number, number] {
    const w = p.clone().sub(this.eye);
    const f = w.dot(this.forward);
    const u = w.dot(this.right) / f / this.tanU;
    const v = w.dot(this.up) / f / this.tanV;
    return [(u + 1) / 2, 1 - (v + 1) / 2];
  }
}

function createCloudMesh(): THREE.InstancedMesh {
  const bitmapA = createWordBitmap(WORD_A);
  const bitmapB = createWordBitmap(WORD_B);
  const projA = new Projector(EYE_A);
  const projB = new Projector(EYE_B);

  const accepted: THREE.Vector3[] = [];
  const p = new THREE.Vector3();
  for (let i = 0; i < MAX_TRIES && accepted.length < MAX_CUBES; i++) {
    p.set(
      (Math.random() - 0.5) * CLOUD.w,
      CLOUD_CY + (Math.random() - 0.5) * CLOUD.h,
      (Math.random() - 0.5) * CLOUD.d,
    );
    const [ua, va] = projA.project(p);
    if (!bitmapA.isOn(ua, va)) continue;
    const [ub, vb] = projB.project(p);
    if (!bitmapB.isOn(ub, vb)) continue;
    accepted.push(p.clone());
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.45,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, accepted.length);
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  accepted.forEach((pos, i) => {
    const s = 0.013 + Math.random() * 0.013;
    scale.setScalar(s);
    quat.setFromEuler(
      new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
    );
    matrix.compose(pos, quat, scale);
    mesh.setMatrixAt(i, matrix);
    // 金色のバリエーション
    color.setHSL(0.11 + Math.random() * 0.03, 0.75, 0.5 + Math.random() * 0.25);
    mesh.setColorAt(i, color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

export function createTwoTruths(): Exhibit {
  const root = new THREE.Group();

  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.72, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x2c2a30, roughness: 0.9 }),
  );
  pedestal.position.y = 0.36;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  root.add(pedestal);

  root.add(createCloudMesh());

  return {
    id: 'two-truths',
    title: '二つの真実(REAL / FAKE)',
    hint:
      'この金の粒の雲は、南のマーカーから見ると「REAL」、東のマーカーから見ると「FAKE」と読めます。それ以外の場所からはただの無意味な点の集まりです。各粒は「2 つの視点から文字の上に重なって見える場所」だけを選んで空中に置かれています。真実は、どこから見るかで変わる——当館のオリジナル作品です。',
    root,
    viewSpot: {
      position: EYE_A.clone(),
      target: CENTER.clone(),
    },
    extraViewSpots: [
      {
        position: EYE_B.clone(),
        target: CENTER.clone(),
      },
    ],
    triggerRadius: 4,
    colliders: [new THREE.Box3().setFromObject(pedestal)],
  };
}
