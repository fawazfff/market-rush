import Phaser from "phaser";
import { state, recipeById, type RecipeId } from "../economy";

type Walker = { root: Phaser.GameObjects.Container; x: number; y: number; targetX: number; targetY: number; speed: number; rival: boolean; order: RecipeId };

export class MarketScene extends Phaser.Scene {
  private walkers: Walker[] = [];
  private spawnClock = 0;
  private orderLabel!: Phaser.GameObjects.Text;

  constructor() { super("MarketScene"); }

  create() {
    this.drawWorld();
    this.drawStall(42, 150, 300, 178, "YOUR KITCHEN", 0xd97842, true);
    this.drawStall(390, 176, 220, 150, "GRILL HOUSE", 0x547f70, false);
    this.drawStall(690, 176, 220, 150, "AUNTY B'S AKARA", 0xb58b45, false);
    this.drawDecor();
    this.add.text(36, 22, "THE LUNCH STREET", { fontFamily: "Arial", fontSize: "12px", color: "#776c5b", fontStyle: "bold", letterSpacing: 3 });
    this.add.text(36, 43, "Everybody's hungry.", { fontFamily: "Georgia", fontSize: "29px", color: "#302c25" });
    this.add.text(36, 82, "Keep the queue moving. Keep an eye on the market.", { fontFamily: "Arial", fontSize: "13px", color: "#817765" });
    this.add.text(40, 470, "YOUR QUEUE", { fontFamily: "Arial", fontSize: "10px", color: "#887e6c", fontStyle: "bold", letterSpacing: 2 });
    this.orderLabel = this.add.text(40, 488, "Waiting for the first customer...", { fontFamily: "Arial", fontSize: "12px", color: "#5c5549" });
    this.spawnCustomer(180, 382, false);
    this.spawnCustomer(225, 415, false);
    this.spawnCustomer(485, 375, true);
    this.spawnCustomer(785, 378, true);
    this.events.on("order-served", () => this.orderLabel.setText("Nice service! The next customer is stepping up."));
    this.events.on("customer-left", () => this.orderLabel.setText("A customer got tired of waiting. Keep your queue moving."));
  }

