import Phaser from "phaser";
import { addLoot, damagePlayer, playerDamage, recordKill, resourceById, type ResourceId } from "../economy";

type MoveKeys = Record<string, Phaser.Input.Keyboard.Key>;
type Enemy = {
  root: Phaser.GameObjects.Container;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
  flash: number;
};
type LootDrop = {
  root: Phaser.GameObjects.Container;
  x: number;
  y: number;
  id: ResourceId;
};

export class DungeonScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private keys!: MoveKeys;
  private enemies: Enemy[] = [];
  private drops: LootDrop[] = [];
  private exit = new Phaser.Math.Vector2(480, 86);
  private target: Phaser.Math.Vector2 | null = null;
  private attackCooldown = 0;
  private damageCooldown = 0;
  private exitPrompt!: Phaser.GameObjects.Text;
  private done = false;

  constructor() {
    super("DungeonScene");
  }

  create(): void {
    this.done = false;
    this.enemies = [];
    this.drops = [];
    this.attackCooldown = 0;
    this.damageCooldown = 0;
    this.drawDungeon();
    this.drawExit();
    this.drawPillars();
    this.player = this.createPlayer(480, 474);
    this.spawnEnemy(260, 250);
    this.spawnEnemy(690, 250);
    this.spawnEnemy(480, 350);
    this.spawnEnemy(760, 440);
    this.exitPrompt = this.add.text(480, 155, "THE EXIT IS OPEN · PRESS E TO EXTRACT", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#e9d7af",
      backgroundColor: "#202722",
      padding: { x: 10, y: 7 },
      letterSpacing: 1,
    }).setOrigin(0.5).setDepth(1000);
    this.add.text(34, 28, "THE UNDERROOT RIFT", {
      fontFamily: "Arial",
      fontSize: "13px",
      color: "#d6c49d",
      fontStyle: "bold",
      letterSpacing: 3,
    }).setDepth(1000);
    this.add.text(34, 51, "The deeper you go, the more the bazaar will pay.", {
      fontFamily: "Georgia",
      fontSize: "19px",
      color: "#eee0c5",
    }).setDepth(1000);
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE") as MoveKeys;
    }
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.target = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });
    this.game.events.emit("scene-mode", "dungeon");
    this.game.events.emit("toast", "Find the creatures, strike with SPACE, then walk over their drops. Extract at the glowing gate.");
    this.game.events.emit("state-change");
  }

  update(_time: number, delta: number): void {
    if (this.done || !this.keys || !this.player) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.damageCooldown = Math.max(0, this.damageCooldown - delta);
    this.movePlayer(delta);
    this.updateEnemies(delta);
    this.collectDrops();

    const nearExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exit.x, this.exit.y + 34) < 78;
    this.exitPrompt.setText(nearExit ? "PRESS E TO EXTRACT WITH YOUR LOOT" : "FIND LOOT · SURVIVE · RETURN TO THE GATE");
    if (nearExit && Phaser.Input.Keyboard.JustDown(this.keys["E"])) {
      this.game.events.emit("extract-now", false);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys["SPACE"])) this.attack();
  }

  private movePlayer(delta: number): void {
    let dx = 0;
    let dy = 0;
    if (this.keys["A"].isDown || this.keys["LEFT"].isDown) dx -= 1;
    if (this.keys["D"].isDown || this.keys["RIGHT"].isDown) dx += 1;
    if (this.keys["W"].isDown || this.keys["UP"].isDown) dy -= 1;
    if (this.keys["S"].isDown || this.keys["DOWN"].isDown) dy += 1;
    if (dx !== 0 || dy !== 0) this.target = null;
    if (this.target) {
      dx = this.target.x - this.player.x;
      dy = this.target.y - this.player.y;
      if (Math.hypot(dx, dy) < 8) {
        this.target = null;
        dx = 0;
        dy = 0;
      }
    }
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      const step = 190 * delta / 1000;
      const nextX = Phaser.Math.Clamp(this.player.x + dx / length * step, 42, 918);
      const nextY = Phaser.Math.Clamp(this.player.y + dy / length * step, 190, 550);
      this.player.setPosition(nextX, nextY);
      this.player.setDepth(nextY);
    }
  }

  private updateEnemies(delta: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.flash = Math.max(0, enemy.flash - delta);
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 270 && distance > 27) {
        const step = 56 * delta / 1000;
        enemy.x += dx / distance * step;
        enemy.y += dy / distance * step;
        enemy.root.setPosition(enemy.x, enemy.y);
        enemy.root.setDepth(enemy.y);
      }
      if (distance <= 28 && this.damageCooldown <= 0) {
        const knockedOut = damagePlayer(9);
        this.damageCooldown = 950;
        this.game.events.emit("state-change");
        this.game.events.emit("toast", knockedOut ? "You have been overwhelmed. The bazaar crew is coming for you." : "A creature hit you. Keep moving or use a healing tonic.");
        if (knockedOut) {
          this.done = true;
          this.time.delayedCall(700, () => this.game.events.emit("extract-now", true));
        }
      }
    }
  }

  private attack(): void {
    if (this.attackCooldown > 0) return;
    this.attackCooldown = 420;
    const target = this.enemies
      .filter((enemy) => enemy.alive)
      .map((enemy) => ({ enemy, distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) }))
      .filter((item) => item.distance <= 78)
      .sort((a, b) => a.distance - b.distance)[0];
    const slash = this.add.circle(this.player.x + 18, this.player.y - 8, 30, 0xf2d79d, 0.13).setStrokeStyle(4, 0xe4c48a, 0.85);
    this.tweens.add({ targets: slash, alpha: 0, scale: 1.45, duration: 220, onComplete: () => slash.destroy() });
    if (!target) {
      this.game.events.emit("toast", "Move closer to a creature before striking.");
      return;
    }
    target.enemy.hp -= playerDamage();
    target.enemy.root.setAlpha(0.55);
    this.time.delayedCall(90, () => {
      if (target.enemy.root.active) target.enemy.root.setAlpha(1);
    });
    if (target.enemy.hp <= 0) this.killEnemy(target.enemy);
    this.game.events.emit("state-change");
  }

  private killEnemy(enemy: Enemy): void {
    if (!enemy.alive) return;
    enemy.alive = false;
    recordKill();
    const id = Phaser.Utils.Array.GetRandom(["riftCrystal", "emberOre", "moonleaf", "slimeCore", "firewood"] as ResourceId[]);
    this.createDrop(enemy.x, enemy.y, id);
    this.tweens.add({
      targets: enemy.root,
      alpha: 0,
      scale: 0.3,
      duration: 230,
      onComplete: () => enemy.root.destroy(),
    });
    this.game.events.emit("toast", "Creature defeated. It dropped a resource. Walk over it to collect.");
    this.game.events.emit("state-change");
  }

  private createDrop(x: number, y: number, id: ResourceId): void {
    const root = this.add.container(x, y);
    const glow = this.add.circle(0, 0, 17, 0xd8bd7c, 0.13);
    const gem = this.add.circle(0, 0, id === "riftCrystal" ? 10 : 8, id === "emberOre" ? 0xd9784d : id === "moonleaf" ? 0x9caf7c : id === "firewood" ? 0x9b7650 : id === "riftCrystal" ? 0xb5a0d5 : 0x79a7a0);
    const label = this.add.text(0, 17, resourceById(id).name.toUpperCase(), {
      fontFamily: "Arial",
      fontSize: "8px",
      color: "#e7d7b5",
      fontStyle: "bold",
      letterSpacing: 1,
    }).setOrigin(0.5);
    root.add([glow, gem, label]);
    this.tweens.add({ targets: root, y: y - 5, duration: 650, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.drops.push({ root, x, y, id });
  }

  private collectDrops(): void {
    for (const drop of [...this.drops]) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, drop.x, drop.y) > 30) continue;
      addLoot(drop.id);
      this.drops = this.drops.filter((item) => item !== drop);
      drop.root.destroy();
      this.game.events.emit("toast", "Collected " + resourceById(drop.id).name.toLowerCase() + ".");
      this.game.events.emit("state-change");
    }
  }

  private spawnEnemy(x: number, y: number): void {
    const root = this.add.container(x, y);
    const shadow = this.add.ellipse(0, 14, 34, 12, 0x080b09, 0.5);
    const body = this.add.graphics();
    body.fillStyle(0x648477);
    body.fillEllipse(0, -1, 31, 30);
    body.fillStyle(0x89a58b);
    body.fillEllipse(-3, -9, 18, 12);
    body.fillStyle(0xe6d5b5);
    body.fillCircle(-6, -2, 3);
    body.fillCircle(6, -2, 3);
    body.fillStyle(0x202621);
    body.fillCircle(-6, -2, 1.4);
    body.fillCircle(6, -2, 1.4);
    const marker = this.add.ellipse(0, -23, 22, 5, 0x141a16, 0.55);
    root.add([shadow, body, marker]);
    root.setDepth(y);
    this.enemies.push({ root, x, y, hp: 30, alive: true, flash: 0 });
  }

  private drawDungeon(): void {
    const g = this.add.graphics();
    g.fillStyle(0x171d1b);
    g.fillRect(0, 0, 960, 600);
    g.fillStyle(0x303a34);
    g.fillRoundedRect(22, 150, 916, 426, 12);
    for (let y = 158; y < 570; y += 38) {
      for (let x = 30; x < 930; x += 48) {
        g.fillStyle((x / 48 + y / 38) % 2 === 0 ? 0x39433b : 0x343e38, 0.8);
        g.fillRect(x + 2, y + 2, 44, 34);
        g.lineStyle(1, 0x222b26, 0.45);
        g.strokeRect(x + 2, y + 2, 44, 34);
      }
    }
    g.fillStyle(0x1f2924);
    g.fillRoundedRect(16, 136, 928, 22, 6);
    g.fillRoundedRect(16, 568, 928, 19, 6);
    g.fillRoundedRect(16, 136, 19, 451, 6);
    g.fillRoundedRect(925, 136, 19, 451, 6);
    g.fillStyle(0x6b6a52, 0.5);
    g.fillRoundedRect(418, 153, 124, 12, 6);
    for (const point of [{ x: 90, y: 208 }, { x: 870, y: 208 }, { x: 90, y: 525 }, { x: 870, y: 525 }]) {
      g.fillStyle(0x121916, 0.45);
      g.fillEllipse(point.x, point.y + 15, 54, 20);
      g.fillStyle(0x555b4b);
      g.fillRoundedRect(point.x - 18, point.y - 15, 36, 36, 6);
      g.fillStyle(0x72735b);
      g.fillRoundedRect(point.x - 13, point.y - 18, 26, 7, 3);
    }
    for (const point of [{ x: 120, y: 170 }, { x: 840, y: 170 }, { x: 120, y: 555 }, { x: 840, y: 555 }]) {
      g.fillStyle(0xd9a35d, 0.12);
      g.fillCircle(point.x, point.y, 43);
      g.fillStyle(0xe1b975, 0.8);
      g.fillCircle(point.x, point.y, 7);
      g.fillStyle(0x5e4430);
      g.fillRect(point.x - 3, point.y + 7, 6, 15);
    }
  }

  private drawExit(): void {
    const g = this.add.graphics();
    g.fillStyle(0x111816, 0.85);
    g.fillRoundedRect(406, 54, 148, 92, 40);
    g.fillStyle(0x4d6253);
    g.fillRoundedRect(420, 44, 120, 112, 52);
    g.fillStyle(0x202a25);
    g.fillRoundedRect(432, 57, 96, 92, 44);
    g.lineStyle(5, 0xb9c39c, 0.85);
    g.strokeCircle(480, 102, 42);
    g.lineStyle(2, 0xe5ca90, 0.75);
    g.strokeCircle(480, 102, 31);
    g.fillStyle(0x91a68a, 0.2);
    g.fillCircle(480, 102, 23);
    this.add.text(480, 167, "BAZAAR GATE", {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#d8c99f",
      fontStyle: "bold",
      letterSpacing: 2,
    }).setOrigin(0.5);
  }

  private drawPillars(): void {
    const g = this.add.graphics();
    for (const point of [{ x: 330, y: 360 }, { x: 630, y: 360 }]) {
      g.fillStyle(0x131916, 0.6);
      g.fillEllipse(point.x, point.y + 18, 48, 17);
      g.fillStyle(0x555d4e);
      g.fillRoundedRect(point.x - 18, point.y - 17, 36, 38, 6);
      g.fillStyle(0x77806a);
      g.fillRoundedRect(point.x - 13, point.y - 20, 26, 7, 3);
    }
  }

  private createPlayer(x: number, y: number): Phaser.GameObjects.Container {
    const root = this.add.container(x, y);
    const shadow = this.add.ellipse(0, 18, 34, 13, 0x080b09, 0.5);
    const cape = this.add.graphics();
    cape.fillStyle(0x9a5839);
    cape.fillRoundedRect(-13, -7, 26, 31, 8);
    const body = this.add.graphics();
    body.fillStyle(0x49665b);
    body.fillRoundedRect(-11, -10, 22, 29, 6);
    body.fillStyle(0xc9a16f);
    body.fillRoundedRect(-10, 1, 20, 5, 2);
    const head = this.add.circle(0, -19, 10, 0xd8b28d);
    const hood = this.add.graphics();
    hood.fillStyle(0x303c35);
    hood.fillEllipse(0, -25, 24, 13);
    hood.fillStyle(0x1d251f);
    hood.fillCircle(-4, -20, 1.5);
    hood.fillCircle(4, -20, 1.5);
    const blade = this.add.rectangle(15, -1, 5, 22, 0xc8c5ad).setAngle(26);
    root.add([shadow, cape, body, head, hood, blade]);
    root.setDepth(y);
    return root;
  }
}
