import type { PlayerController } from '../core/PlayerController';

/**
 * タッチ端末かどうか(粗いポインタ = 指での操作)。
 * `?touch=1` / `?touch=0` で強制的に切り替えられる(PC での動作確認用)。
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const forced = new URLSearchParams(window.location.search).get('touch');
  if (forced === '1') return true;
  if (forced === '0') return false;
  return window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

/** ノブの可動半径。ベース半径に対する比率(残りはノブ自体の大きさ分) */
const STICK_TRAVEL_RATIO = 0.62;
/** タップと判定するドラッグ距離(px)と時間(ms)の上限 */
const TAP_MAX_DISTANCE = 12;
const TAP_MAX_DURATION = 300;

export interface TouchControlsHandlers {
  /** 画面タップ / 操作ボタン(= マウスクリック相当) */
  onOperate(): void;
  /** ビュースポットへスナップ(= E キー相当) */
  onViewSpot(): void;
  /** ヒントの開閉(= H キー相当) */
  onHint(): void;
  /** 値の増減(= ホイール相当。deltaY と同じ符号) */
  onAdjust(deltaY: number): void;
}

/**
 * スマホ向けのバーチャルパッド UI。
 * 左下のスティックで移動、画面ドラッグで視点、右下のボタンで各操作を行う。
 * 入力は PlayerController とハンドラへ渡すだけで、3D の実装には依存しない。
 */
export class TouchControls {
  private readonly root: HTMLElement;
  private readonly stickBase: HTMLElement;
  private readonly stickKnob: HTMLElement;
  private readonly adjustGroup: HTMLElement;
  private readonly operateButton: HTMLButtonElement;
  private readonly viewSpotButton: HTMLButtonElement;

  /** スティックを掴んでいる pointerId(未使用時は null) */
  private stickPointerId: number | null = null;
  private readonly stickOrigin = { x: 0, y: 0 };
  /** ノブの可動半径(px)。CSS のサイズが画面幅で変わるので pointerdown 時に測る */
  private stickTravel = 1;

  /** 視点ドラッグ中の pointerId */
  private lookPointerId: number | null = null;
  private readonly lookLast = { x: 0, y: 0 };
  private lookStart = { x: 0, y: 0, time: 0 };

  private enabled = false;

  constructor(
    parent: HTMLElement,
    private readonly player: PlayerController,
    private readonly handlers: TouchControlsHandlers,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'touch-controls hidden';

    // 視点ドラッグ用の全画面レイヤー(スティックやボタンの下に敷く)
    const lookLayer = document.createElement('div');
    lookLayer.className = 'touch-look';
    lookLayer.addEventListener('pointerdown', this.onLookDown);
    lookLayer.addEventListener('pointermove', this.onLookMove);
    lookLayer.addEventListener('pointerup', this.onLookUp);
    lookLayer.addEventListener('pointercancel', this.onLookUp);
    this.root.appendChild(lookLayer);

    this.stickBase = document.createElement('div');
    this.stickBase.className = 'touch-stick';
    this.stickKnob = document.createElement('div');
    this.stickKnob.className = 'touch-stick-knob';
    this.stickBase.appendChild(this.stickKnob);
    this.stickBase.addEventListener('pointerdown', this.onStickDown);
    this.stickBase.addEventListener('pointermove', this.onStickMove);
    this.stickBase.addEventListener('pointerup', this.onStickUp);
    this.stickBase.addEventListener('pointercancel', this.onStickUp);
    this.root.appendChild(this.stickBase);

    const buttons = document.createElement('div');
    buttons.className = 'touch-buttons';
    this.operateButton = this.createButton('操作', () => this.handlers.onOperate());
    this.viewSpotButton = this.createButton('視点', () => this.handlers.onViewSpot());
    const hintButton = this.createButton('ヒント', () => this.handlers.onHint());
    buttons.append(this.viewSpotButton, this.operateButton, hintButton);
    this.root.appendChild(buttons);

    // ホイール操作を持つ展示でだけ表示する増減ボタン
    this.adjustGroup = document.createElement('div');
    this.adjustGroup.className = 'touch-adjust hidden';
    this.adjustGroup.append(
      this.createButton('＋', () => this.handlers.onAdjust(-100)),
      this.createButton('－', () => this.handlers.onAdjust(100)),
    );
    this.root.appendChild(this.adjustGroup);

    parent.appendChild(this.root);
  }

