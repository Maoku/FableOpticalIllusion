import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * 色の恒常性の部屋(インタラクティブ展示)。
 *
 * 開口部のあるブース内に果物を並べ、強い橙色の照明で照らす。
 * 脳は照明の色を差し引いて物体の色を推定する(色の恒常性)ため、
 * 照明下では果物がそれらしい色に見えるが、実際の果物は
 * ほとんど彩度のないくすんだ色で塗られている。
 * クリック / F キーで白色照明に切り替えると本当の色が現れる。
 */

const TINTED_COLOR = 0xff5a24; // 展示用の強い橙色照明
const WHITE_COLOR = 0xffffff;

function createFruit(
  geometry: THREE.BufferGeometry,
  color: number,
  x: number,
  y: number,
  z: number,
  rotZ = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.55 }),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.z = rotZ;
  mesh.castShadow = true;
  return mesh;
}

export function createColorConstancyRoom(): Exhibit {
  const root = new THREE.Group();

  // --- ブース(前面が開いた箱) ---
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x35313c, roughness: 0.9 });
  const innerMat = new THREE.MeshStandardMaterial({ color: 0xb9b2a4, roughness: 0.95 });
  const W = 1.1; // 半幅
  const D = 0.75; // 半奥行き
  const H = 2.3;
  const T = 0.1;

  const addBox = (
    material: THREE.Material,
    cx: number,
    cy: number,
    cz: number,
    w: number,
    h: number,
    d: number,
  ): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(cx, cy, cz);
    root.add(mesh);
  };
  // 外殻(背面・左右・天面)と内装(明るい内壁)
  addBox(shellMat, 0, H / 2, -D - T / 2, 2 * W + 2 * T, H, T);
  addBox(shellMat, -W - T / 2, H / 2, -T / 4, T, H, 2 * D + T);
  addBox(shellMat, W + T / 2, H / 2, -T / 4, T, H, 2 * D + T);
  addBox(shellMat, 0, H + T / 2, -T / 4, 2 * W + 2 * T, T, 2 * D + T);
  addBox(innerMat, 0, H / 2, -D + 0.01, 2 * W, H, 0.02);
  addBox(innerMat, -W + 0.01, H / 2, -T / 4, 0.02, H, 2 * D);
  addBox(innerMat, W - 0.01, H / 2, -T / 4, 0.02, H, 2 * D);

  // 台(テーブル)
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.9, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x4a443c, roughness: 0.9 }),
  );
  table.position.set(0, 0.45, -0.3);
  table.receiveShadow = true;
  root.add(table);

  // --- 果物(実際の色は意図的にくすんだ灰色寄り) ---
  const y = 0.9;
  root.add(
    // りんご(くすんだ灰赤)
    createFruit(new THREE.SphereGeometry(0.13, 24, 18), 0x8d7472, -0.45, y + 0.13, -0.35),
    // バナナ(くすんだ灰黄): アーチ状に立てて台の上へ
    createFruit(
      new THREE.TorusGeometry(0.16, 0.05, 12, 24, Math.PI * 0.85),
      0x968f74,
      0.1,
      y + 0.12,
      -0.2,
      Math.PI * 0.575,
    ),
    // オレンジ(くすんだ灰橙)
    createFruit(new THREE.SphereGeometry(0.1, 24, 18), 0x93816e, 0.5, y + 0.1, -0.4),
    // ぶどう(くすんだ灰紫)
    createFruit(new THREE.IcosahedronGeometry(0.1, 1), 0x7d7684, -0.18, y + 0.1, -0.12),
  );

  // --- 切り替え式の照明 ---
  const light = new THREE.SpotLight(TINTED_COLOR, 30, 6, Math.PI / 3.2, 0.5, 1.4);
  light.position.set(0, H - 0.15, 0.35);
  light.target.position.set(0, y, -0.35);
  root.add(light);
  root.add(light.target);

  let tinted = true;

  return {
    id: 'color-constancy',
    title: '色の恒常性の部屋',
    hint:
      '橙色の照明の下では、りんごは赤く、バナナは黄色く、ごく普通の果物に見えます。しかし白色照明に切り替えると、この果物たちはどれも彩度のないくすんだ色をしていることが分かります。脳は「照明の色」を自動的に差し引いて物の色を推定するため、色付き照明の下では実際と違う色がそれらしく補完されるのです。',
    root,
    viewSpot: {
      position: new THREE.Vector3(0, 1.6, 2.1),
      target: new THREE.Vector3(0, 1.05, -0.35),
    },
    triggerRadius: 3.4,
    interactionHint: 'クリック / F: 照明を切り替える',
    touchInteractionHint: '「操作」: 照明を切り替える',
    onOperate(): void {
      tinted = !tinted;
      light.color.setHex(tinted ? TINTED_COLOR : WHITE_COLOR);
      light.intensity = tinted ? 30 : 22;
    },
    colliders: [
      new THREE.Box3(
        new THREE.Vector3(-W - T, 0, -D - T),
        new THREE.Vector3(W + T, H + T, 0.35),
      ),
    ],
  };
}
