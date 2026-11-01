# Art prompts — the image pack

The game has no art. This document is the brief for generating it outside the repo, with a style strict enough that ninety-eight images look like one set.

It is not a wish list. Every prompt below maps to a content id the sim already has, so a generated file can be dropped in without a rename and nothing in `src/` changes.

> **Status (2026-11-01).** The first set is generated: 98/98 files in `public/art/`, all wired. It was made in the oil-paint style below and is **superseded** — the icons did not read at 28 px, so §2 now specifies painted cartoon fantasy and the set needs regenerating (~98 calls). The old files still render until they are replaced.

---

## 0. What gets an image, and what does not

| Asset | Count | Why this many | Display size |
|---|---|---|---|
| Role portraits | 8 (16 with variants) | Heroes are generated, so portraits are **per role**, not per hero. 120 heroes reuse 8 faces. | 40 px in a row, 200 px on the sheet |
| Location key art | 30 | One per `ContentDef` in [content.ts](../src/sim/content/content.ts). | 112 px card, 640 px header |
| Item icons | 53 | One per unique `drops[]` entry. | 20–28 px |
| Market icons | 7 | One per `MARKET_GOODS` entry. | 20–28 px |

**Rejected: a portrait per hero.** Hero names, traits and attributes are rolled from a seed ([heroes.ts](../src/sim/content/heroes.ts)). A run can mint 120 heroes. A per-hero portrait means generating art at runtime, or shipping 120 faces that most players never see. Eight role portraits cost 8 images and cover every hero the sim can produce.

**Rejected: a crest or sigil per guild.** The guild name is player text. Hand-drawn art cannot follow it.

**Consequence you must accept:** two warriors in the same roster have the same face. If that is unacceptable, the fix is 2–3 variants per role (16–24 images) assigned by hero id parity, not a portrait per hero.

---

## 1. Get the list

The tables below are the source. The script turns them into rows you can paste.

```bash
npm run art:prompts    # art/prompts.csv + art/prompts-mj.txt
npm run art:check      # doc still covers the content; how many images exist
```

`art/prompts.csv` is one row per image: `file, folder, id, name, aspect, generate_size, export_size, prompt, negative`. The style block is already joined to the subject, so a row is paste-ready.

`art/prompts-mj.txt` is the same list with Midjourney flags applied (`--ar`, `--style raw`, `--s 50`, `--no`): one command per image, destination file as the comment above it.

Or skip the manual step entirely: `npm run art:generate` reads the CSV and writes the images (§12).

The rule the script applies: **STYLE BLOCK + ", " + SUBJECT**. Nothing else. Do not add a mood word per image: that is how a set drifts.

What a row comes out as:

```
hand-painted fantasy hero portrait in the style of 2000s RTS character art, head and shoulders
filling the frame, bold chunky forms, thick dark outline, fully saturated colour, strong rim light
and a coloured glow behind the head, bright lit face against a dark background, exaggerated
expressive features, readable as a 32 px silhouette, no text,
broad-shouldered warrior in scarred plate, tower shield resting edge-down, helm under one arm,
grey at the temples, patient
```

Item example:

```
hand-painted still life of a single fantasy object filling the frame, bold chunky silhouette, thick
dark outline, fully saturated colour, bright highlights, strong rim light, a coloured glow behind
the object fading to black at the edges, no text, no frame, no border, small stoneware jar of green salve,
waxed cloth lid, salve smeared on the rim
```

Location example:

```
hand-painted fantasy environment in the style of 2000s RTS concept art, wide establishing shot at
eye level, bold shapes, fully saturated palette, strong directional light, high colour contrast,
stylised proportions, no figures in the foreground, no text, birch and pine wood at
dusk, moss underfoot, a hunter's trail, embers of a dead campfire
```

---

## 2. The style blocks

Three blocks, one per asset class. Copy them exactly. They are the whole consistency mechanism.

**Portraits**

```
hand-painted fantasy hero portrait in the style of 2000s RTS character art, head and shoulders
filling the frame, bold chunky forms, thick dark outline, fully saturated colour, strong rim light
and a coloured glow behind the head, bright lit face against a dark background, exaggerated
expressive features, readable as a 32 px silhouette, no text
```

**Locations**

```
hand-painted fantasy environment in the style of 2000s RTS concept art, wide establishing shot at
eye level, bold shapes, fully saturated palette, strong directional light, high colour contrast,
stylised proportions, no figures in the foreground, no text
```

