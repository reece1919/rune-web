# RUNE — public website

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
