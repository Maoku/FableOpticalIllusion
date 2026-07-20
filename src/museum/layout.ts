import * as THREE from 'three';
import type { BuildingDef } from './Building';
import { createTemporaryRoom } from './Building';
import type { Exhibit } from '../exhibits/Exhibit';
import { createGallery2D } from '../exhibits/gallery2d/Gallery2D';
import { createPenroseTriangle } from '../exhibits/PenroseTriangle';
import { createAnamorphosis } from '../exhibits/Anamorphosis';
import { createPenroseStairs } from '../exhibits/PenroseStairs';
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
 * 展示を指定位置・向きに配置し、ローカル定義のビュースポットとコライダーを
 * ワールド座標へ変換する。
 */
function placeExhibit(ex: Exhibit, x: number, z: number, rotY = 0): void {
  ex.root.position.set(x, 0, z);
  ex.root.rotation.y = rotY;
  ex.root.updateMatrixWorld(true);
  if (ex.viewSpot) {
    ex.viewSpot.position.applyMatrix4(ex.root.matrixWorld);
    ex.viewSpot.target.applyMatrix4(ex.root.matrixWorld);
  }
  for (const box of ex.colliders ?? []) box.applyMatrix4(ex.root.matrixWorld);
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

  // --- ペンローズの三角形: 西の壁際、ビュースポットは東向き ---
  const penrose = createPenroseTriangle();
  placeExhibit(penrose, -12, -6, Math.PI / 2);
  extras.push(
    createExhibitSpotlight(new THREE.Vector3(-9.5, 4.3, -6), new THREE.Vector3(-12, 1.2, -6)),
  );
  exhibits.push(penrose);

  // --- アナモルフォーシス: 東の壁面+床、ビュースポットは西向き ---
  const anamorphosis = createAnamorphosis();
  placeExhibit(anamorphosis, 14.83, -4, -Math.PI / 2);
  exhibits.push(anamorphosis);

  // --- ペンローズの階段: 南側、ビュースポットは北向き ---
  const stairs = createPenroseStairs();
  placeExhibit(stairs, -5, 10, Math.PI);
  extras.push(
    createExhibitSpotlight(new THREE.Vector3(-5, 4.3, 12.5), new THREE.Vector3(-5, 1, 10), 60),
  );
  exhibits.push(stairs);

  // ビュースポットを持つ展示にはマーカーを置く
  for (const ex of exhibits) {
    if (ex.viewSpot) extras.push(createViewSpotMarker(ex.viewSpot));
  }

  return { building, exhibits, extras };
}
