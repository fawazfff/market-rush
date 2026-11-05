import Phaser from "phaser";

type Customer = {
  body: Phaser.GameObjects.Arc;
  targetX: number;
  targetY: number;
  speed: number;
};

export class MarketScene extends Phaser.Scene {
  private customers: Customer[] = [];
  private spawnTimer = 0;

  constructor() {
    super("MarketScene");
  }

  create() {
    this.drawStreet();
    this.drawStalls();
    this.drawDecorations();
    this.add.text(28, 24, "MARKET STREET", {
      fontFamily: "Arial",
      fontSize: "13px",
      color: "#746d60",
      fontStyle: "bold",
      letterSpacing: 2,
    });
    this.add.text(28, 46, "A busy little street", {
      fontFamily: "Georgia",
      fontSize: "26px",
      color: "#292820",
    });
    this.spawnCustomer(365, 300);
    this.spawnCustomer(530, 370);
    this.spawnCustomer(710, 285);
  }

  update(_time: number, delta: number) {
    this.spawnTimer += delta;
    if (this.spawnTimer > 2600 && this.customers.length < 9) {
      this.spawnTimer = 0;
      this.spawnCustomer(
        Phaser.Math.Between(280, 880),
        Phaser.Math.Between(270, 455),
      );
    }

    for (const customer of this.customers) {
      const dx = customer.targetX - customer.body.x;
      const dy = customer.targetY - customer.body.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 4) {
        customer.targetX = Phaser.Math.Between(280, 880);
        customer.targetY = Phaser.Math.Between(270, 455);
      } else {
        customer.body.x += (dx / distance) * customer.speed * (delta / 1000);
        customer.body.y += (dy / distance) * customer.speed * (delta / 1000);
      }
    }
  }

  private drawStreet() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xf0eadc);
    graphics.fillRect(0, 0, 960, 520);
    graphics.fillStyle(0xd9d0bf);
    graphics.fillRect(0, 220, 960, 300);
    graphics.fillStyle(0xc9bda9);
    graphics.fillRect(0, 250, 960, 3);
    graphics.fillStyle(0xc9bda9);
    graphics.fillRect(0, 486, 960, 3);

    for (let x = 18; x < 960; x += 48) {
      graphics.fillStyle(0xd0c5b2, 0.55);
      graphics.fillRect(x, 260, 1, 215);
    }
  }

  private drawStalls() {
    this.drawStall(80, 118, 235, 110, "YOUR FOOD STALL", 0xd77c45, true);
    this.drawStall(390, 132, 205, 96, "GRILL HOUSE", 0x6e8d79, false);
    this.drawStall(670, 132, 205, 96, "NOODLE SPOT", 0xc49a50, false);
  }

  private drawStall(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    player: boolean,
  ) {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000, 0.08);
    graphics.fillRoundedRect(x + 5, y + 7, width, height, 9);
    graphics.fillStyle(0xfffaf0);
    graphics.fillRoundedRect(x, y, width, height, 9);
    graphics.fillStyle(color);
    graphics.fillRoundedRect(x, y, width, 28, 8);
    graphics.fillRect(x, y + 18, width, 10);

    for (let i = 0; i < 5; i++) {
      graphics.fillStyle(i % 2 === 0 ? 0xfff3df : color);
      graphics.fillRect(x + i * (width / 5), y + 28, width / 5, 12);
    }

    graphics.fillStyle(0x8e6043);
    graphics.fillRoundedRect(x + 18, y + height - 35, width - 36, 23, 4);
    graphics.fillStyle(0xfff8e9);
    graphics.fillRoundedRect(x + width / 2 - 30, y + 44, 60, 30, 5);
    graphics.fillStyle(0xe7c9a1);
    graphics.fillRoundedRect(x + width / 2 - 23, y + 50, 46, 18, 3);

    this.add.text(x + width / 2, y - 19, label, {
      fontFamily: "Arial",
      fontSize: player ? "12px" : "11px",
      color: "#5e584d",
      fontStyle: "bold",
      letterSpacing: 1,
    }).setOrigin(0.5);
  }

  private drawDecorations() {
    const graphics = this.add.graphics();
    for (const x of [35, 330, 630, 920]) {
      graphics.fillStyle(0x8b6b4d);
      graphics.fillRect(x, 188, 5, 38);
      graphics.fillStyle(0x78906e);
      graphics.fillCircle(x + 2, 183, 16);
      graphics.fillStyle(0x9eae85);
      graphics.fillCircle(x - 7, 190, 9);
    }

    this.add.text(28, 495, "CUSTOMERS ARE CHOOSING WHERE TO EAT", {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#817867",
      letterSpacing: 1,
    });
  }

  private spawnCustomer(x: number, y: number) {
    const colors = [0x4e7184, 0xc77d55, 0x71866a, 0x8c7292, 0xd0a64f];
    const body = this.add.circle(
      x,
      y,
      10,
      Phaser.Utils.Array.GetRandom(colors),
    );
    body.setStrokeStyle(3, 0xf8f0e2);
    body.setDepth(y);

    this.customers.push({
      body,
      targetX: Phaser.Math.Between(280, 880),
      targetY: Phaser.Math.Between(270, 455),
      speed: Phaser.Math.Between(24, 42),
    });
  }
}
