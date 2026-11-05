export type ResourceId = "emberOre" | "riftCrystal" | "firewood" | "moonleaf" | "slimeCore";

export type Resource = {
  id: ResourceId;
  name: string;
  icon: string;
  description: string;
  basePrice: number;
};

export const RESOURCES: Resource[] = [
  { id: "riftCrystal", name: "Rift crystal", icon: "✧", description: "A charged crystal pulled from the heart of the rift.", basePrice: 24 },
  { id: "emberOre", name: "Ember ore", icon: "◆", description: "Warm metal mined near the rift.", basePrice: 16 },
  { id: "moonleaf", name: "Moonleaf", icon: "✦", description: "A rare herb used by travelling healers.", basePrice: 11 },
  { id: "slimeCore", name: "Slime core", icon: "●", description: "A useful alchemy ingredient.", basePrice: 13 },
  { id: "firewood", name: "Ironwood", icon: "▥", description: "Dense timber used to make handles and camp gear.", basePrice: 8 },
];

export type ResourceCounts = Record<ResourceId, number>;
const emptyCounts = (): ResourceCounts => ({ emberOre: 0, riftCrystal: 0, firewood: 0, moonleaf: 0, slimeCore: 0 });

export const state = {
  coins: 100,
  health: 100,
  maxHealth: 100,
  potions: 1,
  weaponTier: 0,
  bag: emptyCounts(),
  market: {
    day: 1,
    supply: { emberOre: 5, riftCrystal: 3, firewood: 12, moonleaf: 9, slimeCore: 4 } as ResourceCounts,
    demand: { emberOre: 9, riftCrystal: 11, firewood: 4, moonleaf: 4, slimeCore: 7 } as ResourceCounts,
    negotiatedDay: emptyCounts(),
    negotiatedOffer: emptyCounts(),
    message: "The first caravan is late. Rift crystals are already drawing attention.",
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

export function brokerOffer(id: ResourceId): number {
  if (state.market.negotiatedDay[id] === state.market.day) return state.market.negotiatedOffer[id];
  return Math.max(1, Math.round(marketPrice(id) * 0.9));
}

export function negotiateOffer(id: ResourceId): string {
  if (state.bag[id] <= 0) return "You need at least one " + resourceById(id).name.toLowerCase() + " to negotiate a sale.";
  if (state.market.negotiatedDay[id] === state.market.day) return "Mara has already negotiated for this resource today. Try again after the market turns.";
  const price = marketPrice(id);
  const demand = state.market.demand[id];
  const supply = state.market.supply[id];
  state.market.negotiatedDay[id] = state.market.day;
  if (demand > supply) {
    const improved = Math.round(price * 1.18);
    state.market.negotiatedOffer[id] = improved;
    state.market.message = "Mara raised her offer for " + resourceById(id).name + ". Buyers are competing for limited stock.";
    return "Mara considers the shortage and raises her offer to " + improved + " coins each.";
  }
  const reduced = Math.max(1, Math.round(price * 0.82));
  state.market.negotiatedOffer[id] = reduced;
  state.market.message = "Mara refuses a higher price. " + resourceById(id).name + " is already easy to find.";
  return "Mara shakes her head. Supply is high, so her offer falls to " + reduced + " coins each.";
}

export function sellResource(id: ResourceId, quantity = 1): { message: string; earned: number } {
  const amount = Math.min(state.bag[id], Math.max(1, quantity));
  if (amount <= 0) return { message: "You do not have that item in your pack.", earned: 0 };
  const price = brokerOffer(id);
  const earned = amount * price;
  state.bag[id] -= amount;
  state.coins += earned;
  state.totals.coinsEarned += earned;
  state.totals.itemsSold += amount;
  state.market.supply[id] = clamp(state.market.supply[id] + amount, 0, 20);
  state.market.demand[id] = clamp(state.market.demand[id] - Math.ceil(amount / 2), 1, 16);
  state.market.message = "Mara bought " + amount + " " + resourceById(id).name.toLowerCase() + (amount > 1 ? "s" : "") + ". Her shelves are fuller now.";
  return { message: "Sold " + amount + " " + resourceById(id).name.toLowerCase() + " for " + earned + " coins.", earned };
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
    earned += quantity * brokerOffer(item.id);
    sold += quantity;
    state.market.supply[item.id] = clamp(state.market.supply[item.id] + quantity, 0, 20);
    state.market.demand[item.id] = clamp(state.market.demand[item.id] - Math.ceil(quantity / 2), 1, 16);
    state.bag[item.id] = 0;
  }
  if (sold === 0) return { message: "Your bag is empty. Take a trip through the rift first.", earned: 0 };
  state.coins += earned;
  state.totals.coinsEarned += earned;
  state.totals.itemsSold += sold;
  state.market.message = "You brought " + sold + " items to the bazaar. More stock means buyers can negotiate harder.";
  return { message: "Sold " + sold + " items for " + earned + " coins at the board price.", earned };
}

export function craftTonic(): string {
  if (state.bag.moonleaf < 1 || state.bag.slimeCore < 1) return "Crafting a tonic needs 1 moonleaf and 1 slime core.";
  if (state.potions >= 4) return "Your pack is already full. You can carry up to four tonics.";
  state.bag.moonleaf -= 1;
  state.bag.slimeCore -= 1;
  state.potions += 1;
  state.market.message = "The apothecary turned your gathered herbs and slime core into a healing tonic.";
  return "Crafted a healing tonic from 1 moonleaf and 1 slime core.";
}

export function craftBlade(): string {
  const coinCost = 35 + state.weaponTier * 25;
  if (state.weaponTier >= 2) return "Your blade is already fully reinforced.";
  if (state.bag.emberOre < 2 || state.bag.firewood < 1) return "Reinforcing the blade needs 2 ember ore and 1 ironwood.";
  if (state.coins < coinCost) return "The armourer needs " + coinCost + " coins for the forge work.";
  state.bag.emberOre -= 2;
  state.bag.firewood -= 1;
  state.coins -= coinCost;
  state.weaponTier += 1;
  state.market.message = "The armourer used your materials to reinforce the blade. Your next expedition will hit harder.";
  return "Blade reinforced using 2 ember ore, 1 ironwood and " + coinCost + " coins. Damage is now " + playerDamage() + ".";
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
    state.market.demand[id] = clamp(state.market.demand[id] + demandChange, 1, 16);
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
