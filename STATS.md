# Night Arena — balance (game constants)

Source of truth: `js/game.js` (this file is a quick reference; update when you change constants).

| Card / unit | Elixir | HP | Speed | Damage (main) | Notes |
|-------------|--------|----|------|----------------|--------|
| **Electro Wizard** | 4 | **150** | 26 (wizard) | `ELECTRO_WIZARD_DMG` + spawn zap | — |
| **Tung Tung Tung Sahur** | 10 | **200** | 75 | 5 (very high rate) | Death blast, etc. unchanged. |
| **Chud** | 6 | 2000 | **13** | 150 | Tower-only pathing. |
| **Mega Goblin Army** | 15 | hut+chud HP | **13** (chud) | 150 | Uses `SPEED_CHUD`. |

**Build / cache:** `NIGHT_ARENA_VERSION` in `js/game.js`; `index.html` script query `?v=` should match for cache busting when you change balance.
