export type ResourceId = "emberOre" | "moonleaf" | "slimeCore";

export type Resource = {
  id: ResourceId;
  name: string;
  icon: string;
  description: string;
  basePrice: number;
};

export const RESOURCES: Resource[] = [
  { id: "emberOre", name: "Ember ore", icon: "◆", description: "Warm metal mined near the rift.", basePrice: 16 },
  { id: "moonleaf", name: "Moonleaf", icon: "✦", description: "A rare herb used by travelling healers.", basePrice: 11 },
  { id: "slimeCore", name: "Slime core", icon: "●", description: "A useful alchemy ingredient.", basePrice: 13 },
];

export type ResourceCounts = Record<ResourceId, number>;

export const state = {
  coins: 100,
  health: 100,
  maxHealth: 100,
  potions: 1,
  weaponTier: 0,
  bag: { emberOre: 0, moonleaf: 0, slimeCore: 0 } as ResourceCounts,
  market: {
    day: 1,
    supply: { emberOre: 5, moonleaf: 9, slimeCore: 4 } as ResourceCounts,
    demand: { emberOre: 9, moonleaf: 4, slimeCore: 7 } as ResourceCounts,
    message: "The first caravan is late. Ember ore is already drawing attention.",
  },
  run: {
    kills: 0,
    found: 0,
    totalRuns: 0,
    bestRun: 0,
    lastSummary: "Your first expedition is waiting.",
  },
  totals: {
    coinsEarned: 0,
    itemsSold: 0,
  },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function resourceById(id: ResourceId): Resource {
  return RESOURCES.find((item) => item.id === id)!;
}

export function marketPrice(id: ResourceId): number {
  const item = resourceById(id);
  const supply = state.market.supply[id];
  const demand = state.market.demand[id];
  const pressure = clamp((demand - supply) * 0.055, -0.28, 0.62);
  return Math.max(2, Math.round(item.basePrice * (1 + pressure)));
}

export function marketReason(id: ResourceId): string {
  const supply = state.market.supply[id];
  const demand = state.market.demand[id];
  if (demand - supply >= 4) return "Buyers outnumber stock";
  if (supply - demand >= 4) return "Plenty on the shelves";
  return "Trading at a steady pace";
}

export function beginExpedition(): void {
  state.run.kills = 0;
  state.run.found = 0;
  if (state.health <= 0) state.health = 35;
}

export function addLoot(id: ResourceId): void {
  state.bag[id] += 1;
  state.run.found += 1;
}

export function recordKill(): void {
  state.run.kills += 1;
}

export function damagePlayer(amount: number): boolean {
  state.health = clamp(state.health - amount, 0, state.maxHealth);
  return state.health <= 0;
}

export function healPlayer(amount: number): void {
  state.health = clamp(state.health + amount, 0, state.maxHealth);
}

export function playerDamage(): number {
  return 15 + state.weaponTier * 7;
}

export function finishExpedition(knockedOut = false): string {
  state.run.totalRuns += 1;
  state.run.bestRun = Math.max(state.run.bestRun, state.run.kills);
  if (knockedOut) {
    const carried = RESOURCES.find((item) => state.bag[item.id] > 0);
    if (carried) state.bag[carried.id] = Math.max(0, state.bag[carried.id] - 1);
    state.health = 40;
    state.run.lastSummary = "You were carried out of the rift. One item was lost, but the rest made it back.";
  } else {
    state.run.lastSummary = state.run.kills + " creatures defeated and " + state.run.found + " finds recovered. Your loot is safe in the bag.";
    state.health = Math.max(35, state.health);
  }
  return state.run.lastSummary;
}

export function sellAllLoot(): { message: string; earned: number } {
  let earned = 0;
  let sold = 0;
  for (const item of RESOURCES) {
    const quantity = state.bag[item.id];
    if (quantity <= 0) continue;
    earned += quantity * marketPrice(item.id);
    sold += quantity;
    state.market.supply[item.id] = clamp(state.market.supply[item.id] + quantity, 0, 20);
    state.market.demand[item.id] = clamp(state.market.demand[item.id] - Math.ceil(quantity / 2), 1, 14);
    state.bag[item.id] = 0;
  }
  if (sold === 0) return { message: "Your bag is empty. Take a trip through the rift first.", earned: 0 };
  state.coins += earned;
  state.totals.coinsEarned += earned;
  state.totals.itemsSold += sold;
  state.market.message = "You brought " + sold + " items to the bazaar. More stock means buyers can negotiate harder.";
  return { message: "Sold " + sold + " items for " + earned + " coins.", earned };
}

export function buyPotion(): string {
  const price = 20;
  if (state.coins < price) return "You need " + price + " coins for a healing tonic.";
  if (state.potions >= 4) return "You can carry up to four tonics.";
  state.coins -= price;
  state.potions += 1;
  return "A healing tonic was added to your pack.";
}

export function usePotion(): string {
  if (state.potions <= 0) return "You have no healing tonics.";
  if (state.health >= state.maxHealth) return "Your health is already full.";
  state.potions -= 1;
  healPlayer(42);
  return "You used a tonic and recovered 42 health.";
}

export function upgradeWeapon(): string {
  const price = 70 + state.weaponTier * 45;
  if (state.weaponTier >= 2) return "Your blade is already at its highest level.";
  if (state.coins < price) return "You need " + price + " coins for the next blade upgrade.";
  state.coins -= price;
  state.weaponTier += 1;
  return "Blade upgraded. Each hit now deals " + playerDamage() + " damage.";
}

export function advanceMarketDay(): void {
  state.market.day += 1;
  RESOURCES.forEach((item, index) => {
    const id = item.id;
    const cycle = (state.market.day + index) % 4;
    const supplyChange = cycle === 0 ? -2 : cycle === 1 ? 0 : 1;
    const demandChange = cycle === 2 ? 2 : cycle === 0 ? 1 : -1;
    state.market.supply[id] = clamp(state.market.supply[id] + supplyChange, 1, 18);
    state.market.demand[id] = clamp(state.market.demand[id] + demandChange, 1, 14);
  });
  const pressure = RESOURCES
    .map((item) => ({ item, score: state.market.demand[item.id] - state.market.supply[item.id] }))
    .sort((a, b) => b.score - a.score)[0];
  if (pressure.score >= 4) {
    state.market.message = pressure.item.name + " is scarce today. The broker raised the offer because buyers are competing for fewer items.";
  } else if (pressure.score <= -2) {
    state.market.message = pressure.item.name + " is easy to find today. The broker lowered the offer because shelves are full.";
  } else {
    state.market.message = "Caravans are moving normally. Prices are settling as supply catches up with demand.";
  }
}
