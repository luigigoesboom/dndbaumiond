---
version: 1
slug: "src-sheet-charactersheet-tsx"
primary_target: "src/sheet/CharacterSheet.tsx"
related_targets: ["src/CharacterList.tsx","src/App.tsx"]
---

## Scope

The character sheet app: character list + character sheet (all sections, spell browser, roll log). Mode: Operate.

## Audience & task

A player from Domen's group, mid-session at the table (laptop or phone), glancing for a bonus, rolling it, tracking HP / slots / conditions; between sessions, levelling and picking spells. Constraints: PRODUCT.md (both rulesets, everything editable, phone = laptop).

## Direction contract

THESIS: The category standard, played straight: a D&D Beyond-style sheet in dark mode, executed at full craft. The user took the canon exit after rejecting the Blue-Line Module; familiarity is the point.

OWN-WORLD: Near-black charcoal ground, dark panels framed in D&D Beyond red with an inner hairline, condensed uppercase labels, big light figures. Ability boxes with the score in an oval tab; AC in a drawn shield; HP box with green Heal / red Damage. Colour carries meaning: red frames and damage, green healing, white proficiency dots, coloured roll results.

STORY: The player recognises the layout instantly from D&D Beyond, finds any number at a glance, taps it to roll, and manages actions, spells and gear in one tabbed panel.

FIRST VIEWPORT: Dark top bar (monogram, name, race/class/level, Manage, Short rest, Long rest). Row: six ability boxes, Proficiency, Speed, Heroic Inspiration, Hit Points. Below: left column Saving Throws, Senses, Proficiencies; middle Skills table; right Initiative, Armor Class shield, Defenses & Conditions, then tabs Actions / Spells / Inventory / Features & Traits / Background. Floating red d20 bottom-left opens the roll log; each roll toasts.

FORM: Canon (category standard: D&D Beyond character sheet, dark). Seed key 916b18a1 (canon taken on second round, user steer: "more colorful like dnd beyond, dark theme").

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment

Tapping a bonus: a roll toast pops from the d20 button with the total in big type, crits in green or red.

## Unresolved

Login / per-player ownership (later). Portrait image (monogram tile stands in until an upload feature exists).
