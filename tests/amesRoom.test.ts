import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { AMES_EYE, distort, scaleAt } from '../src/exhibits/AmesRoom';

describe('エイムズの部屋の歪み変換', () => {
  const samples: THREE.Vector3[] = [];
  for (const x of [-1.8, -0.9, 0, 0.9, 1.8]) {
    for (const y of [0, 1.2, 2.4]) {
      for (const z of [-0.4, -1.9, -3.4]) {
        samples.push(new THREE.Vector3(x, y, z));
      }
    }
  }

  it('歪ませた点は覗き窓の目から見て同じ視線上に残る(見え方が変わらない)', () => {
    for (const v of samples) {
      const original = v.clone().sub(AMES_EYE);
      const distorted = distort(v).sub(AMES_EYE);
      // 平行(外積がゼロ)かつ同方向
      const cross = new THREE.Vector3().crossVectors(original, distorted);
      expect(cross.length()).toBeLessThan(1e-10);
      expect(original.dot(distorted)).toBeGreaterThan(0);
    }
  });

  it('スケール係数は右へ行くほど小さくなる(左奥は遠く、右奥は近い)', () => {
    const y = 1.2;
    const z = -3.4;
    let prev = Infinity;
    for (const x of [-1.8, -0.9, 0, 0.9, 1.8]) {
      const s = scaleAt(new THREE.Vector3(x, y, z));
      expect(s).toBeLessThanOrEqual(prev);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThanOrEqual(1);
      prev = s;
    }
    expect(scaleAt(new THREE.Vector3(-1.8, y, z))).toBeGreaterThan(
      scaleAt(new THREE.Vector3(1.8, y, z)),
    );
  });

  it('歪んだ床は museum の床より下に沈まない', () => {
    for (const x of [-1.8, 0, 1.8]) {
      for (const z of [-0.4, -1.9, -3.4]) {
        const p = distort(new THREE.Vector3(x, 0, z));
        expect(p.y).toBeGreaterThanOrEqual(-1e-10);
      }
    }
  });
});
