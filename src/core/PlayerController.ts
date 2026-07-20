import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import type { Updatable } from './App';

const EYE_HEIGHT = 1.6;
const PLAYER_RADIUS = 0.35;
const WALK_SPEED = 3.6;
const SPRINT_SPEED = 6.0;
/** タッチ視点操作の感度(ラジアン / px) */
const TOUCH_LOOK_SENSITIVITY = 0.004;
const MAX_PITCH = Math.PI / 2 - 0.01;

/**
 * PointerLock による一人称移動と、AABB コライダーへの簡易コリジョン。
 * 移動は XZ 平面のみ(重力・ジャンプなし)。
 */
export class PlayerController implements Updatable {
  readonly controls: PointerLockControls;
  /** 壁・展示などの衝突判定用 AABB。外部から追加する */
  readonly colliders: THREE.Box3[] = [];

  private readonly camera: THREE.PerspectiveCamera;
  private readonly keys = new Set<string>();
  private readonly velocity = new THREE.Vector3();
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  /** バーチャルパッドからの移動入力(前後・左右、それぞれ -1..1) */
  private readonly moveInput = { forward: 0, right: 0 };
  /** タッチ操作モード時は PointerLock なしで操作を受け付ける */
  private touchActive = false;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    camera.position.set(0, EYE_HEIGHT, 0);

    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  get isLocked(): boolean {
    return this.controls.isLocked;
  }

  /** 入館済みで操作を受け付ける状態か(PointerLock またはタッチ操作モード) */
  get isActive(): boolean {
    return this.controls.isLocked || this.touchActive;
  }

  get position(): THREE.Vector3 {
    return this.camera.position;
  }

  /** タッチ操作モードの ON/OFF。ON の間は PointerLock なしで移動・視点操作を行う */
  setTouchActive(active: boolean): void {
    this.touchActive = active;
    if (!active) this.setMoveInput(0, 0);
  }

  /** バーチャルパッドからの移動入力を設定する(前:+1 / 右:+1) */
  setMoveInput(forward: number, right: number): void {
    this.moveInput.forward = forward;
    this.moveInput.right = right;
  }

  /** タッチドラッグ量(px)から視点を回転させる */
  look(dx: number, dy: number): void {
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= dx * TOUCH_LOOK_SENSITIVITY;
    this.euler.x -= dy * TOUCH_LOOK_SENSITIVITY;
    this.euler.x = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  }

  lock(): void {
    this.controls.lock();
  }

  onLockChange(handler: (locked: boolean) => void): void {
    this.controls.addEventListener('lock', () => handler(true));
    this.controls.addEventListener('unlock', () => handler(false));
  }

  /** ビュースポットへのスナップ等、外部からの視点設定 */
  setPose(position: THREE.Vector3, lookAt: THREE.Vector3): void {
    this.camera.position.set(position.x, position.y, position.z);
    this.camera.lookAt(lookAt);
  }

  update(dt: number): void {
    if (!this.isActive) return;

    const forward =
      (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) +
      this.moveInput.forward;
    const right =
      (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
      (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) +
      this.moveInput.right;

    const speed =
      this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? SPRINT_SPEED : WALK_SPEED;

    // カメラの向きから XZ 平面上の移動方向を作る
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));

    this.velocity
      .set(0, 0, 0)
      .addScaledVector(dir, forward)
      .addScaledVector(side, right);
    // バーチャルパッドの傾き量を活かすため、長さ 1 を超えたときだけ正規化する
    if (this.velocity.lengthSq() > 1) this.velocity.normalize();
    this.velocity.multiplyScalar(speed * dt);

    // 軸ごとに分けて衝突解決(壁ずり移動)
    this.tryMove(this.velocity.x, 0);
    this.tryMove(0, this.velocity.z);
    this.camera.position.y = EYE_HEIGHT;
  }

  private tryMove(dx: number, dz: number): void {
    if (dx === 0 && dz === 0) return;
    const next = this.camera.position.clone();
    next.x += dx;
    next.z += dz;
    if (!this.collides(next)) {
      this.camera.position.x = next.x;
      this.camera.position.z = next.z;
    }
  }

  private collides(pos: THREE.Vector3): boolean {
    for (const box of this.colliders) {
      if (
        pos.x > box.min.x - PLAYER_RADIUS &&
        pos.x < box.max.x + PLAYER_RADIUS &&
        pos.z > box.min.z - PLAYER_RADIUS &&
        pos.z < box.max.z + PLAYER_RADIUS &&
        box.min.y < pos.y &&
        box.max.y > pos.y - EYE_HEIGHT + 0.1
      ) {
        return true;
      }
    }
    return false;
  }
}
