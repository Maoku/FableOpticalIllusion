import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * 不可能な立方体(エッシャーの「クレイジー・クレート」型)。
 *
 * 実物は普通の立方体フレームだが、手前上の梁に切り欠きを入れてある。
 * 切り欠きはビュースポットから見て「奥の縦の梁」とちょうど重なる位置にあり、
 * 奥の梁が手前の梁を突き抜けて手前に来ているように見える
 * =あり得ない立体交差を持つ立方体に見える。
 */

const L = 0.85; // 立方体の一辺
const BEAM = 0.095; // 梁の太さ
const PED_H = 0.45;
// 立方体は目線(1.6m)より低く置く。切り欠き越しの視線が奥の縦梁の
// 中央付近を通り、隙間の背後が確実に梁で埋まるようにするため
const Y0 = PED_H + 0.05;
const EYE = new THREE.Vector3(0.75, 1.6, 2.3); // ローカルの推奨視点

function addBeam(
  group: THREE.Group,
  material: THREE.Material,
  from: THREE.Vector3,
  to: THREE.Vector3,
): void {
  const size = new THREE.Vector3(
    Math.abs(to.x - from.x) + BEAM,
    Math.abs(to.y - from.y) + BEAM,
    Math.abs(to.z - from.z) + BEAM,
  );
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.castShadow = true;
  group.add(mesh);
}

export function createImpossibleCube(): Exhibit {
  const root = new THREE.Group();

  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, PED_H, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x2c2a30, roughness: 0.9 }),
  );
  pedestal.position.y = PED_H / 2;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  root.add(pedestal);

  const material = new THREE.MeshStandardMaterial({
    color: 0xd9a05c,
    roughness: 0.6,
    flatShading: true,
  });

  const h = L / 2;
  const y1 = Y0 + L;
  const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

  // 底面の 4 辺
  addBeam(root, material, v(-h, Y0, h), v(h, Y0, h));
  addBeam(root, material, v(-h, Y0, -h), v(h, Y0, -h));
  addBeam(root, material, v(-h, Y0, -h), v(-h, Y0, h));
  addBeam(root, material, v(h, Y0, -h), v(h, Y0, h));
  // 縦の 4 辺
  addBeam(root, material, v(-h, Y0, h), v(-h, y1, h));
  addBeam(root, material, v(h, Y0, h), v(h, y1, h));
  addBeam(root, material, v(-h, Y0, -h), v(-h, y1, -h));
  addBeam(root, material, v(h, Y0, -h), v(h, y1, -h));
  // 上面のうち 3 辺
  addBeam(root, material, v(-h, y1, -h), v(h, y1, -h));
  addBeam(root, material, v(-h, y1, -h), v(-h, y1, h));
  addBeam(root, material, v(h, y1, -h), v(h, y1, h));

  // 手前上の梁: 視点から「左奥の縦の梁」が重なって見える位置に切り欠きを作る。
  // 視線 E → 手前上の梁(z=+h)→ 奥の縦梁(x=-h, z=-h)の交差位置を解く
  const lambda = (h - EYE.z) / (-h - EYE.z); // z 成分から視線パラメータ
  const crossX = EYE.x + lambda * (-h - EYE.x); // 手前の梁上の交差位置
  // 奥の梁が手前の梁の奥行きに投影された時の見かけ幅(λ < 1 なので縮む)
  const backBeamApparentW = BEAM * lambda * 1.15;
  const gapHalf = backBeamApparentW / 2 + 0.012;
  // 分割セグメントは端のパディングなしの正確な寸法で作る
  const addSegment = (x0: number, x1: number): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, BEAM, BEAM), material);
    mesh.position.set((x0 + x1) / 2, y1, h);
    mesh.castShadow = true;
    root.add(mesh);
  };
  addSegment(-h - BEAM / 2, crossX - gapHalf);
  addSegment(crossX + gapHalf, h + BEAM / 2);

  return {
    id: 'impossible-cube',
    title: '不可能な立方体',
    hint:
      '奥の縦の梁が、手前上の梁を突き抜けて手前に来ているように見えます。実物はただの立方体フレームで、手前上の梁にはビュースポットから見て奥の梁とぴったり重なる位置に切り欠きが入れてあります。隙間から奥の梁が覗くことで、あり得ない前後関係が生まれます。少し横に動くと切り欠きの正体が分かります。',
    root,
    viewSpot: {
      position: EYE.clone(),
      target: new THREE.Vector3(0, Y0 + L / 2, 0),
    },
    triggerRadius: 3.8,
    colliders: [new THREE.Box3().setFromObject(pedestal)],
  };
}
