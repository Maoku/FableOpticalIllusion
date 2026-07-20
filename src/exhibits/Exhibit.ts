import * as THREE from 'three';

/** 錯視が成立する推奨視点 */
export interface ViewSpot {
  /** 目の位置(ワールド座標) */
  position: THREE.Vector3;
  /** 注視点(ワールド座標) */
  target: THREE.Vector3;
}

/**
 * 展示の共通インターフェース。
 * 各展示は独立モジュールとしてこれを実装し、layout に登録するだけで館内に追加される。
 */
export interface Exhibit {
  id: string;
  /** 展示名(プレート・UI 表示) */
  title: string;
  /** 見え方の説明(初期非表示、ボタンで開閉) */
  hint: string;
  /** 3D オブジェクト。位置・向きは layout 側で設定する */
  root: THREE.Group;
  /** 錯視が成立する推奨視点 */
  viewSpot?: ViewSpot;
  /** UI が反応する近接距離(m)。省略時は 3.5 */
  triggerRadius?: number;
  /**
   * 通行不可領域(生成時はローカル座標)。
   * layout での配置時にワールド座標へ変換され、プレイヤーのコリジョンに登録される。
   */
  colliders?: THREE.Box3[];
  /** アニメーションが必要な展示用 */
  update?(dt: number): void;
  /** メイン描画前の追加レンダリング(レンダーターゲットを使う展示用) */
  preRender?(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void;
}

export const DEFAULT_TRIGGER_RADIUS = 3.5;

/** 展示の近接判定基準点(ワールド座標) */
export function exhibitFocusPoint(exhibit: Exhibit, out: THREE.Vector3): THREE.Vector3 {
  return exhibit.root.getWorldPosition(out);
}
