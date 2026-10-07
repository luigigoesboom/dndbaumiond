# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Domen and his D&D play group. Each player keeps their own 5e character(s) and opens the sheet **during sessions at the table** and while prepping between sessions. Used **equally on laptops and on phones/tablets** — so both a full desktop sheet and a genuinely usable touch layout are first-class.

The job mid-session: glance up a bonus fast, roll it, track HP / spell slots / conditions as the fight unfolds, without losing your place in the conversation. Between sessions: level up, pick spells, edit inventory and story.

## Product Purpose

A self-hosted, D&D Beyond-style 5e character sheet. Characters are stored in SQLite on a host the group controls. Success: players stop reaching for paper sheets or D&D Beyond during a session because this is faster to read and faster to act on.

## Positioning

Self-hosted and owned by the group: no account, no paywall, no marketplace. Both the 2014 and the 2024 5e SRD rulesets are built in and selectable per character; content outside the SRD is entered by hand as custom spells / items.

## Operating Context

- At the table: dim-to-normal room light, laptop or phone propped beside dice, character sheet glanced at between other players' turns.
- Rolling: the app rolls dice on click (d20 + bonus, damage dice), with advantage/disadvantage and a visible roll log; physical dice remain an option.
- Several players may open the same host; there is no login yet (open decision for later).

## Capabilities and Constraints

- Stack: Vite + React + TypeScript frontend, Express 5 + built-in `node:sqlite` backend. No new runtime dependencies without asking; package installs are run by the user, not the assistant.
- Character data is one JSON document per character; derived stats (modifiers, proficiency, skill/save/attack bonuses, spell DC) are always computed, never stored.
- SRD reference data (5e-bits/5e-database, SRD 5.1 and 5.2 under CC-BY-4.0) lives in `srd/raw/2014` and `srd/raw/2024`; attribution must stay visible in the app.
- Terminology follows the selected ruleset: 2014 says "Race", 2024 says "Species".

## Brand Commitments

Name: **DnD Baumiond**. No other brand assets exist yet.

**Visual direction (user decision, 2026-10-07):** sit alongside **D&D Beyond's character sheet**, in a **dark theme only**. Familiar is the goal: dark charcoal surfaces, red-framed boxes, ability boxes with score ovals, skills table, AC shield, tabbed Actions / Spells / Inventory panel. "More colorful" than a monochrome concept: red frames, green heal, red damage, coloured roll results. The user rejected the "Blue-Line Module" blueprint/graph-paper direction; don't bring it back.

## Evidence on Hand

None beyond the SRD data. Do not fabricate player testimonials, user counts, or official Wizards of the Coast affiliation.

## Product Principles

1. The table comes first: anything needed mid-combat is one glance or one tap away.
2. Compute, don't ask: if the rules determine a number, the sheet shows it; the player only enters choices.
3. The SRD helps, never cages: every SRD-filled field stays editable, and custom entries are first-class.
4. Same sheet, any screen: phone and laptop are equal citizens.

## Accessibility & Inclusion

Readable in dim rooms; touch targets usable on a phone at the table; keyboard-operable on desktop. Target WCAG 2.2 AA (best effort, no named owner).
