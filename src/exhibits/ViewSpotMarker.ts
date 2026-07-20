import * as THREE from 'three';
import type { ViewSpot } from './Exhibit';

/**
 * ビュースポットを示す床マーカー(金色のリング+足元マーク)。
 * プレイヤーはこの上に立って E キーで視点をスナップできる。
 */
export function createViewSpotMarker(spot: ViewSpot): THREE.Object3D {
  const group = new THREE.Group();

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xd4b06a,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.4, 40), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.08, 24),
    new THREE.MeshBasicMaterial({ color: 0xd4b06a, transparent: true, opacity: 0.6 }),
  );
  dot.rotation.x = -Math.PI / 2;
  group.add(dot);

  // 床のわずかに上に置いて Z-fighting を避ける
  group.position.set(spot.position.x, 0.012, spot.position.z);
  return group;
}
