import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * オリジナル展示「嘘つきの鏡」。
 *
 * 正面の「鏡」には部屋が正しく映っている——揺れる振り子の位相まで完璧に。
 * しかし実はガラスの向こうにあるのは、鏡写しに作られたもう一つの部屋。
 * 静的な光景に対しては、実物の鏡像部屋はどの視点から見ても本物の鏡と
 * 光学的に区別できないことを利用したトリック。
 *
 * クリック / F で「鏡像」だけが勝手に動き出し、鏡の嘘が暴かれる。
 */

const W = 1.7; // 内側の半幅
const D = 2.1; // ガラスから各半室の奥行き
const H = 2.6;
const T = 0.12;

const CONE_COLOR = new THREE.Color(0x2fb7a6);
const CONE_BROKEN_COLOR = new THREE.Color(0xff8a3d);
const SWING_AMP = 0.55;
const SWING_SPEED = 2.0;

/** 半室 1 つ分の静的な小物を作る。side = +1 が実物側、-1 が鏡像側 */
function createProps(side: number): {
  group: THREE.Group;
  cone: THREE.Mesh;
  pendulumPivot: THREE.Group;
} {
  const group = new THREE.Group();

  const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x2c2a30, roughness: 0.85 });
  const addPedestal = (x: number, z: number): void => {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.95, 0.42), pedestalMat);
    ped.position.set(x, 0.475, z * side);
    group.add(ped);
  };

  // 台座+ティールの円錐(左)
  addPedestal(-0.95, 1.15);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.52, 24),
    new THREE.MeshStandardMaterial({ color: CONE_COLOR.clone(), roughness: 0.5 }),
  );
  cone.position.set(-0.95, 0.95 + 0.26, 1.15 * side);
  group.add(cone);

  // 台座+臙脂のトーラス(右)。y 回転は鏡映で符号が反転する
  addPedestal(0.95, 0.62);
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.065, 14, 28),
    new THREE.MeshStandardMaterial({ color: 0xc2453f, roughness: 0.45 }),
  );
  torus.position.set(0.95, 0.95 + 0.26, 0.62 * side);
  torus.rotation.y = 0.5 * side;
  group.add(torus);

  // 振り子スタンド(逆 L 字)。振り子は x 方向に揺れるため、鏡映でも同じ回転角になる
  const standMat = new THREE.MeshStandardMaterial({ color: 0x1d1b21, roughness: 0.7 });
  const zP = 1.5 * side;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.36), standMat);
  base.position.set(0.55, 0.03, zP);
  group.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 12), standMat);
  pole.position.set(0.55, 1.1, zP);
  group.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), standMat);
  arm.position.set(0.32, 2.17, zP);
  group.add(arm);

  const pendulumPivot = new THREE.Group();
  pendulumPivot.position.set(0.1, 2.13, zP);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 8), standMat);
  rod.position.y = -0.425;
  pendulumPivot.add(rod);
  const bob = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 20, 14),
    new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.3, metalness: 0.6 }),
  );
  bob.position.y = -0.85;
  pendulumPivot.add(bob);
  group.add(pendulumPivot);

  return { group, cone, pendulumPivot };
}

