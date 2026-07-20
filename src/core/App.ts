import * as THREE from 'three';

export interface Updatable {
  update(dt: number): void;
}

/**
 * レンダラー・シーン・カメラの生成と、リサイズ処理・描画ループを担うコア。
 */
export class App {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  private readonly clock = new THREE.Clock();
  private readonly updatables: Updatable[] = [];
  private readonly preRenders: Array<(renderer: THREE.WebGLRenderer, scene: THREE.Scene) => void> =
    [];

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0b0f);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.05,
      200,
    );

    window.addEventListener('resize', this.onResize);
  }

  addUpdatable(u: Updatable): void {
    this.updatables.push(u);
  }

  /** メイン描画の前に呼ばれる処理(レンダーターゲットへの描画等)を登録する */
  addPreRender(fn: (renderer: THREE.WebGLRenderer, scene: THREE.Scene) => void): void {
    this.preRenders.push(fn);
  }

  start(): void {
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.1);
      for (const u of this.updatables) u.update(dt);
      for (const fn of this.preRenders) fn(this.renderer, this.scene);
      this.renderer.render(this.scene, this.camera);
    });
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
