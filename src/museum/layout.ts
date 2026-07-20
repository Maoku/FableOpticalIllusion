import * as THREE from 'three';
import type { BuildingDef } from './Building';
import { exhibitViewSpots, type Exhibit } from '../exhibits/Exhibit';
import { createGallery2D } from '../exhibits/gallery2d/Gallery2D';
import { createPenroseTriangle } from '../exhibits/PenroseTriangle';
import { createAnamorphosis } from '../exhibits/Anamorphosis';
import { createPenroseStairs } from '../exhibits/PenroseStairs';
import { createAmesRoom } from '../exhibits/AmesRoom';
import { createHollowFace } from '../exhibits/HollowFace';
import { createRotatingSnakes } from '../exhibits/RotatingSnakes';
import { createImpossibleCube } from '../exhibits/ImpossibleCube';
import { createTwoTruths } from '../exhibits/TwoTruths';
import { createColorConstancyRoom } from '../exhibits/ColorConstancyRoom';
import { createMullerLyerStation } from '../exhibits/MullerLyerStation';
import { createViewSpotMarker } from '../exhibits/ViewSpotMarker';
import { createTitlePlate, createWallSign } from './TitlePlate';

export interface MuseumLayout {
  building: BuildingDef;
  exhibits: Exhibit[];
  /** ビュースポットマーカーや展示用ライトなどの追加オブジェクト */
  extras: THREE.Object3D[];
  /** プレイヤーの初期位置 */
  spawn: THREE.Vector3;
}

/**
 * 館の形状: 30 x 30 のワンフロア。
 * 南側がエントランスホールで、中央の開口から主展示室へ入る。
 */
function createBuildingDef(): BuildingDef {
  const size = 30;
  const half = size / 2;
  const t = 0.3; // 壁厚
  return {
    wallHeight: 4.5,
    floors: [{ x: 0, z: 0, w: size, d: size }],
    walls: [
      // 外周
      { x: 0, z: -half, w: size + t, d: t },
      { x: 0, z: half, w: size + t, d: t },
      { x: -half, z: 0, w: t, d: size + t },
      { x: half, z: 0, w: t, d: size + t },
      // エントランスと主展示室を仕切る壁(中央に幅 7 の開口)
      { x: -9.25, z: 7, w: 11.5, d: t },
      { x: 9.25, z: 7, w: 11.5, d: t },
    ],
  };
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
  for (const spot of exhibitViewSpots(ex)) {
    spot.position.applyMatrix4(ex.root.matrixWorld);
    spot.target.applyMatrix4(ex.root.matrixWorld);
  }
  for (const box of ex.colliders ?? []) box.applyMatrix4(ex.root.matrixWorld);
}

/** 展示名プレートを床に置く */
function placePlate(extras: THREE.Object3D[], title: string, x: number, z: number, rotY: number) {
  const plate = createTitlePlate(title);
  plate.position.set(x, 0, z);
  plate.rotation.y = rotY;
  extras.push(plate);
}

/**
 * 館内レイアウト定義。
 * 展示はここで生成・配置して登録するだけで館内に追加される。
 */
