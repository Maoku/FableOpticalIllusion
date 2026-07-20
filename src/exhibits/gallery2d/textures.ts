/**
 * 2D 錯視の絵をプロシージャルに描く Canvas テクスチャ生成器。
 * 外部画像アセットに依存せず、コードのみで額装絵画を用意する。
 */

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

/** チェッカーシャドー錯視: 影の中の B と影の外の A は同じ明るさ */
export function createCheckerShadowCanvas(): HTMLCanvasElement {
  const size = 1024;
  const [canvas, ctx] = createCanvas(size, size);
  ctx.fillStyle = '#1c1c22';
  ctx.fillRect(0, 0, size, size);

  const cells = 5;
  const board = 760;
  const cell = board / cells;
  const ox = (size - board) / 2;
  const oy = 170;

  const dark = '#666666';
  const light = '#a8a8a8';
  const same = '#787878'; // A と B は実際に同じ色

  // 影: 右上の円柱から左下に落ちる radial gradient
  const drawBoard = (): void => {
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        const isDark = (r + c) % 2 === 0;
        const isA = r === 2 && c === 0;
        const isB = r === 2 && c === 2;
        ctx.fillStyle = isA || isB ? same : isDark ? dark : light;
        ctx.fillRect(ox + c * cell, oy + r * cell, cell + 1, cell + 1);
      }
    }
  };
  drawBoard();

  // 影(B のセルを覆う)
  const shadow = ctx.createRadialGradient(
    ox + 2.5 * cell,
    oy + 2.3 * cell,
    cell * 0.4,
    ox + 2.5 * cell,
    oy + 2.3 * cell,
    cell * 2.1,
  );
  shadow.addColorStop(0, 'rgba(0,0,0,0.45)');
  shadow.addColorStop(0.75, 'rgba(0,0,0,0.28)');
  shadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadow;
  ctx.fillRect(ox, oy, board, board);

  // 円柱
  const cx = ox + 4.1 * cell;
  const cyl = { w: cell * 0.9, h: cell * 1.7 };
  const cyTop = oy + 0.1 * cell;
  const grad = ctx.createLinearGradient(cx - cyl.w / 2, 0, cx + cyl.w / 2, 0);
  grad.addColorStop(0, '#3f7d4f');
  grad.addColorStop(0.5, '#7dbb8b');
  grad.addColorStop(1, '#2e5c3a');
  ctx.fillStyle = grad;
  ctx.fillRect(cx - cyl.w / 2, cyTop, cyl.w, cyl.h);
  ctx.beginPath();
  ctx.ellipse(cx, cyTop + cyl.h, cyl.w / 2, cyl.w / 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8fcf9d';
  ctx.beginPath();
  ctx.ellipse(cx, cyTop, cyl.w / 2, cyl.w / 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ラベル
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', ox + 0.5 * cell, oy + 2.5 * cell);
  ctx.fillText('B', ox + 2.5 * cell, oy + 2.5 * cell);

  return canvas;
}

/** ミュラー・リヤー錯視: 矢羽の向きで同じ長さの線分が違って見える */
export function createMullerLyerCanvas(): HTMLCanvasElement {
  const size = 1024;
  const [canvas, ctx] = createCanvas(size, size);
  ctx.fillStyle = '#f2ede2';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#22222a';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';

  const lineLen = 560;
  const finLen = 90;
  const x0 = (size - lineLen) / 2;
  const x1 = x0 + lineLen;

  const drawLine = (y: number, inward: boolean): void => {
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
        ctx.lineTo(x + dir * sign * finLen * 0.7, y + dy * finLen * 0.7);
        ctx.stroke();
      }
    }
  };

  drawLine(size * 0.36, false); // 外向きの矢羽(短く見える)
  drawLine(size * 0.64, true); // 内向きの矢羽(長く見える)

  return canvas;
}

/** カニッツァの三角形: 存在しない白い三角形の輪郭が見える */
export function createKanizsaCanvas(): HTMLCanvasElement {
  const size = 1024;
  const [canvas, ctx] = createCanvas(size, size);
  ctx.fillStyle = '#f2ede2';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2 + 40;
  const R = 330; // 三角形の外接円半径
  const pacR = 110;

  // 頂点(上、左下、右下)
  const verts: [number, number][] = [];
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
    verts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
  }

  // パックマン: 三角形の内側方向に欠けた円
  ctx.fillStyle = '#22222a';
  for (const [vx, vy] of verts) {
    const toCenter = Math.atan2(cy - vy, cx - vx);
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.arc(vx, vy, pacR, toCenter + Math.PI / 3, toCenter - Math.PI / 3);
    ctx.closePath();
    ctx.fill();
  }

  // 輪郭三角形(反転・線のみ)で錯視を強調
  ctx.strokeStyle = '#22222a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
    const px = cx + R * 0.92 * Math.cos(a);
    const py = cy + R * 0.92 * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  return canvas;
}

/** カフェウォール錯視: 平行な水平線が傾いて見える */
export function createCafeWallCanvas(): HTMLCanvasElement {
  const size = 1024;
  const [canvas, ctx] = createCanvas(size, size);
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(0, 0, size, size);

  const rows = 9;
  const tile = 128;
  const mortar = 8;
  const oy = (size - rows * (tile / 2 + mortar)) / 2;

  for (let r = 0; r < rows; r++) {
    const y = oy + r * (tile / 2 + mortar);
    const offset = (r % 4) * (tile / 4) * (r % 2 === 0 ? 1 : -1);
    for (let c = -1; c <= Math.ceil(size / tile); c++) {
      ctx.fillStyle = c % 2 === 0 ? '#111111' : '#f5f0e6';
      ctx.fillRect(c * tile + offset, y, tile, tile / 2);
    }
  }
  // モルタル(灰色の水平線)を上書き
  ctx.fillStyle = '#8a8a8a';
  for (let r = 0; r <= rows; r++) {
    const y = oy + r * (tile / 2 + mortar) - mortar;
    ctx.fillRect(0, y, size, mortar);
  }

  return canvas;
}
