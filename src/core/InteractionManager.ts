import * as THREE from 'three';
import type { Updatable } from './App';
import type { PlayerController } from './PlayerController';
import { DEFAULT_TRIGGER_RADIUS, exhibitFocusPoint, type Exhibit } from '../exhibits/Exhibit';

export type ActiveChangeHandler = (exhibit: Exhibit | null) => void;

/**
 * プレイヤーと展示の近接判定を行い、アクティブな展示の変化をイベントとして通知する。
 * UI(HintPanel)はこのイベントを購読して DOM を更新する。
 */
export class InteractionManager implements Updatable {
  private readonly exhibits: Exhibit[] = [];
  private readonly handlers: ActiveChangeHandler[] = [];
  private active: Exhibit | null = null;
  private readonly tmp = new THREE.Vector3();

  constructor(private readonly player: PlayerController) {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE') this.snapToViewSpot();
    });
  }

  add(exhibit: Exhibit): void {
    this.exhibits.push(exhibit);
  }

  get activeExhibit(): Exhibit | null {
    return this.active;
  }

  onActiveChange(handler: ActiveChangeHandler): void {
    this.handlers.push(handler);
  }

  /** アクティブ展示にビュースポットがあれば、視点をそこへスナップする */
  snapToViewSpot(): void {
    const spot = this.active?.viewSpot;
    if (!spot || !this.player.isLocked) return;
    this.player.setPose(spot.position, spot.target);
  }

  update(dt: number): void {
    for (const ex of this.exhibits) ex.update?.(dt);

    const pos = this.player.position;
    let nearest: Exhibit | null = null;
    let nearestDist = Infinity;
    for (const ex of this.exhibits) {
      const radius = ex.triggerRadius ?? DEFAULT_TRIGGER_RADIUS;
      // 高さは無視して床面上の距離で判定する
      const focus = exhibitFocusPoint(ex, this.tmp);
      const d = Math.hypot(focus.x - pos.x, focus.z - pos.z);
      if (d <= radius && d < nearestDist) {
        nearest = ex;
        nearestDist = d;
      }
    }

    if (nearest !== this.active) {
      this.active = nearest;
      for (const h of this.handlers) h(nearest);
    }
  }
}