**Items**

```
hand-painted still life of a single fantasy object filling the frame, bold chunky silhouette, thick
dark outline, fully saturated colour, bright highlights, strong rim light, a coloured glow behind
the object fading to black at the edges, no text, no frame, no border
```

**Negative prompt** (SD, Flux, ComfyUI; Midjourney gets the short form in `--no`)

```
text, watermark, signature, letters, numbers, ui, frame, border, drop shadow, collage,
multiple views, character sheet, photorealistic, 3d render, plastic, muddy, low contrast,
desaturated, grey, soft focus, blurry, vignette, black bars
```

**Why these words.** The first set was oil paint in the UI's own palette: slate, ash, one gold accent. At 200 px it looked right, and at 28 px sixty item icons were grey shapes on black that nobody could tell apart. The measuring stick is not "does the thumbnail look good", it is "can the object be named from the icon alone". That needs a silhouette and a saturated colour, so the style moved to painted cartoon fantasy — the direction [Samwise Didier](https://en.wikipedia.org/wiki/Samwise_Didier) established for Warcraft III: chunky exaggerated forms, thick dark outlines, flat vivid colour, one strong light.

**Do not put the artist's name in the prompt.** Some models filter a living artist's name; the ones that do not produce a pastiche of one picture rather than a working style. "2000s RTS concept art" plus the properties carries the same information and survives the filter. Use the name to explain the target to a human, not to the model.

**What the reference actually does.** The Warcraft III sheets show four things, and only one of them is about brightness:

| Property | In the reference | In our first set |
|---|---|---|
| Subject vs ground | object is the brightest thing in the frame, background falls off to near-black | object and ground were the same value |
| Hue | one dominant colour per icon — cyan ice, orange fire, green poison — carried by the object | grey object, grey ground |
| Separation | thick dark outline, plus a coloured halo behind the subject | no outline, no halo |
| Fill | subject occupies 70–85% of the square | subject in the middle third |

So the background in the reference is dark, and can stay dark. What makes it read at 64 px is that the subject is much brighter than the ground and carries the only saturated colour. "Bright high-key" (the previous wording) would have flattened exactly the contrast that does the work, so it is gone; the blocks now ask for a **bright lit subject, fully saturated, with a coloured glow behind it on a dark ground**.

**The reference is not in the repo, and should not be.** Those sheets are Blizzard's art. Use them to steer the prompt, never to train on, trace, or commit.

## 3. Consistency protocol

Style blocks get you 80% of the way. These get you the rest.

| Technique | Use |
|---|---|
| **One seed per family** | Find a portrait you like, keep the seed, reuse it for the other seven roles with a changed subject. Result: same paint handling, same lighting. |
| **Style reference** | Midjourney `--sref <url>` or Flux/SDXL IP-Adapter against the best location image. Applies the *look* without applying the *subject*. |
| **Character reference** | Midjourney `--cref <url> --cw 20`. Only needed if you add variants of one role and want the same face at a different angle. |
| **Generate 4, keep 1, record the seed** | In a `seeds.txt` next to the images. One line per family. Without it you cannot regenerate a lost file. |
| **Upscale once, then downscale** | Generate at the model's native size, downscale to the export size. Never upscale a low-res output; it will not survive 200 px on the hero sheet. |

---

## 4. Heroes — 8 role portraits

One per role in [roles.ts](../src/sim/content/roles.ts). Filename is the role id.

| File | Role | Subject |
|---|---|---|
| `roles/bulwark.jpg` | Bulwark | a heavyset man of fifty, grey beard, scarred plate, tower shield edge-down, helm under one arm, patient |
| `roles/vanguard.jpg` | Vanguard | a wiry woman of twenty-eight, shaved at the sides, half-plate, two-handed axe across the shoulders, jaw set |
| `roles/lightbringer.jpg` | Lightbringer | a young man from the southern desert, cropped hair, pale vestments over mail, hands cupped around a small steady flame |
| `roles/oracle.jpg` | Oracle | an old woman, hooded, eyes closed, iron bells at the belt, ink-stained fingers, still |
| `roles/evoker.jpg` | Evoker | a woman of forty with a burn scar on one cheek, scorched robes, an ember burning in her open palm, impatient |
| `roles/arcanist.jpg` | Arcanist | a heavyset man in his sixties, layered robes, a book chained to the wrist, tired and precise |
| `roles/assassin.jpg` | Assassin | a young woman with dark skin and a shaved head, dark leathers, short blade reversed along the forearm, flat stare |
| `roles/trickster.jpg` | Trickster | a lean man of thirty-five with a broken nose, road clothes, three knives and a coil of wire, half a smile |

