import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * アナモルフォーシス(歪像画)。
 *
 * 目の位置 E の前方に「仮想スクリーン」(正しい絵が見える板)を想定し、
 * そのグリッド各点を E からの視線で床・壁へ投影した位置に頂点を置いた
 * メッシュに絵を貼る。結果として床・壁には大きく歪んだ絵が描かれるが、
 * ビュースポットから見るとちょうど仮想スクリーン上の正しい絵に見える。
 *
 * ローカル座標系: 壁面が z=0、床が y=0。絵は +Z 側の床・壁に広がり、
 * ビュースポットは (0, 1.6, 4.2)。
 */

const EYE = new THREE.Vector3(0, 1.6, 4.2);
const QUAD_CENTER = new THREE.Vector3(0, 1.0, 1.6); // 仮想スクリーンの中心
const QUAD_SIZE = 1.7;
const GRID = 32;
const EPS = 0.02;

/** 歪像画の元絵(仮想スクリーンに見える絵)を描く */
function createArtworkCanvas(): HTMLCanvasElement {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 金のリング
  ctx.lineWidth = 44;
  const ringGrad = ctx.createLinearGradient(200, 300, 820, 900);
  ringGrad.addColorStop(0, '#f5d78a');
  ringGrad.addColorStop(0.5, '#c9973f');
  ringGrad.addColorStop(1, '#8a6320');
  ctx.strokeStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(512, 610, 270, 0, Math.PI * 2);
  ctx.stroke();

  // リングに浮かぶシアンのワイヤーフレーム立方体
  ctx.strokeStyle = '#5fe8ff';
  ctx.lineWidth = 14;
  ctx.lineJoin = 'round';
  const cube = (cx: number, cy: number, s: number, o: number): void => {
    ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
    ctx.strokeRect(cx - s / 2 + o, cy - s / 2 - o, s, s);
    for (const [dx, dy] of [
      [-s / 2, -s / 2],
      [s / 2, -s / 2],
      [-s / 2, s / 2],
      [s / 2, s / 2],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + dy);
      ctx.lineTo(cx + dx + o, cy + dy - o);
      ctx.stroke();
    }
  };
  cube(512, 560, 300, 90);

  // タイトル文字
  ctx.fillStyle = '#ff7bd5';
  ctx.font = 'bold 120px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FABLE', 512, 150);

  return canvas;
}

/** 仮想スクリーン上の点を、目からの視線で床(y=EPS)または壁(z=EPS)へ投影する */
function projectToSurfaces(p: THREE.Vector3): THREE.Vector3 {
  const dir = new THREE.Vector3().subVectors(p, EYE);
  // 床との交点
  if (dir.y < -1e-6) {
    const t = (EPS - EYE.y) / dir.y;
    const hit = EYE.clone().addScaledVector(dir, t);
    if (hit.z >= EPS * 2) return hit;
  }
  // 床に落ちない(または壁の裏に抜ける)視線は壁へ
  const tw = (EPS - EYE.z) / dir.z;
  return EYE.clone().addScaledVector(dir, tw);
}

function createProjectedMesh(): THREE.Mesh {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= GRID; iy++) {
    for (let ix = 0; ix <= GRID; ix++) {
      const u = ix / GRID;
      const v = iy / GRID;
      const point = new THREE.Vector3(
        QUAD_CENTER.x + (u - 0.5) * QUAD_SIZE,
        QUAD_CENTER.y + (0.5 - v) * QUAD_SIZE,
        QUAD_CENTER.z,
      );
      const hit = projectToSurfaces(point);
      positions.push(hit.x, hit.y, hit.z);
      uvs.push(u, 1 - v);
    }
  }
  for (let iy = 0; iy < GRID; iy++) {
    for (let ix = 0; ix < GRID; ix++) {
      const a = iy * (GRID + 1) + ix;
      const b = a + 1;
      const c = a + (GRID + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const texture = new THREE.CanvasTexture(createArtworkCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
}

export function createAnamorphosis(): Exhibit {
  const root = new THREE.Group();
  root.add(createProjectedMesh());

  return {
    id: 'anamorphosis',
    title: 'アナモルフォーシス(歪像画)',
    hint:
      '床と壁に大きく引き伸ばされて描かれた絵は、床マーカーの視点から見た時だけ、空中に浮かぶ正しい絵として立ち上がって見えます。ストリートアートのトリック 3D アートと同じ原理で、視線に沿って絵を投影して描いてあります。',
    root,
    viewSpot: {
      position: EYE.clone(),
      target: QUAD_CENTER.clone(),
    },
    triggerRadius: 4.5,
  };
}
