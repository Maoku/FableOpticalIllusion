import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * ペンローズの階段(無限に上り続けるように見える階段)。
 *
 * 現実の「無限階段」模型と同じ仕掛けで作る:
 * 各ステップの蹴込み(riser)は目に見えて一段上がるが、踏面(tread)は
 * 気付かない程度に下り傾斜しており、一周すると元の高さに戻る閉ループ。
 * 段差だけが知覚され「どこまでも上り続ける階段」に見える。
 * ループを永遠に登り続けるボールが錯視を強調する。
 */

const RISER = 0.05; // 蹴込みの高さ
const HALF = 0.875; // コーナー中心までの平面距離
const STEP_W = 0.5; // 階段の幅
const STEPS_PER_SIDE = 5;
const TOP_Y = 0.42; // 各蹴込み上端の絶対高さ(ここは一周ずっと同じ)
const TREAD_T = 0.045; // 踏板の厚み

/** ループの中心線を歩くための正方形パス(反時計回り、上から見て) */
const CORNERS: [number, number][] = [
  [-HALF, HALF],
  [HALF, HALF],
  [HALF, -HALF],
  [-HALF, -HALF],
];

function buildStairsRing(group: THREE.Group): void {
  const treadMaterial = new THREE.MeshStandardMaterial({ color: 0xd8c9ef, roughness: 0.8 });
  const riserMaterial = new THREE.MeshStandardMaterial({ color: 0x8f74c0, roughness: 0.7 });
  const sideLen = 2 * HALF - STEP_W; // コーナー板の間の直線区間
  const run = sideLen / STEPS_PER_SIDE;
  const slope = Math.atan2(RISER, run);

  for (let side = 0; side < 4; side++) {
    const [cx0, cz0] = CORNERS[side];
    const [cx1, cz1] = CORNERS[(side + 1) % 4];
    const dx = Math.sign(cx1 - cx0);
    const dz = Math.sign(cz1 - cz0);

    // コーナーの踊り場(正方形の板)。前縁が TOP_Y、後縁はわずかに低い
    const corner = new THREE.Mesh(new THREE.BoxGeometry(STEP_W, TREAD_T, STEP_W), treadMaterial);
    corner.position.set(cx0, TOP_Y - TREAD_T / 2, cz0);
    corner.castShadow = true;
    group.add(corner);

    // 直線区間のステップ
    for (let s = 0; s < STEPS_PER_SIDE; s++) {
      const t0 = STEP_W / 2 + s * run;
      const mx = cx0 + dx * (t0 + run / 2);
      const mz = cz0 + dz * (t0 + run / 2);

      // 踏板: 進行方向に向かって RISER ぶんだけ下り傾斜
      const treadLen = Math.hypot(run, RISER);
      const tread = new THREE.Mesh(
        new THREE.BoxGeometry(
          dx !== 0 ? treadLen : STEP_W,
          TREAD_T,
          dz !== 0 ? treadLen : STEP_W,
        ),
        treadMaterial,
      );
      tread.position.set(mx, TOP_Y - RISER / 2 - TREAD_T / 2, mz);
      // 進行方向に向かって下るように傾ける
      if (dx !== 0) tread.rotation.z = -slope * dx;
      else tread.rotation.x = slope * dz;
      tread.castShadow = true;
      group.add(tread);

      // 蹴込み: ステップ前縁で一段「上がる」壁
      const riser = new THREE.Mesh(
        new THREE.BoxGeometry(
          dx !== 0 ? 0.03 : STEP_W,
          RISER + TREAD_T,
          dz !== 0 ? 0.03 : STEP_W,
        ),
        riserMaterial,
      );
      riser.position.set(
        cx0 + dx * (t0 + run),
        TOP_Y - (RISER + TREAD_T) / 2,
        cz0 + dz * (t0 + run),
      );
      riser.castShadow = true;
      group.add(riser);
    }
  }

  // コーナーを支える柱
  const columnMaterial = new THREE.MeshStandardMaterial({ color: 0x35313c, roughness: 0.9 });
  for (const [x, z] of CORNERS) {
    const column = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, TOP_Y - RISER, 0.14),
      columnMaterial,
    );
    column.position.set(x, (TOP_Y - RISER) / 2, z);
    group.add(column);
  }
}

/** パス上の位置(周長パラメータ s)→ ローカル座標 */
function pathPoint(s: number): THREE.Vector3 {
  const sideLen = 2 * HALF;
  const perimeter = sideLen * 4;
  let d = ((s % perimeter) + perimeter) % perimeter;
  for (let side = 0; side < 4; side++) {
    if (d <= sideLen) {
      const [cx0, cz0] = CORNERS[side];
      const [cx1, cz1] = CORNERS[(side + 1) % 4];
      const t = d / sideLen;
      return new THREE.Vector3(
        THREE.MathUtils.lerp(cx0, cx1, t),
        0,
        THREE.MathUtils.lerp(cz0, cz1, t),
      );
    }
    d -= sideLen;
  }
  return new THREE.Vector3(CORNERS[0][0], 0, CORNERS[0][1]);
}

export function createPenroseStairs(): Exhibit {
  const root = new THREE.Group();

  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.42, 2.6),
    new THREE.MeshStandardMaterial({ color: 0x2c2a30, roughness: 0.9 }),
  );
  pedestal.position.y = 0.21;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  root.add(pedestal);

  const diorama = new THREE.Group();
  diorama.position.y = 0.42;
  diorama.rotation.y = -Math.PI / 6;
  buildStairsRing(diorama);
  root.add(diorama);

  // 永遠に階段を登り続けるボール
  const ballRadius = 0.07;
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(ballRadius, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.35, metalness: 0.3 }),
  );
  ball.castShadow = true;
  diorama.add(ball);

  let pathS = 0;
  const stepRun = (2 * HALF - STEP_W) / STEPS_PER_SIDE;

  return {
    id: 'penrose-stairs',
    title: 'ペンローズの階段',
    hint:
      'ボールは一段ずつ階段を登り続けているのに、いつまでも同じ場所を回っています。実は蹴込みで上がる高さと同じだけ、踏板が進行方向にわずかに下り傾斜しており、一周すると元の高さに戻る「閉じたループ」です。段差だけが強く知覚されるため、無限に上る階段に見えます。',
    root,
    viewSpot: {
      position: new THREE.Vector3(0, 1.6, 2.55),
      target: new THREE.Vector3(0, 0.6, 0),
    },
    triggerRadius: 4,
    colliders: [new THREE.Box3().setFromObject(pedestal)],
    update(dt: number): void {
      pathS += dt * 0.55;
      const p = pathPoint(pathS);
      // 踏面の高さ+ステップごとの小さなホップ
      const hop = Math.abs(Math.sin((pathS / stepRun) * Math.PI)) * 0.03;
      ball.position.set(p.x, TOP_Y + ballRadius + hop, p.z);
    },
  };
}
