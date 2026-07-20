import * as THREE from 'three';
import type { Exhibit } from '../Exhibit';
import {
  createCafeWallCanvas,
  createCheckerShadowCanvas,
  createEbbinghausCanvas,
  createKanizsaCanvas,
  createMullerLyerCanvas,
  createZollnerCanvas,
} from './textures';
import { createWallLabel } from '../../museum/TitlePlate';

interface PaintingDef {
  id: string;
  title: string;
  hint: string;
  createCanvas: () => HTMLCanvasElement;
}

const PAINTINGS: PaintingDef[] = [
  {
    id: 'checker-shadow',
    title: 'チェッカーシャドー錯視',
    hint:
      '「A」と「B」のマスは、実はまったく同じ色です。B は「影の中にある明るいマス」だと脳が補正するため、A より明るく見えます。指などで周囲を隠して 2 つのマスだけを見比べると、同じ色であることが分かります。',
    createCanvas: createCheckerShadowCanvas,
  },
  {
    id: 'muller-lyer',
    title: 'ミュラー・リヤー錯視',
    hint:
      '2 本の横線は同じ長さです。矢羽が外へ開いた上の線は長く、矢印の先端で挟まれた下の線は短く見えます。矢羽が作る「奥行きの手がかり」に脳が引きずられるためと考えられています。',
    createCanvas: createMullerLyerCanvas,
  },
  {
    id: 'kanizsa',
    title: 'カニッツァの三角形',
    hint:
      '中央に白い三角形が浮かんで見えますが、輪郭線はどこにも描かれていません。欠けた円(パックマン形)の配置から、脳が「手前に三角形がある」と解釈して存在しない輪郭(主観的輪郭)を作り出しています。',
    createCanvas: createKanizsaCanvas,
  },
  {
    id: 'ebbinghaus',
    title: 'エビングハウス錯視',
    hint:
      '2 つのオレンジ色の円はまったく同じ大きさです。大きな円に囲まれた左の円は小さく、小さな円に囲まれた右の円は大きく見えます。大きさの知覚が絶対的なものではなく、周囲との比較で決まることを示す代表的な錯視です。',
    createCanvas: createEbbinghausCanvas,
  },
  {
    id: 'zollner',
    title: 'ツェルナー錯視',
    hint:
      '太い横線はすべて平行です。交差する短い斜線の向きに引きずられて、線同士が傾いて交わりそうに見えます。斜線との交差角度を脳が実際より大きく見積もるためと考えられています。',
    createCanvas: createZollnerCanvas,
  },
  {
    id: 'cafe-wall',
    title: 'カフェウォール錯視',
    hint:
      '灰色の横線はすべて平行な水平線です。白黒のタイルが半分ずつずれて並ぶことで、線が斜めに傾いて見えます。イギリスのカフェの外壁タイルで発見されたことからこの名が付きました。',
    createCanvas: createCafeWallCanvas,
  },
];

const PAINTING_SIZE = 1.7;

function createFramedPainting(def: PaintingDef): THREE.Group {
  const group = new THREE.Group();

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(PAINTING_SIZE + 0.16, PAINTING_SIZE + 0.16, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x2a2016, roughness: 0.6 }),
  );
  frame.castShadow = true;
  group.add(frame);

  const texture = new THREE.CanvasTexture(def.createCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const painting = new THREE.Mesh(
    new THREE.PlaneGeometry(PAINTING_SIZE, PAINTING_SIZE),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }),
  );
  painting.position.z = 0.04;
  group.add(painting);

  return group;
}

/**
 * 額装された 2D 錯視ギャラリー。
 * 1 枚ごとに独立した Exhibit を返し、それぞれ固有のヒントを持つ。
 * 各 root は「絵の中心が原点、絵は +Z を向く」状態で返すので、
 * layout 側で壁面に position / rotation を設定する。
 */
export function createGallery2D(): Exhibit[] {
  return PAINTINGS.map((def) => {
    const root = new THREE.Group();
    const painting = createFramedPainting(def);
    painting.position.y = 1.65; // 目線の高さに掲示
    root.add(painting);
    const label = createWallLabel(def.title);
    label.position.set(0.35, 0.62, 0.02);
    root.add(label);
    return {
      id: def.id,
      title: def.title,
      hint: def.hint,
      root,
      triggerRadius: 2.6,
    } satisfies Exhibit;
  });
}
