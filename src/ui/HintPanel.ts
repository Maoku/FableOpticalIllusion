import { exhibitViewSpots, type Exhibit } from '../exhibits/Exhibit';

/**
 * アクティブな展示の名前と「ヒントを見る」ボタン、説明パネルを表示する。
 * 3D 側のイベント(アクティブ展示の変化)を購読して DOM を更新するだけで、
 * 3D の実装には依存しない。
 */
export class HintPanel {
  private readonly bar: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly viewSpotHintEl: HTMLElement;
  private readonly operateHintEl: HTMLElement;
  private readonly toggleButton: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly panelTextEl: HTMLElement;

  private current: Exhibit | null = null;
  private open = false;

  constructor(
    root: HTMLElement,
    private readonly touch = false,
  ) {
    this.bar = document.createElement('div');
    this.bar.className = 'exhibit-bar hidden';

    this.titleEl = document.createElement('div');
    this.titleEl.className = 'exhibit-title';
    this.bar.appendChild(this.titleEl);

    this.toggleButton = document.createElement('button');
    this.toggleButton.className = 'hint-toggle';
    this.toggleButton.addEventListener('click', () => this.toggle());
    this.bar.appendChild(this.toggleButton);

    this.viewSpotHintEl = document.createElement('div');
    this.viewSpotHintEl.className = 'viewspot-hint';
    this.viewSpotHintEl.innerHTML = this.touch
      ? '「視点」でビュースポットから見る'
      : '<kbd>E</kbd> ビュースポットから見る';
    this.bar.appendChild(this.viewSpotHintEl);

    this.operateHintEl = document.createElement('div');
    this.operateHintEl.className = 'viewspot-hint';
    this.bar.appendChild(this.operateHintEl);

    this.panel = document.createElement('div');
    this.panel.className = 'hint-panel hidden';
    this.panelTextEl = document.createElement('p');
    this.panel.appendChild(this.panelTextEl);

    // タッチ操作時はバーとヒントを画面上部に縦積みするためのコンテナ
    // (PC では display:contents で従来どおり各要素が個別に配置される)
    const container = document.createElement('div');
    container.className = 'exhibit-ui';
    container.appendChild(this.bar);
    container.appendChild(this.panel);
    root.appendChild(container);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH') this.toggle();
    });

    this.render();
  }

  /** InteractionManager の onActiveChange から呼ばれる */
  setExhibit(exhibit: Exhibit | null): void {
    if (exhibit === this.current) return;
    this.current = exhibit;
    this.open = false;
    this.render();
  }

  toggle(): void {
    if (!this.current) return;
    this.open = !this.open;
    this.render();
  }

  private render(): void {
    const ex = this.current;
    this.bar.classList.toggle('hidden', !ex);
    this.panel.classList.toggle('hidden', !ex || !this.open);
    if (!ex) return;

    this.titleEl.textContent = ex.title;
    const label = this.open ? 'ヒントを閉じる' : 'ヒントを見る';
    this.toggleButton.innerHTML = this.touch ? label : `${label} <kbd>H</kbd>`;
    this.viewSpotHintEl.style.display = exhibitViewSpots(ex).length > 0 ? '' : 'none';
    const hint = (this.touch ? ex.touchInteractionHint : undefined) ?? ex.interactionHint ?? '';
    this.operateHintEl.textContent = hint;
    this.operateHintEl.style.display = hint ? '' : 'none';
    this.panelTextEl.textContent = ex.hint;
  }
}
