import * as THREE from 'three';
import type { Exhibit } from './Exhibit';

/**
 * ミュラー・リヤー調整実験(インタラクティブ展示)。
 *
 * 上の基準線(外向きの矢羽)と同じ長さに見えるよう、
 * 下の線(内向きの矢羽)の長さをマウスホイールで調整してもらう。
 * クリックで答え合わせをすると、実際の長さと誤差(%)が表示される。
 * 内向きの矢羽の線は長く見えるため、たいてい実際より短く合わせてしまう。
 */

const TEX_SIZE = 1024;
const LINE_Y_REF = 330;
const LINE_Y_ADJ = 640;
const FIN = 74;
const MIN_LEN = 220;
const MAX_LEN = 860;

interface RoundState {
  refLen: number;
  adjLen: number;
  revealed: boolean;
}

function newRound(): RoundState {
  return {
    refLen: 500 + Math.random() * 140,
    adjLen: 300 + Math.random() * 420,
    revealed: false,
  };
}

function drawArrowLine(
  ctx: CanvasRenderingContext2D,
  y: number,
  len: number,
  inward: boolean,
): void {
  const x0 = (TEX_SIZE - len) / 2;
  const x1 = x0 + len;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  const sign = inward ? 1 : -1;
  for (const [x, dir] of [
    [x0, 1],
    [x1, -1],
  ] as const) {
    for (const dy of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dir * sign * FIN, y + dy * FIN);
      ctx.stroke();
    }
  }
}

function drawScreen(ctx: CanvasRenderingContext2D, state: RoundState): void {
  ctx.fillStyle = '#f2ede2';
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  ctx.fillStyle = '#5a544a';
  ctx.font = '600 34px "Hiragino Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('下の線を、上の線と同じ長さに合わせてください', TEX_SIZE / 2, 120);

  ctx.strokeStyle = '#22222a';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  drawArrowLine(ctx, LINE_Y_REF, state.refLen, false);
  drawArrowLine(ctx, LINE_Y_ADJ, state.adjLen, true);

  if (state.revealed) {
    // 真の長さの比較ガイド
    ctx.strokeStyle = '#b03a3a';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 10]);
    for (const len of [state.refLen]) {
      const x0 = (TEX_SIZE - len) / 2;
      const x1 = x0 + len;
      for (const x of [x0, x1]) {
        ctx.beginPath();
        ctx.moveTo(x, LINE_Y_REF - 100);
        ctx.lineTo(x, LINE_Y_ADJ + 100);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    const errorPct = ((state.adjLen - state.refLen) / state.refLen) * 100;
    ctx.fillStyle = '#b03a3a';
    ctx.font = '700 44px "Hiragino Sans", sans-serif';
    const label =
      Math.abs(errorPct) < 1.5
        ? 'ほぼ完璧です!'
        : `${Math.abs(errorPct).toFixed(0)}% ${errorPct < 0 ? '短く' : '長く'}合わせました`;
    ctx.fillText(label, TEX_SIZE / 2, 840);
    ctx.font = '500 30px "Hiragino Sans", sans-serif';
    ctx.fillText('クリックでもう一度', TEX_SIZE / 2, 910);
  } else {
    ctx.fillStyle = '#8a8478';
    ctx.font = '500 30px "Hiragino Sans", sans-serif';
    ctx.fillText('ホイール: 調整 / クリック: 答え合わせ', TEX_SIZE / 2, 880);
  }
}

export function createMullerLyerStation(): Exhibit {
  const root = new THREE.Group();

  // スタンドとスクリーン
  const standMat = new THREE.MeshStandardMaterial({ color: 0x2c2a30, roughness: 0.8 });
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.0, 0.18), standMat);
  stand.position.y = 0.5;
  root.add(stand);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.34, 1.34, 0.08), standMat);
  frame.position.y = 1.62;
  frame.castShadow = true;
  root.add(frame);

  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;
  let state = newRound();
  drawScreen(ctx, state);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.22, 1.22),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  screen.position.set(0, 1.62, 0.045);
  root.add(screen);

  const redraw = (): void => {
    drawScreen(ctx, state);
    texture.needsUpdate = true;
  };

  return {
    id: 'muller-lyer-station',
    title: 'ミュラー・リヤー調整実験',
    hint:
      '矢印の先端で挟まれた下の線は実際より短く見え、矢羽が外へ開いた上の線は長く見えます。そのため「同じ長さ」に合わせたつもりでも、たいてい下の線を実際より長くしてしまいます。錯視は知識があっても消えません — 何 % ずれたかで、自分の脳がどれだけ強く騙されているかを測ってみてください。',
    root,
    viewSpot: {
      position: new THREE.Vector3(0, 1.6, 1.9),
      target: new THREE.Vector3(0, 1.62, 0),
    },
    triggerRadius: 3,
    interactionHint: 'ホイール: 長さを調整 / クリック: 答え合わせ',
    onWheel(deltaY: number): void {
      if (state.revealed) return;
      state.adjLen = THREE.MathUtils.clamp(state.adjLen - deltaY * 0.35, MIN_LEN, MAX_LEN);
      redraw();
    },
    onOperate(): void {
      if (state.revealed) {
        state = newRound();
      } else {
        state.revealed = true;
      }
      redraw();
    },
    colliders: [
      new THREE.Box3(new THREE.Vector3(-0.7, 0, -0.15), new THREE.Vector3(0.7, 2.3, 0.15)),
    ],
  };
}
