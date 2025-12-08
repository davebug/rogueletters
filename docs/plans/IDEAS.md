# RogueLetters Ideas

> **Not a plan.** Just ideas to revisit when designing future phases. Nothing here is committed.

---

## Decisions Made

> Finalized design decisions. See implementation plans for details.

### Economy (Phase 2) ✅
- **Base payout:** $3 (R1) → $4 (R2) → $5 (R3)
- **Extra bonus:** +$1 per 10 points above target
- **No interest** — keeping it simple

### Shop Structure (Phase 3)
- Shop appears after every round (including Round 3)
- **4 options per round:**
  1. Tile Set Upgrade (always available, based on current tile set)
  2. Random Upgrade #1
  3. Random Upgrade #2
  4. Random Upgrade #3
- **Pricing:**
  - Tile Set Upgrade: $3 → $4 → $5 (persists across run)
  - Random Upgrades: $3 → $4 → $5 (resets each shop visit)
- If you can't afford anything, show shop with items dimmed
- Modified tiles show value in red
- Reroll option: yes, but not in v1

### Gem Economy (Phase 4)
- Gems earned at set completion: 1/2/3/4/5 gems for sets 1-5, +5 victory bonus
- Full winning run = 20 gems
- Gems persist forever across runs
- Gem Shop accessible only between runs (from main menu)

---

## In-Run Progression (Phase 3)

> Things you buy and earn during a run. Reset when run ends.

### Random Upgrade Pool

> These are the modifiers that appear as the 3 random options in the shop.
> **Design goal:** Large variety for replayability, but nothing that massively alters core gameplay.
> Should feel like enhancements, not transformations.

#### Tile Value Boosts
- +1 to a specific common letter (E, A, I, O, etc.)
- +1 to all vowels
- +1 to all consonants
- +2 to a specific uncommon letter (J, X, Q, Z)
- "Golden [letter]" — specific tile worth 2× (rare)
- 5 random tiles become "lucky" (1-in-3 chance for double points)
- All tiles gain 2× points until you next play them
- +3 points to whichever of R, S, T, L, N, E you've played least this run

#### Scoring Bonuses
- +5 points for 5-letter words
- +10 points for 6+ letter words
- Bingo threshold reduced (7 → 6 letters)
- Bingo is worth 2× points
- +3 for using all different letters
- +5 for using 3+ of same letter
- If first letter of word is a vowel, ×1.5 for the word
- If word has 2 of same letter in a row, both get 2× points
- If word starts and ends with same letter, both get 2× points
- +2 points per vowel above 1 in a word
- +1 point per letter over 4 in a word
- +5 points if you play a word you've played before this run
- +2 points if word intersects with previous word

#### Board Enhancements
- Add 1 extra TW square (random position each round)
- Add 2 extra DW squares (random positions each round)
- Add 3 extra TL squares (random positions each round)
- Place 2 TL squares anywhere on board (permanent)
- If word uses both word-mult and letter-mult spaces, letter-mult +1 (once per letter-mult)

#### Resource Boosts
- +1 tile in rack (7 → 8)
- +1 turn this set (5 → 6 per round)
- Draw +1 tile after 5+ letter word
- Exchange up to 3 letters 1× per round for free (no turn use)
- Reroll starting word once per round
- Blank tile (wild card) — acts as any letter

#### Economy Boosts
- +$1 when using [specific letter]
- +10% extra bonus (rounds up)
- +$1 base payout per round
- +$1 if you have $0 at start of round
- Second boost purchase does not increase by $1
- Option: skip extra turns after hitting target, get $1 per skipped turn
- Option: "bet" up to $5 you'll win in ≤3 turns; if you do, get 2× bet back
- Finish early bonus: +$1 per unused turn when round ends

#### Defensive / Insurance
- If you would lose, spend $1 per 10 points short to survive (once)
- Next boss has no power
- Next boss has half point requirement

#### Meta / Gems
- +1 gem if you win (can only appear once, sets 1-2 only, not with Emerald deck)

#### Legendary Boosts (rare)
- One free exchange of any number of rack tiles per round

#### NOT Including
- ~~New square types (Star, etc.)~~ — too complex
- ~~Skip a round~~ — undermines core loop
- ~~Interest rate boosts~~ — no interest system

---

### Boss Rounds

> Round 3 of each set has a negative modifier that makes it harder.
> This is the "boss" — a challenge to overcome with your upgrades.

**Potential boss round effects:**

*Resource restrictions:*
- Rack size reduced by 1
- One fewer turn this round
- Only 1 turn, but half score requirement
- New tiles can't be played the turn you draw them

*Scoring penalties:*
- One letter type is "cursed" (worth 0 points)
- All vowels worth -1 (minimum 0)
- Vowels get no bonuses from spaces (DL, TL, etc.)
- Tiles placed on board edges worth only 1 point
- No bingo bonus this round
- Must score 10% above target to pass

*Board changes:*
- No bonus squares (DL, TL, DW, TW disabled)
- Downgrade squares: 3W→2W, 2W→2L, 3L→2L
- Board starts with 2-3 random blocked squares

*Word restrictions:*
- No words under 4 letters
- No words exactly 5 letters
- All words must start with unique letters (across turns)
- Must use 1 specific tile from your rack
- Letter restrictions (e.g., no U-Z, or no A-D)

