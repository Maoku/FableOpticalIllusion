import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * オリジナル展示「呼吸する石像」(インタラクティブ)。
 *
 * 中央の石像は 1mm も動いていないが、取り囲む 8 つの球がゆっくり
 * 膨張・収縮を繰り返すと、石像のほうが呼吸するように伸び縮みして見える。
 * 脳は物の大きさを「周囲との比率」で測るため、基準側が静かに変わると
 * その変化が不動の対象へ転嫁される。
 *
 * クリック / F で球の動きを止め、石像が不動だったことを確かめられる。
 */

const RING_RADIUS = 1.85;
const RING_COUNT = 8;
const SPHERE_R = 0.3;
const SPHERE_Y = 1.55;
const BREATH_AMP = 0.3;
const BREATH_PERIOD = 6.5;

export function createBreathingStatue(): Exhibit {
  const root = new THREE.Group();

  // --- 中央の石像(不動) ---
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9d978c, roughness: 0.85 });
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.7, 0.5, 28),
    new THREE.MeshStandardMaterial({ color: 0x2f2c33, roughness: 0.9 }),
  );
  pedestal.position.y = 0.25;
  pedestal.castShadow = true;
  root.add(pedestal);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.75, 6, 18), stoneMat);
  body.position.y = 1.18;
  body.castShadow = true;
  root.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 18), stoneMat);
  head.position.y = 2.0;
  head.castShadow = true;
  root.add(head);

  // --- 周囲の球(こちらが動く) ---
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1d1b21, roughness: 0.8 });
  const orbMat = new THREE.MeshStandardMaterial({ color: 0xbfb8ab, roughness: 0.65 });
  const orbs: THREE.Mesh[] = [];
  for (let i = 0; i < RING_COUNT; i++) {
    // 半ステップずらして、ビュースポットからの視軸が球の隙間を通るようにする
    const a = ((i + 0.5) / RING_COUNT) * Math.PI * 2;
    const x = Math.cos(a) * RING_RADIUS;
    const z = Math.sin(a) * RING_RADIUS;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, SPHERE_Y - SPHERE_R, 10),
      poleMat,
    );
    pole.position.set(x, (SPHERE_Y - SPHERE_R) / 2, z);
    root.add(pole);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(SPHERE_R, 24, 18), orbMat);
    orb.position.set(x, SPHERE_Y, z);
    root.add(orb);
    orbs.push(orb);
  }

  let paused = false;
  let phase = 0;
  let envelope = 1; // 停止・再開を滑らかにするための振幅係数

  return {
    id: 'breathing-statue',
    title: '呼吸する石像',
    hint:
      '中央の石像が、ゆっくり呼吸するように膨らんだり縮んだりして見えませんか? 実は石像は 1mm も動いていません。動いているのは周りの 8 つの球だけです。脳は物の大きさを絶対値ではなく「周囲との比率」で測るため、基準になる周囲が静かに変わると、その変化が不動の石像のほうへ転嫁されて見えるのです。操作で球の動きを止めて、確かめてみてください。Fable が考案したオリジナル作品です。',
    root,
    viewSpot: {
      position: new THREE.Vector3(0, 1.6, 3.2),
      target: new THREE.Vector3(0, 1.45, 0),
    },
    triggerRadius: 4.5,
    interactionHint: 'クリック / F: 球の動きを止める / 動かす',
    touchInteractionHint: '「操作」: 球の動きを止める / 動かす',
    onOperate(): void {
      paused = !paused;
    },
    update(dt: number): void {
      phase += (dt * Math.PI * 2) / BREATH_PERIOD;
      envelope += ((paused ? 0 : 1) - envelope) * Math.min(1, dt * 2.2);
      const s = 1 + BREATH_AMP * envelope * Math.sin(phase);
      for (const orb of orbs) orb.scale.setScalar(s);
    },
    colliders: [
      new THREE.Box3(new THREE.Vector3(-2.15, 0, -2.15), new THREE.Vector3(2.15, 1.9, 2.15)),
    ],
  };
}