**The identity goes first.** The style block holds the *look*; nothing in it holds the *person*, so the model reuses the last face it drew. Four portraits generated back to back on 2026-11-01 produced the same young man twice — `vanguard` and `lightbringer`, same hair, same brow, same bandaged forearm, different costume. Put the identity at the front of the subject, change it every time, and add "a different person from the previous image". Two of those four were also grey-bearded men; the roster looks like one village unless the identities are split deliberately.

| Generated | Problem | Fix |
|---|---|---|
| `bulwark`, `oracle` | both older men with grey beards | `oracle` becomes an old woman |
| `vanguard`, `lightbringer` | the same face | keep `vanguard`, regenerate `lightbringer` from the new line |

**Variants (optional, 16 images).** For each role, generate a second portrait with the same subject line plus one of these swaps, and assign by `hash(hero.id) % 2`:

- alternate build: "heavier frame, shaved head" / "slight, wiry"
- alternate age: "young, early twenties" / "forties, weathered"
- alternate presentation across the set, deliberately: vary skin tone, hair, and gender across the sixteen so the roster is not eight people from one village.

**Framing rules.** Head and shoulders, the head filling about half the frame — the reference portraits crop closer than a normal character sheet, and the crop is what survives a 26 px circle. Eyes on the upper third. Do not let a weapon leave the frame; a cut-off axe reads as a mistake at 26 px.

---

## 5. Locations — 30 key arts

One per content id. Order is the ladder, which is also the order to generate: the early ones are seen in every run.

### Farms and missions

| File | Name | Subject |
|---|---|---|
| `places/emberwood.jpg` | Emberwood | birch and pine wood at dusk, moss underfoot, a hunter's trail, embers of a dead campfire |
| `places/old-quarry.jpg` | The Old Quarry | abandoned stone quarry, terraced cut walls, rusted winch, black water at the bottom |
| `places/whisper-glade.jpg` | Whispering Glade | still glade ringed by old trees, low mist, pale flowers, one shaft of light |
| `places/warrens.jpg` | The Warrens | cellar under a tavern, brick vaults, straw and rat runs, a single lantern |
| `places/wolf-den.jpg` | The Wolf Den | rock den mouth under a root tangle, bones and shed fur, snow at the entrance |
| `places/drowned-mill.jpg` | The Drowned Mill | watermill half-sunk in a millpond, wheel still turning, thick fog |
| `places/bandit-road.jpg` | The Bandit Road | muddy trade road through scrub, wagon ruts, a torn banner on a post, ambush ground |
| `places/toll-house.jpg` | The Toll House | stone toll house at a bridge approach, barred window, chain across the gate |
| `places/plundered-vault.jpg` | The Plundered Vault | bank vault opened from the inside, coin scattered, iron door ajar |
| `places/broken-bridge.jpg` | The Broken Bridge | stone bridge with a missing span over fast water, rope and loose planks |

### Dungeons

| File | Name | Subject |
|---|---|---|
| `places/hollow-crypt.jpg` | Hollow Crypt | crypt stair descending into dark, carved arches, candle stubs, cold air |
| `places/sallow-reach.jpg` | The Sallow Reach | flooded orchard, dead trees in shallow water, duckboards, yellow mist |
| `places/wailing-mines.jpg` | The Wailing Mines | mine shaft entrance, timber frame, ore carts, blue-black dark |
| `places/ragged-chapel.jpg` | The Ragged Chapel | chapel roof fallen in, bell still hanging, pews in dust |
| `places/sunken-temple.jpg` | Sunken Temple | temple half underwater, steps to an idol, green light through the surface |
| `places/ember-kilns.jpg` | The Ember Kilns | glassworks furnace hall, banked coals, glass shards on the floor |
| `places/iron-tide.jpg` | The Iron Tide | war galley beached on a reef at low tide, torn sails, salt crust |
| `places/pale-market.jpg` | The Pale Market | market street closed by plague, shutters, quarantine marks, empty stalls |
| `places/ashen-spire.jpg` | Ashen Spire | black spire above an ash plain, stairs cut into rock, storm light |

### Raids