*Weird/Tricky:*
- Most-played letter vanishes from bag for this round
- Shows your best possible word, but you can't play it
- Random tiles are "frozen" (can't be moved once placed)
- Tiles decay: -1 point per turn they stay in rack

*Economy:*
- -$1 per vowel you play

**Counter-boosts:**
- "Next boss has no power"
- "Next boss has half point requirement"

---

## Meta-Progression (Phase 4)

> Things you unlock permanently across runs. Never reset (until prestige).

### Tile Sets

> Each tile set has:
> 1. **Passive bonus** — always active when using this set
> 2. **Always-available shop upgrade** — appears in slot 1 every shop visit
>
> Tile sets are unlocked with gems. Base set is Plastic.

| Set | Passive Bonus | Always-Available Shop Upgrade |
|-----|---------------|-------------------------------|
| **Plastic** (base) | +1 to rare letters (J, Q, X, Z) | +1 point to 3 random tiles |
| **Wood** | +1 to all vowels | +3 to vowels of your choice (pick 3) |
| **Stone** | +1 per consonant ÷ vowels in word | Get 1 consonant of your choice |
| **Glass** | Tiles give 2× score but 1-in-4 chance to lose tile when played | Get all broken tiles back |
| **Copper** | 2×2 grid of tiles = all 4 score again (once per letter) | +2 points every time you get a 2×2 grid |
| **Silver** | Words under 5 letters = ×1.5 points | +3 points to 1 random tile |
| **Gold** | Start with $10 | +$1 on play to a random tile |
| **Ivory** | +$1 per round, but extra bonus is $1 per 12 (not 10) | Extra bonus threshold -1 per purchase |
| **Onyx/Ebony** | +1 tile in rack | +1 point per letter over 4 in a word |
| **Ruby** | See the next tile coming up | +2 points if word intersects previous word |
| **Emerald** | +1 gem for beating sets 3, 4, 5 | +1 gem if you win (buy limit: 1× per set, sets 1-3 only) |
| **Amethyst** | +1 option in shop (5 slots) | +2 points per in-run boost you have |
| **Glitch** | Letter distribution randomly ±50% to 2× | Random upgrade from another set (changes each round) |

#### Upgrading Tile Sets

Gems can also upgrade tile sets you've unlocked, making their signature shop upgrade more powerful.

Example progression:
- **Plastic I** (unlock): +1 to 3 random tiles
- **Plastic II** (upgrade): +1 to 4 random tiles
- **Plastic III** (upgrade): +2 to 3 random tiles

This lets players invest in a "main" tile set over many runs, creating distinct playstyles.

---

### Permanent Upgrades (Gem Shop)

> Purchased with gems between runs. Persist forever.

#### Starting Bonuses
- "Nest egg" — Start runs with $3 / $5 / $8
- "Head start" — Start Round 1 with a random modifier
- "Loaded rack" — Start with one tile upgraded to +1

#### Pool Expansions
- "Deep pockets" — Unlock economy upgrades in shop pool
- "Wordsmith" — Unlock rare scoring bonuses in shop pool
- "Architect" — Unlock board enhancement upgrades in shop pool

#### Game Rule Tweaks
- "Sixth sense" — Permanently +1 turn per round (5 → 6)
- "Big hands" — Permanently +1 tile in rack (7 → 8)
- "Generous targets" — All targets -10 permanently
- "Interest" — Earn +1 per $10 held between rounds

#### Board Enhancements (permanent)
> Board modifications are mostly in-run shop purchases (gated by "Architect" unlock).
> Permanent upgrades should be subtle buffs, not new squares — keeps runs varied.

- "Reinforced Letters" — DL squares give ×2.5 instead of ×2
- "Fortified Words" — DW squares give ×2.5 instead of ×2
- "Triple Threat" — TL squares give ×3.5 instead of ×3
- "Power Words" — TW squares give ×3.5 instead of ×3

#### Quality of Life
- "Undo" — Can undo tile placements (1 per turn)
- "Preview" — See next turn's tiles faintly
- "Statistics" — Track lifetime stats

#### Prestige / New Game+
- Full reset option that grants a permanent bonus
- "Ascension levels" like Slay the Spire?

---

## Open Questions

**Random Upgrades:**
- How do random upgrades get selected? Pool? Weighted? Rarity tiers?
- How many modifiers before it feels overwhelming?
- Should modifiers be removable/replaceable?
- Stack limits?

**Tile Sets:**
- Some sets need balancing (Glass risk/reward, Emerald gem bonus)

**Boss Rounds:**
- When to introduce? Phase 3 or later?
- How are boss effects chosen? Random? Per-set? Escalating?

---

## Polish Ideas

### Currency Symbols

**In-Run Currency ($):**

| Symbol | Example | Vibe |
|--------|---------|------|
| `✦` | `✦47` | Mystical/arcane — **top pick** |
| `Ɍ` | `Ɍ47` | Dollar sign but "Rogue" |
| `☠` | `☠47` | Maximum roguelike (maybe too edgy) |

**Gem Currency (◆):**

| Symbol | Code | Name | Vibe |
|--------|------|------|------|
| `◆` | U+25C6 | Black Diamond | Clean, classic — **top pick** |
| `♦` | U+2666 | Black Diamond Suit | Playing card feel, Balatro aesthetic |
| `✧` | U+2727 | White Four Pointed Star | Sparkle, pairs with ✦ |

---

## Random Thoughts

**Domain names considered:**
- rogue.letters.wiki (current)
- roguesquares.com
- rogueletter.com

**Prestige/New Game+ note:**
Prestige systems are "not a normal roguelike feature" — consider carefully whether this fits RogueLetters or if it adds unnecessary complexity.

**WikiLetters sync ideas:**
- Add blank tiles to WikiLetters (check if it uses 98 tiles)
- Add exchange tiles turn to WikiLetters

(dump anything else here)
