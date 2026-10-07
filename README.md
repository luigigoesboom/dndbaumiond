# DnD Baumiond

A self-hosted, D&D Beyond–style 5e character sheet for a play group. React + Vite frontend,
Express API, SQLite storage, the 5e SRD (2014 **and** 2024 rules) built in.

## Requirements

- Node.js **22.18+** (uses the built-in `node:sqlite` module and native TypeScript type-stripping — no native build step, no `tsx`).

## Getting started

```bash
npm install
npm run dev
```

- Web: http://localhost:5173 (Vite, proxies `/api` → the API)
- API: http://localhost:3001 (override with `API_PORT`)
- Database: `data/dnd.sqlite` (created on first run; override with `DB_PATH`)

Tests: `npm test` (Node's built-in test runner, no extra packages) and `npm run typecheck`.

Production-ish: `npm run build && npm start` — the API serves `dist/` on the API port.

## What the sheet does

- **SRD pickers** (Manage): class, race/species (+ subrace/lineage), background. Picking fills in
  saving throws, hit die, spellcasting ability, spell-slot table, speed, race ability bonuses (2014), languages,
  armor/weapon proficiencies and background skills. Changing race or background swaps out what the old one
  granted; your own bonuses (feats, ASIs) live in a separate row the pickers never touch. Everything stays editable; "Custom…" for homebrew.
- **Ruleset per character**: 2014 or 2024 SRD; terminology follows it (Race vs Species).
- **Click to roll**: every bonus (checks, saves, skills, initiative, attacks, damage, spell attack, hit dice).
  Adv/Dis (next to the d20 button) applies to the next d20 only; tap the d20 for the roll history.
- **Spells**: browse the SRD list (filtered to your class), add, prepare, cast (spends a slot), or type in
  custom spells. Slots auto-fill from the class table; "Adjust slot counts" for anything else.
- **Tracking**: HP with damage/heal (temp HP first), hit dice, death saves, 15 SRD conditions with rules
  text, exhaustion, inspiration, short and long rest (2014: half your hit dice back; 2024: all).
- Equipment with coins and carrying capacity; proficiencies & languages; class/race/background features
  derived from the SRD; personality, appearance, notes.
- **Custom classes** (My Characters → Custom classes): homebrew or classes from books you own, entered as
  JSON from a template (hit die, saves, spellcasting, slot table, features + descriptions per level,
  limited-use resources, class spells). Stored in SQLite, shared by the whole group, and listed under
  "Your classes" in the class picker. The app ships no third-party content; you type in your own.
- **Custom spells** (My Characters → Custom spells): spell collections as JSON (one per book works well),
  each spell tagged with the classes that can learn it (empty = everyone). They appear in the spell browser
  with a source tag.
- **Limited use** trackers (Actions tab): class resources sync with level; add your own for items/feats.
  Short rest ("Finish short rest") and long rest recharge them.
- **Companions** tab: tamed monsters, pets, familiars, steeds with AC, HP, speed, abilities and attacks to roll.
- **Safe saving**: autosave with one request in flight; if the sheet was changed in another tab or by another
  player, saving pauses and a banner offers "Reload theirs" or "Keep mine" instead of silently overwriting.
- D&D Beyond-style dark layout: ability boxes, saves/senses/skills columns, AC shield, tabbed
  Actions / Spells / Inventory / Features & Traits / Background / Notes, floating d20 with roll toasts.

## Layout

```
shared/              Code used by both client and server
  character.ts         Character document, defaults, normalizeCharacter() (validates every save)
  rules.ts             Modifiers, proficiency, skills, saves, spell DC, HP, rests (derived, never stored)
  srd.ts / srdApply.ts SRD catalog types; applying class/race/background picks
  customClass.ts       Custom class JSON format, template, validation
  customSpells.ts      Spell collection JSON format, template, validation
  dice.ts              Dice notation parser + crypto-random roller
  id.ts / validate.ts  newId() (works over plain-http LAN), small validation helpers
server/
  index.ts             Express app; http.ts: id parsing + error handler
  db.ts                SQLite connection + migrations (PRAGMA user_version)
  characterRepo.ts     Characters (versioned saves); routes.ts: /api/characters
  jsonLibrary.ts       Generic store + routes for user-entered JSON documents
  libraries.ts         The two libraries (custom classes, spell collections); libraryRoutes.ts mounts them
  srd.ts / srdRoutes.ts  Reshape srd/raw into catalogs; serve them with custom content merged in
src/
  App.tsx              Hash routing (#/character/:id, #/classes, #/spells)
  CharacterList.tsx    "My Characters"
  JsonLibraryPage.tsx  Custom classes / Custom spells pages (JSON editor)
  api.ts / srd.ts      API client; cached SRD catalog hooks
  roll/                Roll context (dice state) + floating d20 / roll log
  sheet/               The character sheet: header + drawers, boxes, tabs, useCharacterDoc (load/autosave)
scripts/dev.ts       Runs API + Vite together
tests/               node:test suites for rules, dice, normalization, SRD picks, custom content
srd/raw/2014|2024    Raw SRD JSON from 5e-bits/5e-database (see srd/ATTRIBUTION.md)
public/fonts/        Barlow + Barlow Condensed (OFL)
```

## Data model

One row per character; the whole sheet is a JSON document in `characters.data`.
`name`, `race`, `class_name`, `level` are SQLite **generated columns** extracted from the JSON.
SRD reference data is not stored in SQLite: it is read-only and served from `srd/raw`.

To add a field: extend `Character` + `defaultCharacter()` in `shared/character.ts`.
`normalizeCharacter()` fills it in for old rows, so most changes need no migration.

## API

| Method | Path                         | Notes |
|--------|------------------------------|-------|
| GET    | `/api/characters`            | list (summary columns) |
| POST   | `/api/characters`            | optional partial character |
| GET    | `/api/characters/:id`        | |
| PUT    | `/api/characters/:id`        | full character; send `X-Base-Version` to get 409 on stale saves |
| DELETE | `/api/characters/:id`        | |
| GET    | `/api/srd/:ruleset`          | classes, races/species, backgrounds, conditions, languages |
| GET    | `/api/srd/:ruleset/spells`   | full spell list (~400-500 KB), custom class + collection spells merged in |
| GET    | `/api/classes`               | custom classes |
| GET    | `/api/classes/template`      | blank class template (`?name=` optional) |
| POST   | `/api/classes`               | create; 422 with `details[]` when invalid |
| PUT    | `/api/classes/:id`           | replace |
| DELETE | `/api/classes/:id`           | |
| *      | `/api/spell-collections[...]`| same five routes as `/api/classes`, for spell collections |

## Licensing

SRD content © Wizards of the Coast, CC-BY-4.0 — see `srd/ATTRIBUTION.md`. Not affiliated with Wizards of the Coast.

## Ideas / next steps

- Multiclassing (`classes: { name, level }[]`)
- Class resources (rage, ki, sorcery points) from the SRD `class_specific` level data
- Equipment from the SRD (weapons → attacks, armor → AC)
- Schema validation with zod on the API
