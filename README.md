# Market Rush

A 2D street-food business simulation where players compete in a living economy.

You run a food stall on a shared market street. Customers have budgets and preferences, rival stalls make their own business decisions, and suppliers have limited stock. Ingredient prices and customer demand change as the street trades.

## Current status

Early prototype. The first milestone is a playable 2D street scene. The economy simulation and NEAR integration will be added in later milestones.

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

## Game direction

- One street with a player-owned food stall and two rival stalls.
- Customers have wallets, food preferences and patience.
- A shared supplier sells limited ingredient stock.
- Stalls buy ingredients, prepare meals and set prices.
- Supply, demand and competition change the market over time.
- A fast-forward mode simulates seven in-game days.

## NEAR integration

Planned for the hackathon build:
- NEAR social/email authentication.
- NEP-245 multi-token items for ingredients and prepared food.
- A game contract for player stall ownership and in-game economic records.

Normal gameplay should not require seed phrases, wallet popups or gas prompts.

## Development principles

- Keep the game understandable without blockchain knowledge.
- Make NPC decisions deterministic, inspectable and explainable.
- Keep moment-to-moment simulation responsive; batch meaningful state changes for on-chain settlement.
- Build a small, complete game loop before adding content.
