import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * ペンローズの三角形(視点依存の不可能図形)。
 *
 * 実際には閉じていない 3 本の梁で構成する。
 * 2 本(底辺・垂直)は同一平面で物理的に接続し、3 本目は視点(ビュースポット)へ
 * 向かって斜めに持ち上がる先細りの梁として作る。3 本目の先端は
 * 「目の位置 E と垂直梁の頂点 T を結ぶ視線上」に置くため、ビュースポットからは
 * 頂点がぴったり重なって閉じた三角形=不可能図形に見える。
 */

const BEAM = 0.17; // 梁の断面サイズ
const PED_H = 0.55; // 台座の高さ
// ローカルでの推奨視点(目の位置)。わずかに右斜めから見下ろす位置にして
// 梁の側面・上面が見え、立体感が出るようにする
const EYE = new THREE.Vector3(0.9, 1.6, 2.4);

/** start→end に伸び、断面が w0→w1 に先細りする四角柱を作る */
function createTaperedBeam(
  start: THREE.Vector3,
  end: THREE.Vector3,
  w0: number,
  w1: number,
  material: THREE.Material,
): THREE.Mesh {
  const axis = new THREE.Vector3().subVectors(end, start).normalize();
  const up0 = Math.abs(axis.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(axis, up0).normalize();
  const up = new THREE.Vector3().crossVectors(right, axis).normalize();

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const pos = geometry.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const endPoint = v.x > 0 ? end : start;
    const w = v.x > 0 ? w1 : w0;
    const p = endPoint
      .clone()
      .addScaledVector(right, v.z * w)
      .addScaledVector(up, v.y * w);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

export function createPenroseTriangle(): Exhibit {
  const root = new THREE.Group();

  // 台座
  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, PED_H, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x2c2a30, roughness: 0.9 }),
  );
  pedestal.position.y = PED_H / 2;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  root.add(pedestal);

  const material = new THREE.MeshStandardMaterial({
    color: 0x8fb3d9,
    roughness: 0.55,
    flatShading: true,
  });

  // 構造のキーポイント(ローカル座標)
  const cornerBL = new THREE.Vector3(-0.7, PED_H + BEAM / 2, 0); // 左下(接続)
  const cornerBR = new THREE.Vector3(0.7, PED_H + BEAM / 2, 0); // 右下(接続)
  const cornerTop = new THREE.Vector3(-0.7, PED_H + 1.25, 0); // 垂直梁の頂点 T

  // 底辺の梁(左右にわずかに延長して角を成す)
  const bottom = createTaperedBeam(
    new THREE.Vector3(cornerBL.x - BEAM / 2, cornerBL.y, 0),
    new THREE.Vector3(cornerBR.x + BEAM / 2, cornerBR.y, 0),
    BEAM,
    BEAM,
    material,
  );
  root.add(bottom);

  // 垂直の梁
  const vertical = createTaperedBeam(
    new THREE.Vector3(cornerBL.x, cornerBL.y - BEAM / 2, 0),
    new THREE.Vector3(cornerTop.x, cornerTop.y + BEAM / 2, 0),
    BEAM,
    BEAM,
    material,
  );
  root.add(vertical);

  // 3 本目: 右下から「視線 E→T 上の点 Q」へ向かう先細りの梁。
  // Q は目と頂点 T を結ぶ線上にあるため、ビュースポットからは T に重なって見える。
  const t = 0.78; // E からどれだけ T へ寄った位置に先端を置くか
  const q = EYE.clone().lerp(cornerTop, t);
  // 先端は角として少しだけ突き出す
  const overshoot = q
    .clone()
    .sub(cornerBR)
    .normalize()
    .multiplyScalar(BEAM * t * 0.35)
    .add(q);
  const diagonal = createTaperedBeam(cornerBR, overshoot, BEAM, BEAM * t, material);
  root.add(diagonal);

  return {
    id: 'penrose-triangle',
    title: 'ペンローズの三角形',
    hint:
      'この三角形は実際には閉じていません。3 本の梁のうち 1 本は、床マーカーの視点に向かって斜め手前に持ち上がった別の棒で、その先端がちょうど頂点に重なって見えるよう配置されています。マーカーから一歩ずれて見ると、バラバラの構造が現れます。',
    root,
    viewSpot: {
      position: EYE.clone(),
      target: new THREE.Vector3(0, PED_H + 0.65, 0),
    },
    triggerRadius: 4,
    colliders: [new THREE.Box3().setFromObject(pedestal)],
  };
}
