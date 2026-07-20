import * as THREE from 'three';
import type { Updatable } from './App';
import type { PlayerController } from './PlayerController';
import {
  DEFAULT_TRIGGER_RADIUS,
  exhibitFocusPoint,
  exhibitViewSpots,
  type Exhibit,
} from '../exhibits/Exhibit';

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
      if (e.code === 'KeyF') this.operate();
    });
    // ポインターロック中のクリックとホイールは展示の操作に使う
    window.addEventListener('mousedown', () => {
      if (this.player.isLocked) this.operate();
    });
    window.addEventListener('wheel', (e) => {
      if (this.player.isLocked) this.active?.onWheel?.(e.deltaY);
    });
  }

  /** アクティブ展示の操作(照明切替、答え合わせ等)を実行する */
  operate(): void {
    if (!this.player.isLocked) return;
    this.active?.onOperate?.();
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

  /** アクティブ展示にビュースポットがあれば、最も近いスポットへ視点をスナップする */
  snapToViewSpot(): void {
    if (!this.active || !this.player.isLocked) return;
    const spots = exhibitViewSpots(this.active);
    if (spots.length === 0) return;
    const pos = this.player.position;
    let nearest = spots[0];
    let nearestDist = Infinity;
    for (const spot of spots) {
      const d = Math.hypot(spot.position.x - pos.x, spot.position.z - pos.z);
      if (d < nearestDist) {
        nearest = spot;
        nearestDist = d;
      }
    }
    this.player.setPose(nearest.position, nearest.target);
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
