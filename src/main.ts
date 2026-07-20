import { App } from './core/App';
import { PlayerController } from './core/PlayerController';
import { InteractionManager } from './core/InteractionManager';
import { Building } from './museum/Building';
import { createMuseumLayout } from './museum/layout';
import { Hud } from './ui/Hud';
import { HintPanel } from './ui/HintPanel';

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
player.position.set(0, 1.6, 8);
app.addUpdatable(player);

const interaction = new InteractionManager(player);
for (const exhibit of layout.exhibits) {
  app.scene.add(exhibit.root);
  interaction.add(exhibit);
}
app.addUpdatable(interaction);

const hud = new Hud(uiRoot, () => player.lock());
player.onLockChange((locked) => hud.setLocked(locked));

const hintPanel = new HintPanel(uiRoot);
interaction.onActiveChange((exhibit) => hintPanel.setExhibit(exhibit));

app.start();

// 開発時のみ: コンソールからの動作確認用フック
if (import.meta.env.DEV) {
  Object.assign(window, { __museum: { app, player, interaction } });
}