| File | Name | Subject |
|---|---|---|
| `places/raid-gatewarden.jpg` | Obsidian Citadel — Gatewarden | citadel gate of black stone, two towers, portcullis, army scale |
| `places/raid-covens.jpg` | Obsidian Citadel — Twin Covens | ritual chamber, two thrones of bone, candles, hex circles on the floor |
| `places/raid-tyrant.jpg` | Obsidian Citadel — The Tyrant | throne room of obsidian, a giant seated figure, gold veins in black stone |

### High-band farms and missions

| File | Name | Subject |
|---|---|---|
| `places/ashen-verge.jpg` | The Ashen Verge | burn scar plain, charred trunks, ash drifting, low sun |
| `places/sunken-shoals.jpg` | The Sunken Shoals | low tide wreck field, ribs of ships, standing pools, gulls |
| `places/glass-wastes.jpg` | The Glass Wastes | fused glass desert, shards underfoot, heat shimmer, bleached bone |
| `places/obsidian-road.jpg` | The Obsidian Road | black stone road, toll gate, teeth nailed to the post |
| `places/cinder-road.jpg` | The Cinder Road | ash road through burnt country, checkpoint, smoke on the horizon |
| `places/silent-abbey.jpg` | The Silent Abbey | abbey cloister at night, one lit window, snow |
| `places/broken-standard.jpg` | The Broken Standard | battlefield, a torn company banner on a spear, crows, mud |
| `places/last-outpost.jpg` | The Last Outpost | stone outpost gate on a black road, one watchfire |

**Framing rules.** Horizon on the lower third for interiors, middle for exteriors. Leave the left third quiet: the UI puts a title and a lock reason over it.

---

## 6. Items — 60 icons

Items are read at 20–28 px. One object, filling 80% of the frame, no scene. Detail beyond a silhouette and one highlight is wasted.

### Market goods

| File | Name | Subject |
|---|---|---|
| `items/salve.jpg` | Field Salve | small stoneware jar of green salve, waxed cloth lid, salve smeared on the rim |
| `items/rations.jpg` | Trail Rations | cloth-wrapped hard bread and dried meat tied with twine |
| `items/tonic.jpg` | Oiled Tonic | glass flask of amber tonic, leather stopper, oil sheen on the glass |
| `items/gear-weapon.jpg` | Forged Blade | plain but well-made arming sword, worn leather grip |
| `items/gear-chest.jpg` | Riveted Cuirass | steel cuirass, riveted plates, one dent, straps hanging |
| `items/gear-helm.jpg` | Tempered Helm | open-faced steel helm, hammered, padded liner visible |
| `items/gear-trinket.jpg` | Warded Charm | small iron charm on a cord, scratched ward marks |

### Loot — weapons and helms

| File | Name | Subject |
|---|---|---|
| `items/warren-fang.jpg` | Warren Fang | crude dagger ground from a rat's tooth, wrapped hilt |
| `items/wolf-fang-cleaver.jpg` | Wolf-Fang Cleaver | broad cleaver with wolf teeth set along the spine |
| `items/roadkeepers-blade.jpg` | Roadkeeper's Blade | road-worn short sword, notched edge, guard stamped with a mile mark |
| `items/vaultsteel-dirk.jpg` | Vaultsteel Dirk | narrow dirk of pale steel, wire-wrapped grip |
| `items/bridgewardens-hammer.jpg` | Bridgewarden's Hammer | iron sledge with a bridge-plank haft |
| `items/cryptsteel-blade.jpg` | Cryptsteel Blade | long blade of cold blue steel, verdigris in the fuller |
| `items/wailing-pick.jpg` | Wailing Pick | mining pick with a war-hook welded on, ore dust |
| `items/grave-silver-dirk.jpg` | Grave-Silver Dirk | thin dirk of tarnished grave-silver |
| `items/kilnforged-edge.jpg` | Kilnforged Edge | blade still hot from the kiln, black scale on the steel |
| `items/salt-etched-blade.jpg` | Salt-Etched Blade | curved blade eaten by salt, faint etched pattern |
| `items/ashfall-greatblade.jpg` | Ashfall Greatblade | two-handed blade grey with ash, long grip |
| `items/citadel-gateblade.jpg` | Citadel Gateblade | greatsword of obsidian-edged steel, gate motif at the ricasso |
| `items/coven-hexblade.jpg` | Coven Hexblade | curved blade with hex marks, two grips, ring pommel |
| `items/worldbreaker.jpg` | Worldbreaker | colossal maul, obsidian head, gold cracks through it |
| `items/cinder-road-blade.jpg` | Cinder Road Blade | road blade pitted by cinder, worn guard |
| `items/reclaimed-blade.jpg` | Reclaimed Blade | blade reforged from a broken one, seam visible down the centre |
| `items/galley-rail-helm.jpg` | Galley-Rail Helm | helm hammered from a galley rail, salt-pitted |
| `items/plague-mask.jpg` | Plague-Mask | leather plague mask with glass eyes, straps hanging |
| `items/veilwalkers-crown.jpg` | Veilwalker's Crown | thin circlet of dark metal with a veil attached |
| `items/tyrants-obsidian-crown.jpg` | Tyrant's Obsidian Crown | crown of black glass with gold veins |
| `items/outpost-wardens-helm.jpg` | Outpost Warden's Helm | garrison helm, lamp hook on the side |

