import { describe, expect, it } from 'vitest';
import { createPenroseTriangle } from '../src/exhibits/PenroseTriangle';
import { createPenroseStairs } from '../src/exhibits/PenroseStairs';
import { createHollowFace } from '../src/exhibits/HollowFace';
import type { Exhibit } from '../src/exhibits/Exhibit';

// Canvas(DOM)に依存しない展示のみをここで検証する
const factories: Array<() => Exhibit> = [
  createPenroseTriangle,
  createPenroseStairs,
  createHollowFace,
];

describe('展示の共通契約', () => {
  const exhibits = factories.map((f) => f());

  it('id は一意で、タイトルとヒントを持つ', () => {
    const ids = exhibits.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ex of exhibits) {
      expect(ex.id).toMatch(/^[a-z0-9-]+$/);
      expect(ex.title.length).toBeGreaterThan(0);
      expect(ex.hint.length).toBeGreaterThan(10);
    }
  });

  it('ビュースポットの目の高さはプレイヤーの目線(1.6m)に一致する', () => {
    for (const ex of exhibits) {
      expect(ex.viewSpot).toBeDefined();
      expect(ex.viewSpot!.position.y).toBeCloseTo(1.6, 5);
    }
  });

  it('床置き展示はコライダーを持つ', () => {
    for (const ex of exhibits) {
      expect(ex.colliders?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('update を持つ展示は例外なく更新できる', () => {
    for (const ex of exhibits) {
      expect(() => {
        for (let i = 0; i < 10; i++) ex.update?.(1 / 60);
      }).not.toThrow();
    }
  });
});