  update(_time: number, delta: number) {
    this.spawnClock += delta;
    if (this.spawnClock > 3600 && this.walkers.length < 12 && state.shiftOpen) {
      this.spawnClock = 0;
      const rival = Math.random() > 0.68;
      this.spawnCustomer(Phaser.Math.Between(400, 900), 420, rival);
    }
    for (const walker of this.walkers) {
      const dx = walker.targetX - walker.x;
      const dy = walker.targetY - walker.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 3) continue;
      walker.x += dx / distance * walker.speed * delta / 1000;
      walker.y += dy / distance * walker.speed * delta / 1000;
      walker.root.setPosition(walker.x, walker.y);
      walker.root.setDepth(walker.y);
    }
  }

  private drawWorld() {
    const g = this.add.graphics();
    g.fillStyle(0xf4ead6); g.fillRect(0, 0, 960, 520);
    g.fillStyle(0xe9ddc5); g.fillRect(0, 128, 960, 392);
    g.fillStyle(0xd7c5a8); g.fillRect(0, 350, 960, 170);
    g.fillStyle(0xf0e5d0); g.fillRect(0, 352, 960, 6);
    for (let x = 0; x < 960; x += 64) {
      g.lineStyle(1, 0xcdbb9e, 0.4); g.lineBetween(x, 360, x - 20, 520);
    }
    g.fillStyle(0xd1b88f); g.fillRoundedRect(0, 122, 960, 9, 4);
    g.fillStyle(0xb7c49a); g.fillCircle(890, 95, 34); g.fillCircle(920, 112, 26);
    g.fillStyle(0x896849); g.fillRect(900, 112, 9, 54);
    g.fillStyle(0xb7c49a); g.fillCircle(18, 106, 35); g.fillCircle(48, 123, 25);
    g.fillStyle(0x896849); g.fillRect(30, 122, 9, 45);
    for (let x = 350; x < 960; x += 145) {
      g.fillStyle(0xf9f2e4, 0.6); g.fillRoundedRect(x, 366, 74, 8, 4);
    }
    g.fillStyle(0xe0b56c); g.fillRoundedRect(620, 28, 240, 70, 12);
    g.fillStyle(0x684d36); g.fillRoundedRect(632, 40, 216, 45, 8);
    this.add.text(740, 51, "FRESH MARKET", { fontFamily: "Arial", fontSize: "13px", color: "#fff0d4", fontStyle: "bold", letterSpacing: 2 }).setOrigin(0.5);
  }

  private drawStall(x: number, y: number, w: number, h: number, name: string, color: number, player: boolean) {
    const g = this.add.graphics();
    g.fillStyle(0x493b2b, 0.12); g.fillRoundedRect(x + 8, y + 12, w, h, 13);
    g.fillStyle(0xfff8eb); g.fillRoundedRect(x, y, w, h, 12);
    g.fillStyle(color); g.fillRoundedRect(x, y, w, 45, 10); g.fillRect(x, y + 30, w, 15);
    for (let i = 0; i < 8; i++) {
      g.fillStyle(i % 2 ? 0xffead1 : color);
      g.fillTriangle(x + i * w / 8, y + 44, x + (i + 1) * w / 8, y + 44, x + (i + .5) * w / 8, y + 64);
    }
    g.fillStyle(0x80563a); g.fillRoundedRect(x + 18, y + h - 49, w - 36, 30, 5);
    g.fillStyle(0xb77c4c); g.fillRoundedRect(x + 26, y + h - 42, w - 52, 15, 4);
    g.fillStyle(0x5e4634); g.fillRect(x + 22, y + 67, 5, h - 120); g.fillRect(x + w - 27, y + 67, 5, h - 120);
    g.fillStyle(0xe4c69a); g.fillRoundedRect(x + w / 2 - 32, y + 70, 64, 48, 7);
    g.fillStyle(0x8a5e3b); g.fillRoundedRect(x + w / 2 - 23, y + 80, 46, 28, 5);
    if (player) {
      g.fillStyle(0x3f4c3e); g.fillRoundedRect(x + 42, y + 73, 38, 44, 7);
      g.fillStyle(0xe5b68c); g.fillCircle(x + 61, y + 65, 13);
      g.fillStyle(0x49362d); g.fillEllipse(x + 61, y + 54, 28, 13);
      g.fillStyle(0xfff3dc); g.fillRoundedRect(x + 47, y + 91, 28, 28, 4);
      g.fillStyle(0x8c4b2d); g.fillCircle(x + w - 62, y + 91, 9);
      g.fillStyle(0xdca85b); g.fillCircle(x + w - 38, y + 91, 9);
    } else {
      g.fillStyle(0xe4c69a); g.fillCircle(x + w / 2, y + 91, 13);
      g.fillStyle(0x594333); g.fillEllipse(x + w / 2, y + 81, 27, 12);
    }
    this.add.text(x + w / 2, y - 18, name, { fontFamily: "Arial", fontSize: player ? "12px" : "11px", color: "#5e5141", fontStyle: "bold", letterSpacing: 1 }).setOrigin(.5);
    if (player) {
      this.add.text(x + 20, y + h - 23, "HOT • READY", { fontFamily: "Arial", fontSize: "9px", color: "#fff4df", fontStyle: "bold", letterSpacing: 1 });
    }
  }

  private drawDecor() {
    const g = this.add.graphics();
    for (const x of [350, 650]) {
      g.fillStyle(0x8c6949); g.fillRoundedRect(x, 315, 38, 35, 4);
      g.fillStyle(0x86a16f); g.fillCircle(x + 8, 309, 17); g.fillCircle(x + 27, 300, 18);
    }
    this.add.text(34, 135, "ORDER UP", { fontFamily: "Arial", fontSize: "9px", color: "#fff0db", fontStyle: "bold", letterSpacing: 2 });
  }

  private spawnCustomer(x: number, y: number, rival: boolean) {
    const root = this.add.container(x, y);
    const colors = [0x4f7181, 0xc87951, 0x718567, 0x8d7390, 0xd1a34d, 0x9c6655];
    const shirt = Phaser.Utils.Array.GetRandom(colors);
    const shadow = this.add.ellipse(0, 17, 28, 10, 0x55432f, .16);
    const legs = this.add.graphics(); legs.fillStyle(0x514538); legs.fillRoundedRect(-8, 8, 6, 14, 3); legs.fillRoundedRect(3, 8, 6, 14, 3);
    const body = this.add.graphics(); body.fillStyle(shirt); body.fillRoundedRect(-11, -7, 22, 25, 7); body.fillStyle(0xe3b58d); body.fillCircle(0, -17, 10); body.fillStyle(0x4c382d); body.fillEllipse(0, -25, 21, 9);
    const face = this.add.text(0, -17, "•", { fontSize: "12px", color: "#49362c" }).setOrigin(.5);
    root.add([shadow, legs, body, face]);
    const order = Phaser.Utils.Array.GetRandom(["jollof", "suya", "akara"] as RecipeId[]);
    const bubble = this.add.text(0, -48, rival ? "♥" : recipeById(order).icon, { fontSize: "17px", backgroundColor: "#fff8e9", padding: { x: 6, y: 3 }, color: "#4b4032" }).setOrigin(.5);
    root.add(bubble);
    if (!rival) {
      root.setInteractive(new Phaser.Geom.Rectangle(-16, -36, 32, 60), Phaser.Geom.Rectangle.Contains);
      root.on("pointerdown", () => this.events.emit("customer-selected", { order, label: recipeById(order).name }));
    }
    this.walkers.push({ root, x, y, targetX: rival ? Phaser.Math.Between(470, 800) : Phaser.Math.Between(100, 330), targetY: rival ? 340 : Phaser.Math.Between(365, 440), speed: Phaser.Math.Between(12, 22), rival, order });
    root.setDepth(y);
  }
}
