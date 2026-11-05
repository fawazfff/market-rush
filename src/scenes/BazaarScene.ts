import Phaser from "phaser";
import { drawStoneFloor, pixelShadow, pixelSprite } from "./pixel";

type MoveKeys = Record<string, Phaser.Input.Keyboard.Key>;

export class BazaarScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private keys!: MoveKeys;
  private prompt!: Phaser.GameObjects.Text;
  private target: Phaser.Math.Vector2 | null = null;
  private gate = new Phaser.Math.Vector2(820, 300);
  private broker = new Phaser.Math.Vector2(460, 265);

  constructor() {
    super("BazaarScene");
  }

  create(): void {
    this.drawFloor();
    this.drawStalls();
    this.drawGate();
    this.drawDecor();
    this.player = this.createPlayer(450, 455);
    this.prompt = this.add.text(480, 525, "WASD / ARROWS TO MOVE  ·  E AT THE GATE TO ENTER", {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#f0d9a9",
      backgroundColor: "#252a24",
      padding: { x: 12, y: 8 },
      letterSpacing: 1,
    }).setOrigin(0.5).setDepth(1000);

    this.add.text(36, 30, "THE LANTERN BAZAAR", {
      fontFamily: "Arial",
      fontSize: "13px",
      color: "#d9c59c",
      fontStyle: "bold",
      letterSpacing: 3,
    }).setDepth(1000);
    this.add.text(36, 52, "A safe place to trade, repair and prepare.", {
      fontFamily: "Georgia",
      fontSize: "20px",
      color: "#f3e4c5",
    }).setDepth(1000);
    this.add.text(458, 218, "MARA · BROKER", {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#f5ddb2",
      fontStyle: "bold",
      letterSpacing: 1,
    }).setOrigin(0.5).setDepth(1000);
    this.add.text(820, 220, "THE UNDERROOT RIFT", {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#edcf9a",
      fontStyle: "bold",
      letterSpacing: 1,
    }).setOrigin(0.5).setDepth(1000);

    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,E") as MoveKeys;
    }
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.target = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });
    const touchInteract = () => {
      const nearGate = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.gate.x, this.gate.y + 50) < 92;
      if (nearGate) this.game.events.emit("enter-dungeon");
      else this.game.events.emit("toast", "Move close to the glowing rift gate to enter.");
    };
    this.game.events.on("touch-interact", touchInteract);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off("touch-interact", touchInteract));
    this.game.events.emit("scene-mode", "bazaar");
    this.game.events.emit("toast", "Welcome to the Lantern Bazaar. Your next expedition starts at the rift gate.");
  }

  update(_time: number, delta: number): void {
    if (!this.keys || !this.player) return;
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
      if (Math.hypot(dx, dy) < 7) {
        this.target = null;
        dx = 0;
        dy = 0;
      }
    }
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      const step = 205 * delta / 1000;
      this.player.x = Phaser.Math.Clamp(this.player.x + dx / length * step, 35, 925);
      this.player.y = Phaser.Math.Clamp(this.player.y + dy / length * step, 120, 535);
      this.player.setDepth(this.player.y);
    }

    const nearGate = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.gate.x, this.gate.y + 50) < 92;
    const nearBroker = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.broker.x, this.broker.y + 34) < 86;
    this.prompt.setText(nearGate ? "PRESS E TO ENTER THE RIFT" : nearBroker ? "MARA HAS TODAY'S MARKET PRICES IN THE SIDEBAR" : "WASD / ARROWS TO MOVE  ·  CLICK TO WALK  ·  E AT THE GATE");
    if (nearGate && Phaser.Input.Keyboard.JustDown(this.keys["E"])) {
      this.game.events.emit("enter-dungeon");
    }
  }

  private drawFloor(): void {
    drawStoneFloor(this, 106, 576);
    const path = this.add.graphics();
    path.fillStyle(0x625a43);
    path.fillRect(360, 350, 240, 208);
    path.fillStyle(0x786b4d, 0.55);
    for (let y = 360; y < 550; y += 32) {
      for (let x = 368; x < 592; x += 32) {
        path.fillRect(x + 2, y + 2, 28, 28);
        path.fillStyle(0x292f28, 0.55);
        path.fillRect(x + 2, y + 29, 28, 2);
        path.fillStyle(0x786b4d, 0.55);
      }
    }
    path.fillStyle(0x20271f);
    path.fillRect(18, 106, 924, 8);
  }

  private drawStalls(): void {
    this.drawStall(70, 155, 220, 176, "THE ARMOURER", 0x8e6947);
    this.drawStall(348, 164, 220, 160, "MARA'S EXCHANGE", 0x8e7651);
    this.drawStall(630, 155, 220, 176, "THE APOTHECARY", 0x587568);

    const npc = this.createNpc(460, 278, 0x9c7454);
    npc.setDepth(280);
    const armourer = this.createNpc(180, 286, 0x5a7081);
    armourer.setDepth(288);
    const healer = this.createNpc(740, 286, 0x77836b);
    healer.setDepth(288);
  }

  private drawStall(x: number, y: number, w: number, h: number, label: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x151b16);
    g.fillRect(x + 7, y + 9, w, h);
    g.fillStyle(0x6c624b);
    g.fillRect(x, y, w, h);
    g.fillStyle(0x343c31);
    g.fillRect(x + 5, y + 5, w - 10, h - 10);
    g.fillStyle(color);
    g.fillRect(x + 5, y + 5, w - 10, 36);
    g.fillStyle(0x222a23);
    g.fillRect(x + 5, y + 34, w - 10, 10);
    for (let i = 0; i < w; i += 24) {
      g.fillStyle(i % 48 === 0 ? color : 0xd8bd8a);
      g.fillRect(x + 5 + i, y + 43, 12, 11);
      g.fillStyle(0x272d25);
      g.fillRect(x + 17 + i, y + 43, 12, 11);
    }
    g.fillStyle(0x171d18);
    g.fillRect(x + 18, y + 74, w - 36, 58);
    g.fillStyle(0x95774e);
    g.fillRect(x + 27, y + 84, w - 54, 8);
    g.fillStyle(0x5b513c);
    g.fillRect(x + 22, y + 136, w - 44, 14);
    this.add.text(x + w / 2, y + h - 20, label, {
      fontFamily: "Arial", fontSize: "10px", color: "#e9d6ad",
      fontStyle: "bold", letterSpacing: 1,
    }).setOrigin(0.5);
  }

  private drawGate(): void {
    const g = this.add.graphics();
    g.fillStyle(0x151b16);
    g.fillRect(752, 265, 136, 112);
    g.fillStyle(0x65614b);
    g.fillRect(760, 249, 120, 12);
    g.fillRect(760, 377, 120, 12);
    g.fillRect(752, 261, 12, 124);
    g.fillRect(876, 261, 12, 124);
    g.fillStyle(0x343e34);
    g.fillRect(772, 265, 96, 108);
    g.fillStyle(0x18231d);
    g.fillRect(784, 277, 72, 84);
    g.fillStyle(0x81977e, 0.55);
    g.fillRect(796, 289, 48, 60);
    g.fillStyle(0xbed0a3, 0.45);
    g.fillRect(812, 301, 16, 36);
    g.fillStyle(0xe0c58e);
    g.fillRect(816, 285, 8, 8);
  }

  private drawDecor(): void {
    const g = this.add.graphics();
    for (const point of [{ x: 64, y: 390 }, { x: 904, y: 475 }, { x: 340, y: 490 }]) {
      g.fillStyle(0x171d19, 0.4);
      g.fillEllipse(point.x, point.y + 12, 46, 18);
      g.fillStyle(0x6d684f);
      g.fillRoundedRect(point.x - 14, point.y - 13, 28, 27, 5);
      g.fillStyle(0xb38f5a);
      g.fillRoundedRect(point.x - 11, point.y - 18, 22, 8, 3);
    }
    for (const x of [54, 906]) {
      g.fillStyle(0x9c7348);
      g.fillRoundedRect(x - 5, 130, 10, 56, 4);
      g.fillStyle(0xe1b975, 0.8);
      g.fillCircle(x, 128, 10);
      g.fillStyle(0xe1b975, 0.12);
      g.fillCircle(x, 128, 25);
    }
  }

  private createPlayer(x: number, y: number): Phaser.GameObjects.Container {
    const root = this.add.container(x, y);
    const shadow = pixelShadow(this, 16);
    const hero = pixelSprite(this, [
      "......DDDD......",".....DHHHHD.....","....DHHHHHHD....",
      "....SSSSSSSS....","....SSSKSSKSS...",".....SSSSSS.....",
      "....CCCCCCCC....","...CCCCGGCCCC...","...CCCBGGBCCC...",
      "...CCCBGGBCCC...","....CCBBBBCC....","....BBBDDBBB....",
      "....DDD..DDD....","...DDD....DDD...","...DD......DD...",
      "..MMM......MMM..","..M..........M..",
    ], { D: 0x263229, H: 0x302a24, S: 0xd6ad83, K: 0x20231d, C: 0x9b543b, B: 0x4d6b5b, G: 0xd4b36d, M: 0xaaa995 }, 2);
    hero.setPosition(0, -12);
    root.add([shadow, hero]);
    root.setDepth(y);
    return root;
  }

  private createNpc(x: number, y: number, color: number): Phaser.GameObjects.Container {
    const root = this.add.container(x, y);
    const shadow = pixelShadow(this, 14);
    const coat = color === 0x9c7454 ? 0x8b5c40 : color === 0x5a7081 ? 0x506b80 : 0x74835d;
    const npc = pixelSprite(this, [
      ".....DDDD.....","....DHHHHD....","...DHHHHHHD...",
      "...SSSSSSSS...","...SSSKSSKSS...","....SSSSSS....",
      "...CCCCCCCC...","..CCCCGGCCCC..","..CCCGGGGCCC..",
      "..CCCGGGGCCC..","...CCBBBBCC...","...BBB..BBB...",
      "...DDD..DDD...","..DDD....DDD..",
    ], { D: 0x252b25, H: 0x49392d, S: 0xd3a981, K: 0x1c211d, C: coat, B: 0x3d493b, G: 0xd1b77d }, 2);
    npc.setPosition(0, -10);
    root.add([shadow, npc]);
    return root;
  }
}}
}
