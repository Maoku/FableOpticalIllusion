import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * オリジナル展示「絵の具のない黄色」(インタラクティブ)。
 *
 * 左のパネルは赤と緑の点だけで塗られており、黄色はどこにも使われていない。
 * しかし離れて見ると目の解像度が粒を分けられなくなり、網膜上で光が混ざって
 * 右の「本物の黄色一色」のパネルと見分けがつかなくなる(空間的な加法混色)。
 *
 * 右パネルの色は左パネルのピクセル平均から計算しているため、
 * 融合した瞬間に 2 枚は正確に同じ色になる。
 * ホイールで点の粒の大きさを変えると、融合が起きる距離が変わる。
 */

const PANEL_W = 1.85;
const PANEL_H = 2.2;
const PANEL_CY = 1.72;
const TEX_W = 768;
const TEX_H = 912;
const DOT_RED = [255, 67, 34];
const DOT_GREEN = [63, 227, 42];
/** ホイールで切り替える点のセルサイズ(px)。初期は index 1 */
const CELL_SIZES = [3, 6, 12, 24];

function createDotCanvas(cell: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d')!;
  const red = `rgb(${DOT_RED.join(',')})`;
  const green = `rgb(${DOT_GREEN.join(',')})`;
  for (let y = 0; y < TEX_H; y += cell) {
    for (let x = 0; x < TEX_W; x += cell) {
      ctx.fillStyle = Math.random() < 0.5 ? red : green;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  return canvas;
}

/**
 * 点描キャンバスの平均色。
 * 網膜上の混色も GPU のミップマップ縮小もリニア(光の強さ)空間での平均なので、
 * sRGB 値をリニアへ変換してから平均する。戻り値はリニア作業空間の色。
 */
function averageColor(canvas: HTMLCanvasElement): THREE.Color {
  const data = canvas.getContext('2d')!.getImageData(0, 0, TEX_W, TEX_H).data;
  const toLinear = (u: number): number => {
    const c = u / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4 * 13) {
    r += toLinear(data[i]);
    g += toLinear(data[i + 1]);
    b += toLinear(data[i + 2]);
    n++;
  }
  return new THREE.Color().setRGB(r / n, g / n, b / n);
}

export function createPaintlessYellow(): Exhibit {
  const root = new THREE.Group();

  // 額縁と中央の仕切り
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2 * PANEL_W + 0.6, PANEL_H + 0.4, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x17151b, roughness: 0.8 }),
  );
  frame.position.set(0, PANEL_CY, -0.02);
  root.add(frame);
  const divider = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, PANEL_H + 0.4, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x8a713f, roughness: 0.5, metalness: 0.4 }),
  );
  divider.position.set(0, PANEL_CY, 0);
  root.add(divider);

  // 点描テクスチャは全サイズ分を先に生成しておき、ホイールで差し替える
  const dotCanvases = CELL_SIZES.map((cell) => createDotCanvas(cell));
  const textures = dotCanvases.map((canvas) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  });
  let index = 0;

  // 左: 赤と緑の点描(照明で色が変わらないよう MeshBasicMaterial)
  const dotsMat = new THREE.MeshBasicMaterial({ map: textures[index] });
  const dots = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_W, PANEL_H), dotsMat);
  dots.position.set(-(PANEL_W / 2 + 0.06), PANEL_CY, 0.02);
  root.add(dots);

  // 右: 左の平均色で塗った一色のパネル
  const solid = new THREE.Mesh(
    new THREE.PlaneGeometry(PANEL_W, PANEL_H),
    new THREE.MeshBasicMaterial({ color: averageColor(dotCanvases[index]) }),
  );
  solid.position.set(PANEL_W / 2 + 0.06, PANEL_CY, 0.02);
  root.add(solid);
  const solidMat = solid.material as THREE.MeshBasicMaterial;

  let wheelAccum = 0;

  return {
    id: 'paintless-yellow',
    title: '絵の具のない黄色',
    hint:
      '左右のパネルは、遠くから見るとまったく同じ黄土色に見えます。しかし左のパネルに使われている色は赤と緑の 2 色だけ——黄色はどこにも塗られていません。近づくと目の解像度が粒を分解できるようになり、点描が姿を現します。右の一色パネルは左のピクセル平均から作ってあるので、融合した瞬間に 2 枚は正確に一致します。点描画家たちが夢見た「網膜の上での混色」を、粒の大きさを変えながら確かめられる Fable のオリジナル展示です。',
    root,
    viewSpot: {
      position: new THREE.Vector3(0, 1.6, 8.1),
      target: new THREE.Vector3(0, PANEL_CY, 0),
    },
    extraViewSpots: [
      {
        position: new THREE.Vector3(0, 1.6, 1.35),
        target: new THREE.Vector3(0, PANEL_CY, 0),
      },
    ],
    triggerRadius: 8.8,
    interactionHint: 'ホイール: 点の粒の大きさを変える',
    touchInteractionHint: '「+ / −」: 点の粒の大きさを変える',
    onWheel(deltaY: number): void {
      wheelAccum += deltaY;
      const step = Math.trunc(wheelAccum / 100);
      if (step === 0) return;
      wheelAccum -= step * 100;
      const next = THREE.MathUtils.clamp(index + step, 0, CELL_SIZES.length - 1);
      if (next === index) return;
      index = next;
      dotsMat.map = textures[index];
      dotsMat.needsUpdate = true;
      solidMat.color.copy(averageColor(dotCanvases[index]));
    },
  };
}
