// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { InteractionManager } from '../src/core/InteractionManager';
import type { PlayerController } from '../src/core/PlayerController';
import type { Exhibit } from '../src/exhibits/Exhibit';

function createFakePlayer(x: number, z: number): PlayerController {
  return {
    position: new THREE.Vector3(x, 1.6, z),
    isLocked: true,
    setPose: () => {},
  } as unknown as PlayerController;
}

function createFakeExhibit(id: string, x: number, z: number, radius = 3): Exhibit {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.updateMatrixWorld(true);
  return { id, title: id, hint: 'hint', root, triggerRadius: radius };
}

describe('InteractionManager の近接判定', () => {
  it('近接範囲に入った展示がアクティブになり、離れると null に戻る', () => {
    const player = createFakePlayer(0, 10);
    const manager = new InteractionManager(player);
    const exhibit = createFakeExhibit('a', 0, 0);
    manager.add(exhibit);

    const events: Array<string | null> = [];
    manager.onActiveChange((ex) => events.push(ex?.id ?? null));

    manager.update(0);
    expect(manager.activeExhibit).toBeNull();

    player.position.set(0, 1.6, 2);
    manager.update(0);
    expect(manager.activeExhibit?.id).toBe('a');

    player.position.set(0, 1.6, 10);
    manager.update(0);
    expect(manager.activeExhibit).toBeNull();
    expect(events).toEqual(['a', null]);
  });

  it('複数の展示が範囲内なら最も近いものを選ぶ', () => {
    const player = createFakePlayer(0, 0);
    const manager = new InteractionManager(player);
    manager.add(createFakeExhibit('near', 1, 0));
    manager.add(createFakeExhibit('far', 2.5, 0));

    manager.update(0);
    expect(manager.activeExhibit?.id).toBe('near');
  });

  it('高さの差は近接判定に影響しない(床面距離で判定)', () => {
    const player = createFakePlayer(0, 2.5);
    const manager = new InteractionManager(player);
    const exhibit = createFakeExhibit('a', 0, 0, 2.6);
    manager.add(exhibit);

    manager.update(0);
    expect(manager.activeExhibit?.id).toBe('a');
  });
});
