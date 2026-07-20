import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * ホロウフェイス(凹面の顔)。
 *
 * 顔の高さマップをプロシージャルに生成し、奥行きを反転させた「凹んだ顔」を
 * 展示する。人間の脳は顔を必ず凸として解釈するため、凹面の顔は
 * 飛び出して見え、ゆっくり回転すると視線を追いかけてくるように感じられる。
 * 裏側(凸面)は普通の顔に見える。外部メッシュに頼らず楕円ドーム+
 * ガウス起伏の合成で顔を作る(計画書の簡易生成案)。
 */

const FACE_W = 0.5; // 顔の半幅
const FACE_H = 0.66; // 顔の半高
const SEG_R = 48; // 半径方向の分割数
const SEG_A = 96; // 周方向の分割数

/** 凸の顔としての高さ(+z 方向)。凹面はこれを反転して使う */
function faceHeight(x: number, y: number): number {
  const nx = x / FACE_W;
  const ny = y / FACE_H;
  const r2 = nx * nx + ny * ny;
  if (r2 >= 1) return 0;

  const gauss = (cx: number, cy: number, sx: number, sy: number, amp: number): number => {
    const dx = (x - cx) / sx;
    const dy = (y - cy) / sy;
    return amp * Math.exp(-(dx * dx + dy * dy));
  };

  // ベースの楕円ドーム(縁でなめらかに 0 になる)
  let z = 0.26 * Math.sqrt(1 - r2);
  // 鼻
  z += gauss(0, -0.06, 0.07, 0.13, 0.17);
  // 眉のひさし
  z += gauss(-0.15, 0.16, 0.1, 0.05, 0.06);
  z += gauss(0.15, 0.16, 0.1, 0.05, 0.06);
  // 目のくぼみ
  z += gauss(-0.17, 0.09, 0.085, 0.06, -0.085);
  z += gauss(0.17, 0.09, 0.085, 0.06, -0.085);
  // 頬
  z += gauss(-0.26, -0.2, 0.11, 0.11, 0.045);
  z += gauss(0.26, -0.2, 0.11, 0.11, 0.045);
  // 口元と顎
  z += gauss(0, -0.36, 0.14, 0.05, 0.05);
  z += gauss(0, -0.54, 0.12, 0.08, 0.05);
  return z;
}

/**
 * 凹面(sign=-1)または凸面(sign=+1)の顔メッシュを作る。
 * 楕円ドメインを極座標グリッドで張ることで、縁がきれいな楕円になる。
 */
function createFaceGeometry(sign: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let ir = 0; ir <= SEG_R; ir++) {
    for (let ia = 0; ia <= SEG_A; ia++) {
      const r = ir / SEG_R;
      const theta = (ia / SEG_A) * Math.PI * 2;
      const x = r * FACE_W * Math.cos(theta);
      const y = r * FACE_H * Math.sin(theta);
      positions.push(x, y, sign * faceHeight(x, y));
    }
  }
  for (let ir = 0; ir < SEG_R; ir++) {
    for (let ia = 0; ia < SEG_A; ia++) {
      const a = ir * (SEG_A + 1) + ia;
      const b = a + 1;
      const c = a + SEG_A + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createHollowFace(): Exhibit {
  const root = new THREE.Group();

  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.0, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x2c2a30, roughness: 0.9 }),
  );
  pedestal.position.y = 0.5;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  root.add(pedestal);

  // 支柱は顔の裏側に立てる。凹面の最深部(z ≈ -0.45)より必ず後ろに置き、
  // 首振り回転(±0.65rad で |z| は最大 0.45)でも正面視で鼻に干渉しないようにする
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4550, roughness: 0.7 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 12), poleMaterial);
  pole.position.set(0, 1.42, -0.58);
  root.add(pole);

  // 凹面の顔(開口部が +z、つまり鑑賞者側を向く)
  const faceMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9b08c,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
  const face = new THREE.Mesh(createFaceGeometry(-1), faceMaterial);
  face.position.y = 1.75;
  const faceHolder = new THREE.Group();
  faceHolder.position.set(0, 0, 0);
  faceHolder.add(face);
  root.add(faceHolder);

  // 下からの照明(奥行き反転の知覚を強める)
  const underLight = new THREE.PointLight(0xffe2c4, 3.5, 5, 1.8);
  underLight.position.set(0, 1.05, 0.55);
  root.add(underLight);

  let time = 0;

  return {
    id: 'hollow-face',
    title: 'ホロウフェイス(凹面の顔)',
    hint:
      'この顔は飛び出しているように見えますが、実際はお面の内側のように凹んでいます。脳は「顔は必ず凸である」という強い前提を持つため、陰影の手がかりを無視してでも凸の顔として解釈します。顔がゆっくり回転すると、凹面ゆえに見え方が逆転し、こちらを追いかけてくるように感じられます。横や裏に回り込むと、本当の形が分かります。',
    root,
    viewSpot: {
      position: new THREE.Vector3(0, 1.6, 2.3),
      target: new THREE.Vector3(0, 1.75, 0),
    },
    triggerRadius: 3.5,
    colliders: [new THREE.Box3().setFromObject(pedestal)],
    update(dt: number): void {
      time += dt;
      faceHolder.rotation.y = Math.sin(time * 0.45) * 0.65;
    },
  };
}