### Loot — chest and trinket

| File | Name | Subject |
|---|---|---|
| `items/cured-pelt-vest.jpg` | Cured Pelt Vest | wolf-pelt vest, stiff with curing, bone toggles |
| `items/gilded-coffer-plate.jpg` | Gilded Coffer Plate | gold-inlaid breastplate, coffer-lid pattern |
| `items/riveted-span-plate.jpg` | Riveted Span Plate | riveted iron plate, bridge-iron grey |
| `items/tunnel-plate.jpg` | Tunnel Plate | plate scavenged from mine machinery, patched |
| `items/chapelwardens-plate.jpg` | Chapelwarden's Plate | chapel plate with a bell etched into the breast |
| `items/wardens-bulwark.jpg` | Warden's Bulwark | tomb-slab breastplate, a ward carved into the face, chipped edge |
| `items/reedwoven-mantle.jpg` | Reedwoven Mantle | mantle of woven reed and hide, fen-water stained |
| `items/tidebound-harness.jpg` | Tidebound Harness | harness of tarred rope and plate, tide-worn |
| `items/tidewrought-harness.jpg` | Tidewrought Harness | scale harness of iron and shell |
| `items/market-wardens-aegis.jpg` | Market Warden's Aegis | aegis of market iron, quarantine seal stamped in the corner |
| `items/spirebound-aegis.jpg` | Spirebound Aegis | aegis of spire stone and iron, ash in the seams |
| `items/gatewardens-bulwark.jpg` | Gatewarden's Bulwark | tower-shield plate, citadel gate motif, obsidian rivets |
| `items/covenant-shroud.jpg` | Covenant Shroud | shroud-cloak over plate, coven marks at the hem |
| `items/tyrantplate.jpg` | Tyrantplate | black plate with gold seams, scaled like a reptile |
| `items/ash-road-buckler.jpg` | Ash-Road Buckler | small ash-grey buckler, road-marked |
| `items/vestals-mantle.jpg` | Vestal's Mantle | white mantle, soot at the hem |
| `items/standard-bearers-plate.jpg` | Standard-Bearer's Plate | plate with a torn banner painted across the breast |
| `items/ratcatchers-charm.jpg` | Ratcatcher's Charm | tin charm of a rat on a wire, cheap and old |
| `items/bandits-purse.jpg` | Bandit's Purse | cut purse on a belt ring, coins spilling |
| `items/vaultwardens-key.jpg` | Vaultwarden's Key | heavy brass key with vault teeth, broken chain |
| `items/ferrymans-lantern.jpg` | Ferryman's Lantern | iron lantern, green glass, a coin in the base |
| `items/gravewardens-sigil.jpg` | Gravewarden's Sigil | stone sigil disc on a chain, grave dust in the grooves |
| `items/fenlight-charm.jpg` | Fenlight Charm | glass vial of marsh light on a cord |
| `items/miners-last-lamp.jpg` | Miner's Last Lamp | brass miner's lamp, soot-black glass, still lit |
| `items/idol-of-the-deep.jpg` | Idol of the Deep | small drowned idol, coral and green stone |
| `items/glassblowers-ring.jpg` | Glassblower's Ring | glass ring with a bubble inside, scorched band |
| `items/oros-iron-will.jpg` | Oros' Iron Will | iron knot on a chain, worn smooth |
| `items/twin-sigil.jpg` | Twin Sigil | two interlocked sigils on one chain |
| `items/obsidian-heart.jpg` | Obsidian Heart | fist-sized obsidian heart on a chain, warm glow inside |
| `items/abbey-bell.jpg` | Abbey Bell | hand bell of the abbey, silver, clapper wrapped in cloth |
| `items/broken-standard.jpg` | The Broken Standard | fragment of a company banner on a broken spear |
| `items/last-light.jpg` | Last Light | small lamp on a chain, the last of its oil |

