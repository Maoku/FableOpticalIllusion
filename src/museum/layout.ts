import * as THREE from 'three';
import type { BuildingDef } from './Building';
import { createTemporaryRoom } from './Building';
import type { Exhibit } from '../exhibits/Exhibit';
import { createGallery2D } from '../exhibits/gallery2d/Gallery2D';
import { createViewSpotMarker } from '../exhibits/ViewSpotMarker';

export interface MuseumLayout {
  building: BuildingDef;
  exhibits: Exhibit[];
  /** ビュースポットマーカーや展示用ライトなどの追加オブジェクト */
  extras: THREE.Object3D[];
}

/** 展示を照らすスポットライトを作る */
function createExhibitSpotlight(
  position: THREE.Vector3,
  target: THREE.Vector3,
  intensity = 40,
): THREE.Object3D {
  const group = new THREE.Group();
  const light = new THREE.SpotLight(0xfff2dd, intensity, 14, Math.PI / 5, 0.45, 1.6);
  light.position.copy(position);
  light.target.position.copy(target);
  group.add(light);
  group.add(light.target);
  return group;
}

/**
 * 館内レイアウト定義。
 * 展示はここで生成・配置して登録するだけで館内に追加される。
 */
export function createMuseumLayout(): MuseumLayout {
  const building = createTemporaryRoom();
  const exhibits: Exhibit[] = [];
  const extras: THREE.Object3D[] = [];

  // --- 2D 錯視ギャラリー: 北側の壁に 4 枚 ---
  const gallery = createGallery2D();
  const wallZ = -14.55;
  const xs = [-9, -3, 3, 9];
  gallery.forEach((ex, i) => {
    const x = xs[i] ?? 0;
    ex.root.position.set(x, 0, wallZ);
    extras.push(
      createExhibitSpotlight(
        new THREE.Vector3(x, 4.2, wallZ + 2.6),
        new THREE.Vector3(x, 1.6, wallZ),
      ),
    );
    exhibits.push(ex);
  });

  // ビュースポットを持つ展示にはマーカーを置く
  for (const ex of exhibits) {
    if (ex.viewSpot) extras.push(createViewSpotMarker(ex.viewSpot));
  }

  return { building, exhibits, extras };
}
