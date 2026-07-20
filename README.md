# Fable Optical Illusion Museum

ブラウザで歩き回れる 3D 錯視ミュージアム。Three.js + TypeScript + Vite 製の完全静的サイトです。

![Three.js](https://img.shields.io/badge/Three.js-black?logo=three.js) ![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)

## 遊び方

```bash
npm install
npm run dev
```

ブラウザで表示された URL を開き、クリックして入館します。

| 操作 | キー |
|---|---|
| 移動 | `W` `A` `S` `D` / 矢印キー |
| 視点 | マウス |
| 早歩き | `Shift` |
| ビュースポットへ視点スナップ | `E`(床の金色マーカー付近で) |
| ヒントの表示 / 非表示 | `H` または画面下部のボタン |
| カーソル表示 | `Esc` |

## 展示ラインナップ

錯視は「特定の視点から見る」ことが本質のため、各展示の前には金色の床マーカー
(ビュースポット)があります。`E` キーで錯視が成立する視点にスナップできます。

- **ペンローズの三角形** — 特定視点でのみ閉じて見える不可能図形
- **不可能な立方体** — 奥の梁が手前の梁を突き抜けて見える立体交差
- **アナモルフォーシス** — 床と壁の歪んだ絵が視点から正しい像に立ち上がる
- **ペンローズの階段** — 無限に上り続けるように見える閉ループ階段(ボール付き)
- **エイムズの部屋** — 覗き窓から見ると普通の部屋。同じ大きさの人形が激変して見える(横のガラス面から種明かしが見える)
- **ホロウフェイス** — 凹んだ顔が飛び出して見え、視線を追いかけてくる
- **回転蛇錯視** — 完全な静止画なのに周辺視で回転して見える大型絵画
- **二つの真実(REAL / FAKE)** — 当館オリジナル。金の粒の雲が、南から見ると REAL、東から見ると FAKE と読める 2 視点アナモルフォーシス
- **2D 錯視ギャラリー** — チェッカーシャドー / ミュラー・リヤー / カニッツァの三角形 / エビングハウス / ツェルナー / カフェウォール

すべてのジオメトリ・テクスチャはコードでプロシージャル生成しており、外部アセットはありません。

## 開発

```bash
npm run dev      # 開発サーバー
npm run build    # 型チェック + 本番ビルド(dist/)
npm run preview  # ビルド結果のプレビュー
npm test         # Vitest 単体テスト
npm run lint     # ESLint
npm run format   # Prettier
```

構成の詳細は [Docs/IMPLEMENTATION_PLAN.md](Docs/IMPLEMENTATION_PLAN.md) を参照してください。

## デプロイ

完全に静的なサイトです。`npm run build` の `dist/` を GitHub Pages や
Cloudflare Pages などの静的ホスティングへそのまま配置できます
(`vite.config.ts` で `base: './'` 設定済みのためサブパス配下でも動作します)。