export function createMuseumLayout(): MuseumLayout {
  const building = createBuildingDef();
  const exhibits: Exhibit[] = [];
  const extras: THREE.Object3D[] = [];

  // --- 2D 錯視ギャラリー: 北側の壁に 4 枚+西側の壁に 2 枚 ---
  const gallery = createGallery2D();
  const wallZ = -14.55;
  const galleryPlacements = [
    { x: -10, z: wallZ, rotY: 0 },
    { x: -5, z: wallZ, rotY: 0 },
    { x: 0, z: wallZ, rotY: 0 },
    { x: 5, z: wallZ, rotY: 0 },
    { x: -14.55, z: -1.5, rotY: Math.PI / 2 },
    { x: -14.55, z: 1.5, rotY: Math.PI / 2 },
  ];
  gallery.forEach((ex, i) => {
    const p = galleryPlacements[i];
    if (!p) return;
    placeExhibit(ex, p.x, p.z, p.rotY);
    // 壁の法線方向(絵の正面)にスポットライトを置く
    const nx = Math.sin(p.rotY);
    const nz = Math.cos(p.rotY);
    extras.push(
      createExhibitSpotlight(
        new THREE.Vector3(p.x + nx * 2.6, 4.2, p.z + nz * 2.6),
        new THREE.Vector3(p.x, 1.6, p.z),
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
  placePlate(extras, penrose.title, -10.9, -7.6, Math.PI / 2);

  // --- アナモルフォーシス: 東の壁面+床、ビュースポットは西向き ---
  const anamorphosis = createAnamorphosis();
  placeExhibit(anamorphosis, 14.83, -4, -Math.PI / 2);
  exhibits.push(anamorphosis);
  placePlate(extras, anamorphosis.title, 13.5, -6.2, -Math.PI / 2);

  // --- ペンローズの階段: 主展示室の中央南寄り、ビュースポットは北側 ---
  const stairs = createPenroseStairs();
  placeExhibit(stairs, 4.5, 1.5, Math.PI);
  extras.push(
    createExhibitSpotlight(new THREE.Vector3(4.5, 4.3, -1), new THREE.Vector3(4.5, 1, 1.5), 60),
  );
  exhibits.push(stairs);
  placePlate(extras, stairs.title, 2.9, -0.3, Math.PI);

  // --- エイムズの部屋: 北東の角、覗き窓は南向き ---
  const ames = createAmesRoom();
  placeExhibit(ames, 8.5, -10.5, 0);
  extras.push(
    createExhibitSpotlight(new THREE.Vector3(8.5, 4.3, -6.5), new THREE.Vector3(8.5, 1.6, -10.5)),
  );
  exhibits.push(ames);
  placePlate(extras, ames.title, 7.1, -9.3, 0);

  // --- ホロウフェイス: 西の壁際南寄り、東向き ---
  const hollowFace = createHollowFace();
  placeExhibit(hollowFace, -12, 5, Math.PI / 2);
  extras.push(
    createExhibitSpotlight(new THREE.Vector3(-9.5, 4.3, 5), new THREE.Vector3(-12, 1.75, 5)),
  );
  exhibits.push(hollowFace);
  placePlate(extras, hollowFace.title, -10.9, 3.4, Math.PI / 2);

  // --- 回転蛇錯視: 仕切り壁の主展示室側 ---
  const snakes = createRotatingSnakes();
  placeExhibit(snakes, -6, 6.78, Math.PI);
  extras.push(
    createExhibitSpotlight(new THREE.Vector3(-6, 4.2, 4.2), new THREE.Vector3(-6, 1.8, 6.85)),
  );
  exhibits.push(snakes);

  // --- 不可能な立方体: 主展示室の中央西寄り ---
  const cube = createImpossibleCube();
  placeExhibit(cube, -5, -2, 0);
  extras.push(
    createExhibitSpotlight(new THREE.Vector3(-5, 4.3, 0.5), new THREE.Vector3(-5, 1.2, -2), 50),
  );
  exhibits.push(cube);
  placePlate(extras, cube.title, -6.4, -0.7, 0);

  // --- 二つの真実(REAL / FAKE): 主展示室の東寄り、南と東の 2 視点 ---
  const twoTruths = createTwoTruths();
  placeExhibit(twoTruths, 9.5, 2.5, 0);
  extras.push(
    createExhibitSpotlight(new THREE.Vector3(9.5, 4.3, 4.8), new THREE.Vector3(9.5, 1.2, 2.5), 50),
  );
  exhibits.push(twoTruths);
  placePlate(extras, twoTruths.title, 8.1, 4.1, 0);

  // --- 色の恒常性の部屋: 仕切り壁の主展示室側・東寄り(照明切替) ---
  const colorRoom = createColorConstancyRoom();
  placeExhibit(colorRoom, 6.5, 5.9, Math.PI);
  exhibits.push(colorRoom);
  placePlate(extras, colorRoom.title, 4.9, 4.6, Math.PI);

  // --- ミュラー・リヤー調整実験: エントランスホール西側(体験装置) ---
  const mlStation = createMullerLyerStation();
  placeExhibit(mlStation, -6.5, 11, Math.PI / 2);
  extras.push(
    createExhibitSpotlight(new THREE.Vector3(-4, 4.2, 11), new THREE.Vector3(-6.5, 1.6, 11)),
  );
  exhibits.push(mlStation);
  placePlate(extras, mlStation.title, -5.6, 12.4, Math.PI / 2);

  // --- エントランスの演出 ---
  const sign = createWallSign('FABLE OPTICAL ILLUSION MUSEUM', 5.2, 0.8);
  sign.position.set(0, 3.55, 7.18);
  extras.push(sign);

  const entranceLight = new THREE.PointLight(0xfff0dd, 30, 20, 1.8);
  entranceLight.position.set(0, 4.1, 11);
  extras.push(entranceLight);
  const hallLight = new THREE.PointLight(0xe8e4ff, 18, 22, 1.9);
  hallLight.position.set(-2, 4.2, -4);
  extras.push(hallLight);

  // ビュースポットを持つ展示にはマーカーを置く
  for (const ex of exhibits) {
    for (const spot of exhibitViewSpots(ex)) extras.push(createViewSpotMarker(spot));
  }

  return { building, exhibits, extras, spawn: new THREE.Vector3(0, 1.6, 12.5) };
}