**Icon rules.** The object fills 70–85% of the square. One dominant hue per icon, so two icons in a list are told apart by colour as well as shape. A coloured glow behind the object, falling off to near-black at the edges — that is the halo in the reference, not a border. No hands, no scenes, no fine detail: at 28 px a buckle and a scratch are the same pixel.

**"Icon" is the word that puts a frame around it.** Three rounds of evidence. "Game inventory icon" produced discs, a blue ring, a studio sweep and a white background. Rewriting it as a still life produced five clean dark fields. Adding "2000s RTS concept art" back in brought the white background and the black disc with it on the first re-probe, while the portrait and location blocks — which never say "icon" — stayed clean. Items are now a still life with the cartoon properties carried by the adjectives, not by the genre noun. Everything is stated positively: a negative ("no vignette") is not a thing Gemini's API reads.

---

## 7. Sizes, names, formats

| Class | Generate | Export | Notes |
|---|---|---|---|
| Portraits | 825×1024 (measured) | ship as-is, or 512×640 | 4:5. Faces stay legible when cropped to a 40 px circle. |
| Locations | 1536×864 | 1280×720 | 16:9. Also generate a centre crop safe at 1:1. |
| Items | 512×512 | 256×256 | Square. Downscaled from 1024 if the model allows. |

**Format: JPEG.** The same style comes back in two formats depending on how you ask. The Gemini app returns JPEG, 118–148 KB at 825×1024, which ships as-is. The Gemini API returns PNG, ~1.4 MB at 1344×768 — six times the weight for an image the UI shows at card size. Run `npm run art:tidy` on API output: it converts to JPEG q85 and moves the original to `art/raw/`. Measured on the first 34 files: 50.9 MB → 9.2 MB. The lookup accepts `.jpg`, `.jpeg`, `.png` or `.webp`, so the extension never reaches code.

Filename is the content id, lower-kebab, no suffix:

```
public/art/roles/bulwark.jpg
public/art/places/emberwood.jpg
public/art/items/warren-fang.jpg
public/art/items/gear-weapon.jpg
```

### Where files go

| Stage | Path | In git |
|---|---|---|
| Model output | `art/raw/<folder>/<id>.png` | no — `art/raw/` is ignored |
| Shipped image | `public/art/<folder>/<id>.jpg` | yes |
| The list | `art/prompts.csv`, `art/prompts-mj.txt` | yes |

Generate into `art/raw/` and keep the originals: they are the only copy you can re-crop from. Export the downscaled file into `public/art/`, which Vite serves at `/art/…` and the lookup expects. `npm run art:check` prints `art 12/98`, so you always know what is still missing.

No conversion step. Download from the model straight into `public/art/<folder>/`, rename to the id if the tool added a suffix (`Gemini_Generated_Image_ab12cd.jpg` → `bulwark.jpg`).

Only downscale if the roster feels heavy: 98 images at ~130 KB is ~13 MB, fine for a local build and too much for a cold first paint. Then use Squoosh in a browser, or `npx -y @squoosh/cli`, and keep the original in `art/raw/`.

`sips` cannot write WebP on this machine (it lists the format, then fails with "Can't write format"), so do not plan a WebP step here. If batch conversion ever becomes routine, `sharp` as a devDependency is the fix — that needs an ADR, because it is a dependency for an asset pipeline, not for the game.

