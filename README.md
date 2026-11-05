# Market Rush

A 2D dungeon-and-market game built around one simple idea: **the dungeon creates the resources, but the bazaar decides what those resources are worth.**

Explore the Underroot Rift, fight creatures, collect rare materials, and return to the Lantern Bazaar. Sell when demand is high, hold items when the offer is weak, and spend your earnings on better equipment before the next expedition.

## Current build

The current playable slice includes:

- A full-screen landing page followed by a separate Phaser game.
- A walkable bazaar hub with a visible rift gate.
- A top-down dungeon with enemy movement, melee attacks, health, loot drops and extraction.
- Five resources with prices affected by market supply and demand.
- Individual item sales, sell-all, and a once-per-market-day broker negotiation.
- Craft healing tonics from moonleaf and slime cores.
- Reinforce the blade using ember ore, ironwood and coins.
- A broker explanation for why each resource is priced the way it is.
- A sell-all action, healing tonics and weapon upgrades.
- A market clock where one real minute advances seven in-game days.
- Keyboard movement and click-to-walk controls.

## Controls

- **WASD / arrow keys:** move.
- **Click inside the game world:** walk to that location.
- **Space:** attack a nearby creature.
- **E:** enter the rift or extract when standing near the gate.
- The right-side market panel can be used at any time while in the bazaar.

## Tech stack

- TypeScript
- Vite
- Phaser 3

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build

```bash
npm run build
npm run preview
```

## Economy rules

The item pricing rules live in `src/economy.ts`.

- Each resource has a base price, a bazaar stock level and a demand level.
- The broker offer moves with the difference between demand and stock. A player can negotiate once per resource each market day; the broker reacts to shortages and oversupply.
- Selling loot increases stock and eases demand, which can lower the next offer. Selling an item uses the negotiated offer when one is active.
- The market advances seven days per real minute. Daily supply and demand shifts are deterministic, so the market can be inspected and reproduced.

## NEAR integration

The current slice is a local gameplay prototype. NEAR authentication and NEP-245 ownership/transfer settlement are **not yet implemented**.

The intended integration is to make recovered game items ownable and tradable on NEAR testnet, with the game contract handling meaningful item and trade updates. Player movement, combat and other moment-to-moment actions should stay local; only meaningful economic actions should be settled on-chain. Normal play should not require seed phrases, wallet popups or manual gas prompts.

## Hackathon development principles

- The game should make sense without crypto knowledge.
- Dungeon loot and market prices should affect each other.
- Merchant decisions and pricing rules should remain readable.
- Build a small complete game loop before adding more content.
