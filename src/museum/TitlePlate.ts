import * as THREE from 'three';

function createTextCanvas(
  text: string,
  width: number,
  height: number,
  fontSize: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#17151b';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#8a713f';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  ctx.fillStyle = '#d4b06a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // 枠に収まるようフォントサイズを自動調整
  let size = fontSize;
  const maxWidth = width - 70;
  do {
    ctx.font = `600 ${size}px 'Hiragino Sans', 'Noto Sans JP', sans-serif`;
    size -= 2;
  } while (size > 10 && ctx.measureText(text).width > maxWidth);
  ctx.fillText(text, width / 2, height / 2);
  return canvas;
}

function createTextMaterial(canvas: HTMLCanvasElement): THREE.MeshStandardMaterial {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6 });
}

/**
 * 展示名を記した書見台スタイルのプレート。
 * 原点は床、読み面は +z 側へ傾いて向く。
 */
export function createTitlePlate(title: string): THREE.Object3D {
  const group = new THREE.Group();

  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.85, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x2c2a30, roughness: 0.8 }),
  );
  stand.position.y = 0.425;
  group.add(stand);

  const dark = new THREE.MeshStandardMaterial({ color: 0x17151b, roughness: 0.8 });
  const textMat = createTextMaterial(createTextCanvas(title, 512, 192, 44));
  // テキストは上面(+y)のみに貼る
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.014, 0.24), [
    dark,
    dark,
    textMat,
    dark,
    dark,
    dark,
  ]);
  board.position.set(0, 0.88, 0.05);
  board.rotation.x = Math.PI / 3.2;
  group.add(board);

  return group;
}

/** 壁に貼る小さな作品ラベル(+z 向き) */
export function createWallLabel(text: string): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.15),
    createTextMaterial(createTextCanvas(text, 512, 128, 40)),
  );
}

/** 壁掛けの館内サイン(+z 向き)。原点はサイン中心 */
export function createWallSign(text: string, width = 4.2, height = 0.75): THREE.Object3D {
  const dark = new THREE.MeshStandardMaterial({ color: 0x17151b, roughness: 0.8 });
  const textMat = createTextMaterial(createTextCanvas(text, 1024, 192, 84));
  // テキストは前面(+z)のみに貼る
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.06), [
    dark,
    dark,
    dark,
    dark,
    textMat,
    dark,
  ]);
}
