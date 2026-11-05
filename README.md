# Street Food Rivals

A small, turn-based food-stall strategy game about running a street-food business in a changing market.

## How to play
1. Buy ingredients from the shared supplier market.
2. Pick a recipe and set your selling price.
3. Serve customers based on what they like and what they can afford.
4. Compete with two rival stalls for customers.
5. Finish the day, review your ledger, and return to a market whose prices have changed.

## Current prototype
- Three recipes: smoky jollof, chicken wrap, tomato rice.
- Four ingredients with changing prices and market stock.
- Customer cards with budgets and food preferences.
- Two simulated rival stalls.
- Market events such as chicken shortages, harvests, payday and rain.
- Reputation, daily ledger, browser save and reset.

## Tech
TypeScript, Vite, HTML and CSS. The game is turn-based and does not need a physics engine or game canvas.

## Build
```bash
npm install
npm run build
npm run dev
```

## Economy
Supplier stock and customer demand influence ingredient prices. Buying ingredients reduces shared stock. Cooking consumes ingredients and increases demand. Daily supplier deliveries replenish the market. Customers compare food preference, budget and rival pricing before choosing a stall.

## NEAR direction
The prototype is playable without a wallet. A future NEAR testnet integration can make selected recipe/ingredient cards ownable and support meaningful player-to-player trading, rather than putting routine game actions on-chain. No NEAR integration is claimed in this prototype yet.
