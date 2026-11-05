import Phaser from "phaser";

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
    const g = this.add.graphics();
    g.fillStyle(0x282d27);
    g.fillRect(0, 0, 960, 600);
    g.fillStyle(0x41463b);
    g.fillRect(18, 106, 924, 470);
    for (let y = 110; y < 575; y += 44) {
      for (let x = 22; x < 945; x += 56) {
        g.lineStyle(1, 0x343a32, 0.55);
        g.strokeRect(x, y, 56, 44);
        g.fillStyle((x / 56 + y / 44) % 2 === 0 ? 0x494d40 : 0x454a3e, 0.36);
        g.fillRect(x + 2, y + 2, 52, 40);
      }
    }
    g.fillStyle(0x20251f);
    g.fillRect(18, 106, 924, 12);
    g.fillRect(18, 564, 924, 12);
    g.fillRect(18, 106, 12, 470);
    g.fillRect(930, 106, 12, 470);
    g.fillStyle(0x5c5746, 0.8);
    g.fillRoundedRect(342, 116, 232, 18, 8);
    g.fillStyle(0x8d7653, 0.35);
    g.fillRoundedRect(360, 136, 196, 5, 3);
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
    g.fillStyle(0x11150f, 0.3);
    g.fillRoundedRect(x + 9, y + 11, w, h, 10);
    g.fillStyle(0xb9a37a);
    g.fillRoundedRect(x, y, w, h, 9);
    g.fillStyle(0x383d32);
    g.fillRoundedRect(x + 6, y + 6, w - 12, h - 12, 6);
    g.fillStyle(color);
    g.fillRoundedRect(x + 4, y + 3, w - 8, 35, 5);
    g.fillRect(x + 4, y + 27, w - 8, 13);
    for (let i = 0; i < 8; i += 1) {
      g.fillStyle(i % 2 === 0 ? color : 0xe0c79b);
      g.fillTriangle(x + 4 + i * (w - 8) / 8, y + 39, x + 4 + (i + 1) * (w - 8) / 8, y + 39, x + 4 + (i + 0.5) * (w - 8) / 8, y + 55);
    }
    g.fillStyle(0x171b17);
    g.fillRoundedRect(x + 18, y + 76, w - 36, 56, 5);
    g.fillStyle(0x9e8056);
    g.fillRoundedRect(x + 28, y + 86, w - 56, 12, 3);
    g.fillStyle(0x6e6249);
    g.fillRoundedRect(x + 24, y + 143, w - 48, 13, 4);
    this.add.text(x + w / 2, y + h - 23, label, {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#e9d6ad",
      fontStyle: "bold",
      letterSpacing: 1,
    }).setOrigin(0.5);
  }

  private drawGate(): void {
    const g = this.add.graphics();
    g.fillStyle(0x171d1a, 0.7);
    g.fillRoundedRect(752, 265, 136, 112, 18);
    g.fillStyle(0x6b614b);
    g.fillRoundedRect(766, 247, 108, 142, 52);
    g.fillStyle(0x272c27);
    g.fillRoundedRect(779, 261, 82, 118, 42);
    g.fillStyle(0x8ba18b, 0.22);
    g.fillRoundedRect(786, 275, 68, 95, 36);
    g.lineStyle(4, 0x9eb39a, 0.85);
    g.strokeCircle(820, 322, 39);
    g.lineStyle(2, 0xe0c58e, 0.65);
    g.strokeCircle(820, 322, 29);
    g.fillStyle(0xb8c5a1, 0.25);
    g.fillCircle(820, 322, 20);
    g.fillStyle(0x9c8055);
    g.fillRoundedRect(759, 377, 122, 9, 4);
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
    const shadow = this.add.ellipse(0, 18, 34, 13, 0x10140f, 0.4);
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

  private createNpc(x: number, y: number, color: number): Phaser.GameObjects.Container {
    const root = this.add.container(x, y);
    const shadow = this.add.ellipse(0, 15, 27, 10, 0x10140f, 0.35);
    const body = this.add.graphics();
    body.fillStyle(color);
    body.fillRoundedRect(-11, -8, 22, 28, 7);
    body.fillStyle(0xd8b28d);
    body.fillCircle(0, -18, 10);
    body.fillStyle(0x3b3028);
    body.fillEllipse(0, -25, 24, 12);
    root.add([shadow, body]);
    return root;
  }
}
