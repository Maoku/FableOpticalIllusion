import { App } from './core/App';
import { PlayerController } from './core/PlayerController';
import { Building, createTemporaryRoom } from './museum/Building';
import { Hud } from './ui/Hud';

const appContainer = document.getElementById('app')!;
const uiRoot = document.getElementById('ui-root')!;

const app = new App(appContainer);

const building = new Building(createTemporaryRoom());
app.scene.add(building.group);

const player = new PlayerController(app.camera, app.renderer.domElement);
player.colliders.push(...building.colliders);
player.position.set(0, 1.6, 8);
app.addUpdatable(player);

const hud = new Hud(uiRoot, () => player.lock());
player.onLockChange((locked) => hud.setLocked(locked));

app.start();
