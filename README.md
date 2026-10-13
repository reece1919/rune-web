# RUNE — public website

## Todoist / RUNE quests (October 2026)

The published standalone website has a collapsible parchment-style Todoist drawer, showing open tasks labeled `rune`. It uses ORBIT's OAuth bridge and the shared MFA session; it never accesses or alters RUNE character records. The public website favicon now uses RUNE's parchment seal emblem.

**Build continuity:** The Todoist drawer, stylesheet, and parchment favicon are now also included in the private `reece1919/rune` standalone source (`standalone/index.html` and `standalone/public/`), so they can be reproduced by future sanitized builds. The original ChatGPT Sites deployment and character saves are unchanged.

This repository contains **only the compiled, sanitized website** for RUNE, the multi-character tabletop RPG dashboard.

**Private application source:** [reece1919/rune](https://github.com/reece1919/rune) (access restricted)

## Hosting

- Intended GitHub Pages URL: https://reece1919.github.io/rune-web/
- Page source: `main` branch, `/(root)`
- Authentication: the same Supabase account used by GAIA and ORBIT
- Saves: per-account RUNE-only table `public.rune_workspaces` with Row Level Security
- D&D Beyond import: authenticated Supabase Edge Function `rune-ddb`

The website files are public, but **characters, campaign notes, and private journal data are not stored in this repository**. Never commit backups, passwords, secret keys or the original private source here.

Publishing to this repository does not migrate Milo's existing saved data from ChatGPT Sites. Export and import character backups deliberately, then verify in the standalone website before switching it to your primary journal.