The ids come from [content.ts](../src/sim/content/content.ts), [market.ts](../src/sim/content/market.ts) and [roles.ts](../src/sim/content/roles.ts). An item takes its drop's name, lower-kebab, with a leading `The` dropped: `Warden's Bulwark` is `wardens-bulwark.jpg`, `The Broken Standard` is `broken-standard.jpg`. Apostrophes are deleted, not transliterated. **If a content id changes, the file name changes with it.** A lookup that misses falls back to the item name as text, so a missing file costs a blank box, not a broken screen.

---

## 8. Check before wiring

Run these on every image before it goes in `public/art/`.

- [ ] Squint test at 32 px: the silhouette still reads.
- [ ] Contrast check at 28 px: the subject is clearly brighter than its own background. The ground may be near-black — the reference's is — but the object must not be.
- [ ] Hue check: each icon has one dominant saturated colour. Two greys in one list means the set drifted.
- [ ] No text, no letters, no watermark, no signature.
- [ ] Background is the same flat near-black as the rest of the set — no disc, no ring, no studio sweep, no white. A different background is a regenerate, not a crop.
- [ ] The palette sits next to `#10141a` without clashing. Put it on the panel colour to check.
- [ ] One subject. A second object is a bug.
- [ ] Hands: correct count, correct fingers, otherwise crop them out.
- [ ] Nothing modern: zippers, cigarettes, printed text, studio lighting. "One hand still smoking" produced a woman in a leather jacket holding a cigarette — say "an ember in her palm" instead.
- [ ] No signature. The model signs the bottom corner on some images even with `no signature` in the prompt; a 2% crop off the bottom removes it.
- [ ] Portrait: eyes on the upper third, shoulders inside the frame.
- [ ] Location: left third quiet enough for a title overlay.
- [ ] File is JPEG or WebP, under 200 KB for a portrait, 300 KB for a location, 60 KB for an icon.

---

## 9. Order of work

Do not generate 98 images before testing the style. Three decide whether the other 95 are worth generating.

| Phase | Images | Why first |
|---|---|---|
| 1. Probe | 3 | One icon, one portrait, one location — `--only salve,evoker,emberwood --force`. Look at them at 28 px before anything else. |
| 2. Prove | 8 | The 8 role portraits at one seed. This is the set that either coheres or does not. |
| 3. Cover the loop | 27 | 8 roles + 12 locations (farms, missions, first three dungeons) + 7 market icons. Now every screen has art. |
| 4. Complete | 64 | Remaining 18 locations, 46 loot icons. |
| 5. Optional | 3 | Raid bosses as portraits, if the raid hub earns the space. |

**Regenerating an existing set.** `--force` rewrites the files in place and keeps the previous version in `art/raw/`. Do the probe first: 3 calls now is cheaper than 98 calls twice.

Cost: unmeasured. A hosted model at 4 images per prompt for 98 assets is a few hundred generations; re-rolls for consistency are the real cost, not the count.

---

## 10. Tool notes

The blocks are model-agnostic. These are the settings that matter per tool.

**Midjourney**

```
<block>, <subject> --ar 4:5 --style raw --s 50 --no text, letters, watermark, frame, border
```

Add `--sref <url of your best image>` to every later batch. Seed via `--seed <n>`; note it in `seeds.txt`.

**Flux / SDXL / ComfyUI**

- Guidance 4–6 for Flux, 6–7 for SDXL. Higher bakes in contrast and the set drifts.
- Paste the negative prompt verbatim.
- One seed per family, then img2img at 0.35–0.5 denoise for variants.

**Gemini / Imagen** (measured 2026-11-01)

A 4:5 request came back **825×1024**, 118–148 KB per image, JPEG, no alpha channel. That is the right size for a portrait and the wrong size for nothing. Ask for one image per message. "Keep the same style, change only the subject" holds the look — and also holds the face, which is why the identity line goes first and changes every time.

**DALL·E / ChatGPT images**

No negative prompt field. Say "no text, no border, no frame" in the block and check the output. Generate one at a time, then ask for "the same style, same lighting, change only the subject" — consistency comes from the conversation, not the prompt.

---

## 11. Not in this pack

Rejected for now, with the reason:

- **Guild crests.** The name is player text; art cannot follow it. A generated letterform in the UI is cheaper and always correct.
- **Battle scenes.** The sim resolves a pull in one function with no positions, so a picture of a fight would show something the game never computes.
- **Mob portraits.** 60+ mobs, shown as a name in a report line. No screen has room.
- **Trait icons.** 20 traits, each already a one-line rule. Text is faster to read.
- **Title screen art.** Worth one image, but it needs the logo lockup first. Not a file this pack can name.

---

## 12. Automate it

`npm run art:generate` reads `art/prompts.csv`, calls an image API, and writes `public/art/<folder>/<id>.<ext>`. No dependency: Node 24 has `fetch`, and the script is ~200 lines.

```bash
export GEMINI_API_KEY=…
npm run art:generate -- --dry-run --limit 1      # print the request, send nothing
npm run art:generate -- --folder roles           # the 8 portraits
npm run art:generate -- --folder places --concurrency 3
```

