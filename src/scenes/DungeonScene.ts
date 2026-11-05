import Phaser from "phaser";
import { drawPixelPillar, drawStoneFloor, pixelShadow, pixelSprite } from "./pixel";
import { addLoot, damagePlayer, playerDamage, recordKill, resourceById, type ResourceId } from "../economy";

type MoveKeys = Record<string, Phaser.Input.Keyboard.Key>;
type Enemy = {
  root: Phaser.GameObjects.Container;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  hpFill: Phaser.GameObjects.Rectangle;
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
  private dodgeCooldown = 0;
  private invulnerable = 0;
  private exitPrompt!: Phaser.GameObjects.Text;
  private exitLight!: Phaser.GameObjects.Arc;
  private objectiveText!: Phaser.GameObjects.Text;
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
    this.dodgeCooldown = 0;
    this.invulnerable = 0;
    this.drawDungeon();
    this.drawExit();
    this.drawPillars();
    this.player = this.createPlayer(480, 474);
    this.spawnEnemy(260, 250);
    this.spawnEnemy(690, 250);
    this.spawnEnemy(480, 350);
    this.spawnEnemy(760, 440, 72, 0x9a6c79);
    this.exitPrompt = this.add.text(480, 155, "GATE SEALED · DEFEAT EVERY CREATURE", {
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
    this.add.text(34, 51, "Clear the rift. Collect what the creatures leave behind.", {
      fontFamily: "Georgia",
      fontSize: "19px",
      color: "#eee0c5",
    }).setDepth(1000);
    this.objectiveText = this.add.text(34, 82, "RIFT CREATURES  0 / 4", { fontFamily: "Arial", fontSize: "10px", color: "#c6b58e", fontStyle: "bold", letterSpacing: 1 }).setDepth(1000);
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,SHIFT") as MoveKeys;
    }
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.target = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });
    const touchAttack = () => this.attack();
    const touchInteract = () => {
      const nearExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exit.x, this.exit.y + 34) < 78;
      if (nearExit && this.remainingEnemies() === 0) this.game.events.emit("extract-now", false);
      else this.game.events.emit("toast", this.remainingEnemies() > 0 ? "The gate is sealed. Defeat every creature first." : "Move close to the glowing gate to extract.");
    };
    this.game.events.on("touch-attack", touchAttack);
    this.game.events.on("touch-interact", touchInteract);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("touch-attack", touchAttack);
      this.game.events.off("touch-interact", touchInteract);
    });
    this.game.events.emit("scene-mode", "dungeon");
    this.game.events.emit("toast", "WASD to move · SPACE to strike · SHIFT to dodge. Clear the room to unlock extraction.");
    this.game.events.emit("state-change");
  }

  update(_time: number, delta: number): void {
    if (this.done || !this.keys || !this.player) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.damageCooldown = Math.max(0, this.damageCooldown - delta);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);
    this.invulnerable = Math.max(0, this.invulnerable - delta);
    if (Phaser.Input.Keyboard.JustDown(this.keys["SHIFT"])) this.dodge();
    this.movePlayer(delta);
    this.updateEnemies(delta);
    this.collectDrops();

    const nearExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exit.x, this.exit.y + 34) < 78;
    const remaining = this.remainingEnemies();
    this.objectiveText.setText("RIFT CREATURES  " + (this.enemies.length - remaining) + " / " + this.enemies.length + " DEFEATED");
    this.exitPrompt.setText(remaining > 0 ? "GATE SEALED · " + remaining + " CREATURE" + (remaining === 1 ? "" : "S") + " REMAIN" : nearExit ? "PRESS E TO EXTRACT WITH YOUR LOOT" : "GATE OPEN · RETURN HERE TO EXTRACT");
    if (nearExit && remaining === 0 && Phaser.Input.Keyboard.JustDown(this.keys["E"])) {
      this.game.events.emit("extract-now", false);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys["SPACE"])) this.attack();
  }

  private remainingEnemies(): number {
    return this.enemies.filter((enemy) => enemy.alive).length;
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
      this.player.setRotation(Phaser.Math.Angle.Between(0, 0, dx, dy) * 0.08);
    }
  }

  private dodge(): void {
    if (this.dodgeCooldown > 0) return;
    const pointer = this.target;
    let dx = 0;
    let dy = 0;
    if (this.keys["A"].isDown || this.keys["LEFT"].isDown) dx -= 1;
    if (this.keys["D"].isDown || this.keys["RIGHT"].isDown) dx += 1;
    if (this.keys["W"].isDown || this.keys["UP"].isDown) dy -= 1;
    if (this.keys["S"].isDown || this.keys["DOWN"].isDown) dy += 1;
    if (dx === 0 && dy === 0 && pointer) { dx = this.player.x - pointer.x; dy = this.player.y - pointer.y; }
    if (dx === 0 && dy === 0) dy = 1;
    const length = Math.hypot(dx, dy) || 1;
    this.player.x = Phaser.Math.Clamp(this.player.x + dx / length * 92, 42, 918);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy / length * 92, 190, 550);
    this.player.setDepth(this.player.y);
    this.dodgeCooldown = 1250;
    this.invulnerable = 340;
    this.player.setAlpha(0.42);
    this.tweens.add({ targets: this.player, alpha: 1, duration: 340 });
    const streak = this.add.ellipse(this.player.x, this.player.y + 12, 38, 15, 0xd7d5b8, 0.18).setDepth(this.player.depth - 1);
    this.tweens.add({ targets: streak, alpha: 0, scaleX: 1.8, duration: 260, onComplete: () => streak.destroy() });
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
      if (distance <= 28 && this.damageCooldown <= 0 && this.invulnerable <= 0) {
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
    const slash = this.add.graphics();
    slash.fillStyle(0xf2d79d, 0.9);
    slash.fillRect(-2, -20, 4, 40);
    slash.fillRect(2, -16, 4, 32);
    slash.fillStyle(0xe4c48a, 0.8);
    slash.fillRect(6, -10, 4, 20);
    slash.setPosition(this.player.x + 22, this.player.y - 7);
    slash.setRotation(0.55);
    this.tweens.add({ targets: slash, alpha: 0, scaleX: 1.4, duration: 180, onComplete: () => slash.destroy() });
    if (!target) {
      this.game.events.emit("toast", "Move closer to a creature before striking.");
      return;
    }
    target.enemy.hp = Math.max(0, target.enemy.hp - playerDamage());
    const knockX = target.enemy.x + (target.enemy.x - this.player.x) / Math.max(1, Phaser.Math.Distance.Between(this.player.x, this.player.y, target.enemy.x, target.enemy.y)) * 13;
    const knockY = target.enemy.y + (target.enemy.y - this.player.y) / Math.max(1, Phaser.Math.Distance.Between(this.player.x, this.player.y, target.enemy.x, target.enemy.y)) * 13;
    target.enemy.x = Phaser.Math.Clamp(knockX, 42, 918);
    target.enemy.y = Phaser.Math.Clamp(knockY, 190, 550);
    target.enemy.root.setPosition(target.enemy.x, target.enemy.y);
    target.enemy.hpFill.setSize(34 * (target.enemy.hp / target.enemy.maxHp), 3);
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
    this.game.events.emit("toast", this.remainingEnemies() === 0 ? "The last creature fell. The extraction gate is now open." : "Creature defeated. It dropped a resource. Walk over it to collect.");
    if (this.remainingEnemies() === 0) {
      this.exitLight.setFillStyle(0xc4d6a0, 0.42);
      this.tweens.add({ targets: this.exitLight, alpha: 0.9, duration: 450, yoyo: true, repeat: 2 });
    }
    this.game.events.emit("state-change");
  }

  private createDrop(x: number, y: number, id: ResourceId): void {
    const root = this.add.container(x, y);
    const shadow = this.add.rectangle(0, 8, 24, 5, 0x121713, 0.65);
    const color = id === "riftCrystal" ? 0xb6a4d8 : id === "emberOre" ? 0xd9784d : id === "moonleaf" ? 0x9caf7c : id === "firewood" ? 0x9b7650 : 0x79a7a0;
    const sprite = pixelSprite(this, [
      "....DDDD....",
      "...DCCCCD...",
      "..DCCCCCCD..",
      ".DCCCCCCCCD.",
      ".DCCCCCCCCD.",
      "..DCCCCCCD..",
      "...DCCCCD...",
      "....DDDD....",
    ], { D: 0x202820, C: color }, 2);
    sprite.setPosition(0, -4);
    const shine = this.add.rectangle(-3, -10, 3, 5, 0xf0e4c4, 0.8);
    const label = this.add.text(0, 15, resourceById(id).name.toUpperCase(), {
      fontFamily: "Arial", fontSize: "8px", color: "#e7d7b5",
      fontStyle: "bold", letterSpacing: 1,
      backgroundColor: "#202820", padding: { x: 3, y: 2 },
    }).setOrigin(0.5);
    root.add([shadow, sprite, shine, label]);
    this.tweens.add({ targets: root, y: y - 4, duration: 650, yoyo: true, repeat: -1, ease: "Sine.inOut" });
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

  private spawnEnemy(x: number, y: number, health = 30, color = 0x648477): void {
    const root = this.add.container(x, y);
    const shadow = pixelShadow(this, 15);
    const guardian = health > 30;
    const rows = guardian
      ? [".....DDDDDD.....","....DMMMMMMD....","...DMMMMMMMMMD..","..DMMDDDDDDMMD..",".DMMDDSSSSDDMMD.","DMMDDSSKSSKDDMMD","DMMDDSSSSSSDDMMD","DMMMMMMMMMMMMMMD",".DMMMMMMMMMMMMD.","..DMMDDDDDDMMD..","...DD......DD...","..DDD......DDD.."]
      : ["......GGGG......","....GGGGGGGG....","...GGGGGGGGGG...","..GGGGGGGGGGGG..",".GGGGGGGGGGGGGG.","GGGGGGGGGGGGGGGG","GGGGGGGGGGGGGGGG","GGGGGGGGGGGGGGGG",".GGGGGGGGGGGGGG.","..GGGGGGGGGGGG..","...GG......GG...","..DDD......DDD.."];
    const body = pixelSprite(this, rows, {
      G: color, D: 0x202820, M: 0x9a9b7b, S: 0xe6d5b5, K: 0x202621,
    }, 2);
    body.setPosition(0, -9);
    const marker = this.add.rectangle(0, -31, 20, 2, 0x141a16, 0.7);
    const hpBack = this.add.rectangle(0, -38, 38, 5, 0x151b17).setOrigin(0.5);
    const hpFill = this.add.rectangle(-17, -38, 34, 3, 0xb3bd91).setOrigin(0, 0.5);
    root.add([shadow, body, marker, hpBack, hpFill]);
    root.setDepth(y);
    this.enemies.push({ root, x, y, hp: health, maxHp: health, hpFill, alive: true, flash: 0 });
  }

  private drawDungeon(): void {
    drawStoneFloor(this, 176, 576);
    const trim = this.add.graphics();
    trim.fillStyle(0x121915);
    trim.fillRect(384, 144, 192, 32);
    trim.fillStyle(0x66634d);
    trim.fillRect(400, 144, 160, 8);
    trim.fillRect(400, 168, 160, 8);
    trim.fillStyle(0x8d805f);
    trim.fillRect(416, 152, 128, 4);
    for (const point of [{ x: 92, y: 220 }, { x: 868, y: 220 }, { x: 92, y: 530 }, { x: 868, y: 530 }]) {
      drawPixelPillar(this, point.x, point.y);
    }
    for (const point of [{ x: 120, y: 188 }, { x: 840, y: 188 }, { x: 120, y: 550 }, { x: 840, y: 550 }]) {
      const torch = this.add.graphics();
      torch.fillStyle(0x4a3425);
      torch.fillRect(point.x - 3, point.y + 4, 6, 18);
      torch.fillStyle(0xc98b4e);
      torch.fillRect(point.x - 4, point.y - 4, 8, 8);
      torch.fillStyle(0xf1cb7c);
      torch.fillRect(point.x - 2, point.y - 7, 4, 5);
      torch.setDepth(point.y);
    }
  }

  private drawExit(): void {
    const g = this.add.graphics();
    g.fillStyle(0x111713);
    g.fillRect(408, 48, 144, 104);
    g.fillStyle(0x64634e);
    g.fillRect(416, 44, 128, 12);
    g.fillRect(416, 144, 128, 12);
    g.fillRect(408, 52, 12, 96);
    g.fillRect(540, 52, 12, 96);
    g.fillStyle(0x292f29);
    g.fillRect(428, 60, 104, 84);
    g.fillStyle(0x657c67);
    g.fillRect(440, 68, 80, 68);
    g.fillStyle(0x17221d);
    g.fillRect(448, 72, 64, 60);
    g.fillStyle(0x9aab82, 0.6);
    g.fillRect(464, 84, 32, 36);
    g.fillStyle(0xd8c58c, 0.8);
    g.fillRect(476, 76, 8, 8);
    this.exitLight = this.add.rectangle(480, 102, 22, 38, 0x87917d, 0.22).setDepth(3) as unknown as Phaser.GameObjects.Arc;
    this.add.text(480, 167, "BAZAAR GATE", {
      fontFamily: "Arial", fontSize: "9px", color: "#d8c99f",
      fontStyle: "bold", letterSpacing: 2,
    }).setOrigin(0.5);
  }

  private drawPillars(): void {
    drawPixelPillar(this, 330, 360);
    drawPixelPillar(this, 630, 360);
  }

  private createPlayer(x: number, y: number): Phaser.GameObjects.Container {
    const root = this.add.container(x, y);
    const shadow = pixelShadow(this, 16);
    const hero = pixelSprite(this, [
      "......DDDD......",
      ".....DHHHHD.....",
      "....DHHHHHHD....",
      "....SSSSSSSS....",
      "....SSSKSSKSS...",
      ".....SSSSSS.....",
      "....CCCCCCCC....",
      "...CCCCGGCCCC...",
      "...CCCBGGBCCC...",
      "...CCCBGGBCCC...",
      "....CCBBBBCC....",
      "....BBBDDBBB....",
      "....DDD..DDD....",
      "...DDD....DDD...",
      "...DD......DD...",
      "..MMM......MMM..",
      "..M..........M..",
    ], { D: 0x263229, H: 0x302a24, S: 0xd6ad83, K: 0x20231d, C: 0x9b543b, B: 0x4d6b5b, G: 0xd4b36d, M: 0xaaa995 }, 2);
    hero.setPosition(0, -12);
    root.add([shadow, hero]);
    root.setDepth(y);
    return root;
  }
}}
}