export function createLiarsMirror(): Exhibit {
  const root = new THREE.Group();

  // --- 部屋の躯体(ガラス面 z=0 を挟んで対称) ---
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x59536a, roughness: 0.9 });
  const addBox = (w: number, h: number, d: number, x: number, y: number, z: number): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    mesh.position.set(x, y, z);
    root.add(mesh);
  };
  addBox(T, H, 2 * D + 2 * T, -W - T / 2, H / 2, 0); // 左壁
  addBox(T, H, 2 * D + 2 * T, W + T / 2, H / 2, 0); // 右壁
  addBox(2 * W + 2 * T, H, T, 0, H / 2, -D - T / 2); // 鏡像側の奥壁
  addBox(2 * W + 2 * T, T, 2 * D + 2 * T, 0, H + T / 2, 0); // 天板

  // 床板(両半室で連続して見えるように一枚で敷く)
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(2 * W + 2 * T, 0.04, 2 * D + 2 * T),
    new THREE.MeshStandardMaterial({ color: 0x4f4840, roughness: 0.85 }),
  );
  floor.position.set(0, 0.02, 0);
  root.add(floor);

  // --- 鏡の額縁とガラス ---
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xc9a24a,
    roughness: 0.35,
    metalness: 0.6,
  });
  const addFrame = (w: number, h: number, x: number, y: number): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), frameMat);
    mesh.position.set(x, y, 0);
    root.add(mesh);
  };
  addFrame(0.1, H, -(W - 0.05), H / 2);
  addFrame(0.1, H, W - 0.05, H / 2);
  addFrame(2 * W, 0.1, 0, H - 0.05);
  addFrame(2 * W, 0.1, 0, 0.09);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * W, H),
    new THREE.MeshStandardMaterial({
      color: 0xbfd8e2,
      transparent: true,
      opacity: 0.06,
      roughness: 0.08,
      metalness: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  glass.position.set(0, H / 2, 0);
  root.add(glass);

  // --- 実物側と鏡像側の小物 ---
  const real = createProps(1);
  const mirrored = createProps(-1);
  root.add(real.group, mirrored.group);

  // 両半室を対称に照らす(明るさの差でネタが割れないように)
  for (const side of [1, -1]) {
    const light = new THREE.PointLight(0xfff0dd, 8, 7, 1.8);
    light.position.set(0, H - 0.3, 1.2 * side);
    root.add(light);
  }

  // --- 鏡の嘘(操作で鏡像だけが動き出す) ---
  const mirroredConeMat = mirrored.cone.material as THREE.MeshStandardMaterial;
  const coneBaseY = mirrored.cone.position.y;
  let broken = false;
  let breakT = 0; // 0: 完全な鏡、1: 嘘が露呈
  let time = 0;

  return {
    id: 'liars-mirror',
    title: '嘘つきの鏡',
    hint:
      '正面の鏡には部屋が正しく映っています——振り子の揺れの位相まで完璧に。でもよく見てください。覗き込んでいるあなたが、どこにも映っていません。実はガラスの向こうにあるのは、鏡写しに作られた「双子の部屋」。静止した光景なら、実物で作った鏡像はどの視点から見ても本物の鏡と光学的に区別がつかないのです。操作すると、鏡像だけが物理法則を破り始めます。Fable が考案したオリジナル作品です。',
    root,
    viewSpot: {
      position: new THREE.Vector3(0, 1.6, 3.5),
      target: new THREE.Vector3(0, 1.3, -0.8),
    },
    triggerRadius: 5,
    interactionHint: 'クリック / F: 鏡の正体を暴く / 元に戻す',
    touchInteractionHint: '「操作」: 鏡の正体を暴く / 元に戻す',
    onOperate(): void {
      broken = !broken;
    },
    update(dt: number): void {
      time += dt;
      const angle = SWING_AMP * Math.sin(time * SWING_SPEED);
      real.pendulumPivot.rotation.z = angle;
      // 嘘が露呈している間、鏡像の振り子は静止したまま(鏡なら不可能)
      if (breakT < 0.02) mirrored.pendulumPivot.rotation.z = angle;

      breakT = THREE.MathUtils.clamp(breakT + (broken ? 1 : -1) * dt * 1.6, 0, 1);
      const e = THREE.MathUtils.smoothstep(breakT, 0, 1);
      // 鏡像の円錐だけが浮き上がり、色を変える
      mirrored.cone.position.y = coneBaseY + 0.5 * e;
      mirroredConeMat.color.lerpColors(CONE_COLOR, CONE_BROKEN_COLOR, e);
    },
    colliders: [
      new THREE.Box3(
        new THREE.Vector3(-W - T, 0, -D - T),
        new THREE.Vector3(-W, H, D + T),
      ),
      new THREE.Box3(new THREE.Vector3(W, 0, -D - T), new THREE.Vector3(W + T, H, D + T)),
      new THREE.Box3(
        new THREE.Vector3(-W - T, 0, -D - T),
        new THREE.Vector3(W + T, H, -D),
      ),
      // ガラス面(実物側の半室には入れるが、鏡像側へは通れない)
      new THREE.Box3(new THREE.Vector3(-W, 0, -0.04), new THREE.Vector3(W, H, 0.04)),
    ],
  };
}