| Flag | Default | What it does |
|---|---|---|
| `--provider` | `gemini` | `gemini` or `openai`. Also `ART_PROVIDER`. |
| `--model` | `gemini-2.5-flash-image` | `gpt-image-1` on OpenAI. Also `ART_MODEL`. |
| `--folder` | all | `roles`, `places` or `items`. |
| `--only` | all | Comma-separated ids: `--only emberwood,warrens`. |
| `--limit` | no limit | Stop after N images. Use it for the first paid call. |
| `--concurrency` | 2 | Requests in flight. Raise it slowly; 429s cost more than they save. |
| `--force` | off | Regenerate files that already exist. |
| `--dry-run` | off | Print the request instead of sending it. |
| `--no-aspect` | off | Drop `imageConfig.aspectRatio` if the model rejects it. |

**It is idempotent.** A file that exists is skipped, so a run that dies at image 40 resumes at 41 for the price of the remaining 58. That is also why `--force` exists: without it you cannot re-roll one bad portrait.

**Keys never touch the repo.** `GEMINI_API_KEY` or `OPENAI_API_KEY` from the environment; `.env` is ignored if you prefer `node --env-file=.env`. The dry run redacts them.

**Aspect ratios** are mapped per folder: portraits `4:5`, locations `16:9`, items `1:1`. OpenAI has no 4:5 size, so it gets `1024x1536`.

**Untested against a live API.** There is no key in this environment, so the request and response shapes come from the docs, not from a run. The two places a first call can fail:

- `generationConfig.imageConfig` — only newer image models accept it. Use `--no-aspect` if you get a 400 about an unknown field.
- Response parsing — Gemini is scanned for `inlineData` in `candidates[0].content.parts`; OpenAI for `data[0].b64_json`. Both throw with the first 240 characters of the response rather than writing a corrupt file.

Run `--dry-run --limit 1` and compare it to the current API reference before the first real call. Cost is unmeasured: one image per request, 98 requests.

**Then shrink it.** `npm run art:tidy` converts the PNG output to JPEG and parks the original in `art/raw/` (macOS only — it calls `sips`). Without it, 30 locations is 45 MB in the repo.

**No credits: the web app.** The Gemini web version produces the same style and returns JPEG. Save each file as `public/art/<folder>/<id>.jpg`, taking the id from `art/prompts.csv`. Three things bite:

- The download is called `Gemini_Generated_Image_<hash>.jpg`. Renaming is the whole job, and a file with the wrong name is invisible to the game — `art:check` now lists any file whose name is not a content id.
- There is no batch. 98 images is 98 downloads.
- Saving a new file next to an old one with a different extension leaves two files for one id, and the lookup serves whichever it tries first — usually the older picture. `art:check` fails on that too.

**Then look at the result.** `npm run art:check` prints `art N/98`, and it counts files, not judgements — a white poster background still counts as present.

**Re-rolling one image.** Two commands, by id, in any folder:

```bash
npm run art:generate -- --only bulwark --force
npm run art:generate -- --only toll-house,wailing-mines,last-outpost --force
```

`--force` rewrites the file and moves the previous version into `art/raw/`. Judge the new one at 28 px before moving on.

**White at the edge is a re-roll, not a crop.** Five of the first ninety-eight came back with white at the edges, in two shapes: a thin bar along one edge (`wailing-mines`), or the subject painted on a white poster with margins and a ragged painted edge (`bulwark`). Cropping was tried on both and rejected — 3% left the poster's sides and cut the shield, 4% still showed white on both. The margin is 4–8%, more than the composition can spare. Re-roll with `--force`.

**No credits: the web app.** The Gemini web version produces the same style and returns JPEG. Save each file as `public/art/<folder>/<id>.jpg`, taking the id from `art/prompts.csv`. Three things bite:

- The download is called `Gemini_Generated_Image_<hash>.jpg`. Renaming is the whole job, and a file with the wrong name is invisible to the game — `art:check` now lists any file whose name is not a content id.
- There is no batch. 98 images is 98 downloads.
- Saving a new file next to an old one with a different extension leaves two files for one id, and the lookup serves whichever it tries first — usually the older picture. `art:check` fails on that too.

**Then look at the result.** The pack's QA checklist (§8) still applies — the script does not judge whether a picture is good, only whether it exists.
