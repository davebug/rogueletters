# RogueLetters Ideas

> **Not a plan.** Just ideas to revisit when designing future phases. Nothing here is committed.

---

## Already Implemented

> These features from brainstorming are now in the game.

- ✅ 5 turns per round, 3 rounds per set
- ✅ Score targets: 40/60/80 → 100/150/200 → 250/375/500 → 650/975/1300
- ✅ $3/$4/$5 base earnings per round
- ✅ Surplus bonus: $1 per 10 points above target
- ✅ Buffed tiles: +1 point with gold border (TILE_EFFECTS system)
- ✅ Coin tiles: $1 when played with green border
- ✅ Earnings screen after each round
- ✅ Set complete screen after Round 3
- ✅ Run state persistence (localStorage)
- ✅ Extensible TILE_EFFECTS system for adding new tile types
- ✅ Exchange costs coins (not turns like WikiLetters)
- ✅ Basic shop: 2 tiles per round (buffed or coin), add/replace options
- ✅ Blank tiles can appear in shop (no +1 bonus)
- ✅ Bag → Rack animation (tiles fly from bag when drawing)
- ✅ Rack → Bag animation (tiles fly to bag when exchanging)

---

## Decisions Made

> Finalized design decisions. See implementation plans for details.

### Economy (Phase 2) ✅
- **Base payout:** $3 (R1) → $4 (R2) → $5 (R3)
- **Extra bonus:** +$1 per 25% of target above target (e.g., $1 per 10 on target 40, $1 per 15 on target 60)
- **No interest** — keeping it simple

### Shop Structure

**Currently Implemented (Phase 2.5):**
- Shop appears after every round
- **2 tile options:** buffed (+1 point) or coin ($1 on play)
- **Pricing:** Add $2/$3, Replace $3/$4 (coin costs +$1)
- Blanks can appear (no bonus)

**Future Vision (Phase 3):**
- Expand to **4 options per round:**
  1. Tile Set Upgrade (always available, based on current tile set)
  2. Random Boost #1
  3. Random Boost #2
  4. Random Boost #3
- **Pricing:**
  - Tile Set Upgrade: $3 → $4 → $5 (persists across run)
  - Random Boosts: $3 → $4 → $5 (resets each shop visit)
- If you can't afford anything, show shop with items dimmed
- Reroll option: yes, but not in v1

### Gem Economy (Phase 4)
- Gems earned at set completion: 1/2/3/4/5 gems for sets 1-5, +5 victory bonus
- Full winning run = 20 gems
- Gems persist forever across runs
- Gem Shop accessible only between runs (from main menu)

---

## Tile Effects (Shop Tiles)

> Tiles purchased from shop can have special properties beyond +1 point.
> Gold border = "from shop". Most get +1 point, but not all.

### Currently Implemented

| Color | Cost | Effect | Indicator |
|-------|------|--------|-----------|
| **Gold/Buffed** | $2 add, $3 replace | +1 point | Gold border, score in gold circle |
| **Green/Coin** | $3 add, $4 replace | $1 when played | Green border, "$1" indicator |
| **Blank** | Same as above | Wildcard, NO +1 bonus | Gold border only |

### Future Tile Effects

| Color | Cost | Effect | Indicator |
|-------|------|--------|-----------|
| **Pink** | $3 | 1.5× points for all words using this tile | Horizontal line |
| **Red** | $2 | +3 points if NOT on a special square | X on the tile |
| **Blue** | $2 | +1 letter multiplier on 2L/3L (becomes 3L/4L) | + on the tile |
| **Purple** | $2 | +2 points, but disappears if not played this round | Star indicator |
| **Black** | $2 | +1 rack capacity while in rack | Circle around letter |
| **Stone** | ? | No letter (not blank), +10 at word start/end | Stone texture |

**Border Priority** (highest wins when tile has multiple effects):
1. Stone
2. Purple (star)
3. Black (circle)
4. Red (X)
5. Blue (+)
6. Green (line)
7. Pink (line)
8. Gold (number circle)

**Multiple indicators**: All show; only border follows priority.

---

## Board Square Effects

> New square types beyond 2L/3L/2W/3W.

| Square | Effect |
|--------|--------|
| **+4** | +4 points to tile placed here |
| **$1** | Gives $1 when tile placed here |
| **Buff** | +1 point permanently to tile placed here (rest of run) |
| **Vowel** | Tile placed here can be treated as any vowel for the round |
| **Discard** | Tile placed here is discarded at end of turn |

---

## Risk Assessment

> Ideas that could break the game or need significant revision.

### High Risk - Do Not Implement Without Major Revision

