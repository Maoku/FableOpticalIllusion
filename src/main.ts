import { App } from './core/App';
import { PlayerController } from './core/PlayerController';
import { InteractionManager } from './core/InteractionManager';
import { Building } from './museum/Building';
import { createMuseumLayout } from './museum/layout';
import { Hud } from './ui/Hud';
import { HintPanel } from './ui/HintPanel';
import { TouchControls, isTouchDevice } from './ui/TouchControls';
import { exhibitViewSpots } from './exhibits/Exhibit';

const appContainer = document.getElementById('app')!;
const uiRoot = document.getElementById('ui-root')!;

const app = new App(appContainer);
const layout = createMuseumLayout();

const building = new Building(layout.building);
app.scene.add(building.group);
for (const extra of layout.extras) app.scene.add(extra);

const player = new PlayerController(app.camera, app.renderer.domElement);
player.colliders.push(...building.colliders);
for (const exhibit of layout.exhibits) player.colliders.push(...(exhibit.colliders ?? []));
player.position.copy(layout.spawn);
app.addUpdatable(player);

const interaction = new InteractionManager(player);
for (const exhibit of layout.exhibits) {
  app.scene.add(exhibit.root);
  interaction.add(exhibit);
  if (exhibit.preRender) app.addPreRender(exhibit.preRender.bind(exhibit));
}
app.addUpdatable(interaction);

const touch = isTouchDevice();
document.body.classList.toggle('touch-mode', touch);

const hintPanel = new HintPanel(uiRoot, touch);

// スマホではポインターロックの代わりにバーチャルパッドで操作する
const touchControls = touch
  ? new TouchControls(uiRoot, player, {
      onOperate: () => interaction.operate(),
      onViewSpot: () => interaction.snapToViewSpot(),
      onHint: () => hintPanel.toggle(),
      onAdjust: (deltaY) => interaction.adjust(deltaY),
    })
  : null;

const hud = new Hud(
  uiRoot,
  () => {
    if (touchControls) {
      touchControls.setEnabled(true);
      hud.setLocked(true);
    } else {
      player.lock();
    }
  },
  touch,
);
player.onLockChange((locked) => hud.setLocked(locked));

interaction.onActiveChange((exhibit) => {
  hintPanel.setExhibit(exhibit);
  touchControls?.setExhibitState({
    operable: !!exhibit?.onOperate,
    hasViewSpot: !!exhibit && exhibitViewSpots(exhibit).length > 0,
    adjustable: !!exhibit?.onWheel,
  });
});

app.start();

// 開発時のみ: コンソールからの動作確認用フック
if (import.meta.env.DEV) {
  Object.assign(window, { __museum: { app, player, interaction } });
}
