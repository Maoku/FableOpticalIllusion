/**
 * クロスヘア・操作説明・入館(ポインターロック開始 / タッチ操作開始)オーバーレイ。
 */
export class Hud {
  private readonly startOverlay: HTMLElement;

  constructor(root: HTMLElement, onStart: () => void, touch = false) {
    const crosshair = document.createElement('div');
    crosshair.className = 'crosshair';
    root.appendChild(crosshair);

    const help = document.createElement('div');
    help.className = 'help';
    help.innerHTML = touch
      ? ['左下スティック 移動', '画面ドラッグ 視点', '右下ボタン 操作'].join('<br>')
      : [
          '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移動',
          'マウス 視点',
          '<kbd>Shift</kbd> 早歩き',
          '<kbd>Esc</kbd> カーソル表示',
        ].join('<br>');
    root.appendChild(help);

    this.startOverlay = document.createElement('div');
    this.startOverlay.className = 'start-overlay';
    this.startOverlay.innerHTML = `
      <h1>Fable Optical Illusion Museum</h1>
      <p>— 錯視の美術館 —</p>
      <p>${touch ? 'タップして入館する' : 'クリックして入館する'}</p>
      <p style="font-size:12px;opacity:.6">
        ${
          touch
            ? 'スティック 移動 / ドラッグ 視点 / ボタン 操作・視点・ヒント'
            : 'WASD 移動 / マウス 視点 / E ビュースポット / H ヒント'
        }
      </p>
    `;
    this.startOverlay.addEventListener('click', onStart);
    root.appendChild(this.startOverlay);
  }

  /** 入館状態に応じて入館オーバーレイを切り替える */
  setLocked(locked: boolean): void {
    this.startOverlay.classList.toggle('hidden', locked);
  }
}