| Idea | Problem | Suggested Fix |
|------|---------|---------------|
| **Ghost tileset** (A/E swap, I/O/U swap) | Breaks word validation entirely | "Once per round, treat one vowel as another" (limited, controlled) |
| **Glass tileset** (50% lose tile) | Random punishment for playing well | "Tiles score 2× but return to bag after round" (predictable) |
| **Stone tile** (+10 at word ends) | Exploitable, unclear validation | "+5 if placed adjacent to board edge" (positional, not free) |
| **"Words within words"** (half points) | Long words become 3-4× value | Cap at "+50% for one contained word, once per turn" |
| **"No letters U-Z"** boss | Removes too much alphabet | "One random vowel costs $1 to play" (tax, not ban) |
| **"No letters A-D"** boss | Same problem | Same fix |

### Medium Risk - Needs Balancing

| Idea | Concern | Mitigation |
|------|---------|------------|
| **"Spend $1 per 10 pts to survive"** | Trivializes difficulty | Cap at $5 or once per run |
| **Black tile** (+1 rack while held) | Multiple = huge rack | Cap at +2 total rack size |
| **"Skip first 3 turns for $2"** | Either trap or exploit | "Skip 5th turn only for $3" |
| **"Most played letter vanishes"** boss | E/A vanishing = unplayable | Only consonants can vanish |
| **"Shows best word, can't play it"** boss | Frustrating, not strategic | Cut entirely or make optional |
| **"+5 rack, -1 per round"** | Becomes penalty in long runs | Cap reduction at -3 |
| **"Random vowel = 13 pts, take 13 from others"** | Common letters go negative | Floor at 0 points |
| **"0-23 random points"** | Pure RNG, no agency | Cut or narrow range |
| **Copper 2×2 grid** | Nearly impossible on word board | Increase reward or loosen trigger |

### Low Risk but Questionable

| Idea | Concern |
|------|---------|
| **"No words exactly 5 letters"** boss | Unintuitive, frustrating |
| **"+5 for repeat word"** boost | Encourages boring repetition |
| **Glitch tileset** (random distribution) | 7 Z's = instant loss |
| **"Destroy random boost, 2× score"** | Losing best boost feels bad |

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
- Reduce exchange cost by $1 (min $1)
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
| **Glass** | Tiles score 2× but return to bag after round (not lost, predictable) | Get all returned tiles back permanently |
| **Copper** | 2×2 grid of tiles = all 4 score again (once per letter) | +2 points every time you get a 2×2 grid |
| **Silver** | Words under 5 letters = ×1.5 points | +3 points to 1 random tile |
| **Gold** | Start with $10 | +$1 on play to a random tile |
| **Ivory** | +$1 per round, but extra bonus is $1 per 12 (not 10) | Extra bonus threshold -1 per purchase |
| **Onyx/Ebony** | +1 tile in rack | +1 point per letter over 4 in a word |
| **Ruby** | See the next tile coming up | +2 points if word intersects previous word |
| **Emerald** | +1 gem for beating sets 3, 4, 5 | +1 gem if you win (buy limit: 1× per set, sets 1-3 only) |
| **Amethyst** | +1 option in shop (5 slots) | +2 points per in-run boost you have |
| **Ghost** | Once per round, treat one vowel as any other vowel | Turn a random letter into any letter of your choice |
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

## Animations & UI Polish

> Visual improvements for better game feel.

### Already Implemented
- ✅ **Bag → Rack**: Tiles animate from bag to rack when drawing
- ✅ **Rack → Bag**: Tiles animate to bag when exchanging

### Future Polish
- **Tile value increase**: When purchasing a tile that gets buffed, show the value change with animation
- **Caption space**: Use tile caption area to explain what buff was applied
- **Shop tile distinction**: Buffed tiles show value in red, use outlines to distinguish effects

---

## Clarifications Needed

> Ideas that need more detail before implementation.

| Idea | Question |
|------|----------|
| Stone tile placement | How does word validation work? Is "CATS+STONE" valid? Visual representation? |
| "Change crossover letter" | "Once a round, when you put a word down, change a crossover letter to one you have" — is this swapping a board tile? |
| Ghost tileset vowel swap | How do you validate words when A/E are interchangeable? Custom dictionary? |
| Tile set unlock path | Gems? Beat certain sets? Achievements? |
| Gem amounts per set | 1/2/3/4/5 is documented, but confirm this is final |
| Border priority order | Is the order I documented correct? Confirm with design |
| Black tile rack limit | Is there a cap on how many +1 rack effects stack? |

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

**Exchange rule (decided):**
- ✅ Exchange costs coins (not turns) - already implemented
- "Free exchange" and "turn-based exchange" ideas no longer applicable

**Surplus calculation:**
- ✅ Implemented: $1 per 25% of target above target (scales with difficulty)
- Original idea was $1 per 10 points (flat) - decided against

**Shop section naming:**
- Consider naming like store aisles: "Tile Shop", "Buff Aisle", "Boosts"

**Balatro equivalents noted:**
- Jokers = Boosts
- Buying cards = Buying buffed tiles
- Tarot cards = Further buff existing tiles
- Spectral cards = Buff board squares

(dump anything else here)
