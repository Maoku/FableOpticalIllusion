import * as THREE from 'three';

export interface WallDef {
  /** 壁の中心 X, Z */
  x: number;
  z: number;
  /** X 方向の幅、Z 方向の奥行き */
  w: number;
  d: number;
  h?: number;
}

export interface FloorDef {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface BuildingDef {
  wallHeight: number;
  floors: FloorDef[];
  walls: WallDef[];
}

const WALL_COLOR = 0x3d3a42;
const FLOOR_COLOR = 0x4a4038;
const CEILING_COLOR = 0x232028;

/**
 * 床・壁・天井のジオメトリと基本照明を構築する。
 * 形状は layout 定義(BuildingDef)から生成し、壁はコライダーとしても登録する。
 */
export class Building {
  readonly group = new THREE.Group();
  readonly colliders: THREE.Box3[] = [];

  private readonly wallMaterial = new THREE.MeshStandardMaterial({
    color: WALL_COLOR,
    roughness: 0.95,
  });
  private readonly floorMaterial = new THREE.MeshStandardMaterial({
    color: FLOOR_COLOR,
    roughness: 0.85,
  });
  private readonly ceilingMaterial = new THREE.MeshStandardMaterial({
    color: CEILING_COLOR,
    roughness: 1,
  });

  constructor(def: BuildingDef) {
    for (const f of def.floors) this.addFloor(f, def.wallHeight);
    for (const w of def.walls) this.addWall(w, def.wallHeight);
    this.addBaseLights();
  }

  private addFloor(f: FloorDef, wallHeight: number): void {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.d), this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(f.x, 0, f.z);
    floor.receiveShadow = true;
    this.group.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.d), this.ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(f.x, wallHeight, f.z);
    this.group.add(ceiling);
  }

  private addWall(w: WallDef, defaultHeight: number): void {
    const h = w.h ?? defaultHeight;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w.w, h, w.d), this.wallMaterial);
    mesh.position.set(w.x, h / 2, w.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);

    this.colliders.push(new THREE.Box3().setFromObject(mesh));
  }

  private addBaseLights(): void {
    const hemi = new THREE.HemisphereLight(0x8888aa, 0x332f2a, 0.5);
    this.group.add(hemi);
    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    this.group.add(ambient);
  }
}

/** Phase 1 用の仮ワンルーム(30 x 30) */
export function createTemporaryRoom(): BuildingDef {
  const size = 30;
  const half = size / 2;
  const t = 0.3; // 壁厚
  return {
    wallHeight: 4.5,
    floors: [{ x: 0, z: 0, w: size, d: size }],
    walls: [
      { x: 0, z: -half, w: size + t, d: t },
      { x: 0, z: half, w: size + t, d: t },
      { x: -half, z: 0, w: t, d: size + t },
      { x: half, z: 0, w: t, d: size + t },
    ],
  };
}