  /** 入館後に有効化する。無効化すると入力も初期化される */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.root.classList.toggle('hidden', !enabled);
    this.player.setTouchActive(enabled);
    if (!enabled) this.resetStick();
  }

  /** アクティブ展示に応じて操作ボタンの出し分けを行う */
  setExhibitState(options: { operable: boolean; hasViewSpot: boolean; adjustable: boolean }): void {
    this.operateButton.classList.toggle('dim', !options.operable);
    this.viewSpotButton.classList.toggle('dim', !options.hasViewSpot);
    this.adjustGroup.classList.toggle('hidden', !options.adjustable);
  }

  private createButton(label: string, onTap: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'touch-button';
    button.textContent = label;
    // click だと視点ドラッグ後に誤発火しうるので pointerup を使う
    button.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      onTap();
    });
    button.addEventListener('pointerdown', (e) => e.stopPropagation());
    return button;
  }

  private onStickDown = (e: PointerEvent): void => {
    if (!this.enabled || this.stickPointerId !== null) return;
    e.stopPropagation();
    this.stickPointerId = e.pointerId;
    const rect = this.stickBase.getBoundingClientRect();
    this.stickOrigin.x = rect.left + rect.width / 2;
    this.stickOrigin.y = rect.top + rect.height / 2;
    this.stickTravel = Math.max(1, (rect.width / 2) * STICK_TRAVEL_RATIO);
    this.stickBase.setPointerCapture(e.pointerId);
    this.updateStick(e.clientX, e.clientY);
  };

  private onStickMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.stickPointerId) return;
    e.stopPropagation();
    this.updateStick(e.clientX, e.clientY);
  };

  private onStickUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.stickPointerId) return;
    e.stopPropagation();
    this.resetStick();
  };

  private updateStick(clientX: number, clientY: number): void {
    let dx = clientX - this.stickOrigin.x;
    let dy = clientY - this.stickOrigin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.stickTravel) {
      dx = (dx / dist) * this.stickTravel;
      dy = (dy / dist) * this.stickTravel;
    }
    this.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    // 画面上方向 = 前進
    this.player.setMoveInput(-dy / this.stickTravel, dx / this.stickTravel);
  }

  private resetStick(): void {
    this.stickPointerId = null;
    this.stickKnob.style.transform = '';
    this.player.setMoveInput(0, 0);
  }

  private onLookDown = (e: PointerEvent): void => {
    if (!this.enabled || this.lookPointerId !== null) return;
    this.lookPointerId = e.pointerId;
    this.lookLast.x = e.clientX;
    this.lookLast.y = e.clientY;
    this.lookStart = { x: e.clientX, y: e.clientY, time: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  private onLookMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.lookPointerId) return;
    this.player.look(e.clientX - this.lookLast.x, e.clientY - this.lookLast.y);
    this.lookLast.x = e.clientX;
    this.lookLast.y = e.clientY;
  };

  private onLookUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.lookPointerId) return;
    this.lookPointerId = null;
    // ほとんど動かさずに離したときはタップ = 操作とみなす
    const moved = Math.hypot(e.clientX - this.lookStart.x, e.clientY - this.lookStart.y);
    if (moved <= TAP_MAX_DISTANCE && performance.now() - this.lookStart.time <= TAP_MAX_DURATION) {
      this.handlers.onOperate();
    }
  };
}
