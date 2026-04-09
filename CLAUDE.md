# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

工位管理系统 (Workshop Station Management System) - A Vue 3 SPA for managing workshop station occupancy with real-time cloud sync via Supabase.

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (port 5174, accessible on network)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This project uses **GitHub → Cloudflare Pages** auto-deployment. After pushing to GitHub main branch, Cloudflare automatically builds and deploys in 1-2 minutes.

**Do NOT manually push dist files** - only commit source code changes.

## Architecture

### Tech Stack
- Vue 3 (Composition API with `<script setup>`)
- Vite for build tooling
- Supabase for cloud database + real-time sync
- Scoped CSS (no utility frameworks)

### Data Flow

```
User Action → Update Local State → Supabase upsert/update
                                                    ↓
                              Supabase Real-time Subscription
                                                    ↓
                                    Other Clients Receive Update
```

**Key pattern**: Optimistic updates - update local state immediately, then sync to Supabase. Real-time subscription keeps all clients in sync without polling.

### Station Grid Structure

The workshop has a fixed grid layout:
- **Columns**: A-N (14 columns total)
- **Rows**: 1-4 (but columns A-C only have rows 1-3)
- **Heavy Zone**: Columns A-C (3×3 = 9 stations)
- **Light Zone**: Columns D-N (11×4 = 44 stations)

Station IDs are `${column}${row}` (e.g., "A1", "D4"). Missing cells (A4, B4, C4) render as empty placeholders.

### Supabase Schema

Table: `workshop_stations`
```sql
id (TEXT, PK)     -- Station ID like "A1", "B2", etc.
zone (TEXT)       -- "heavy" or "light"
data (JSONB)      -- { model, machineNo, unitNo, updatedAt }
updated_at        -- Auto-managed by Supabase
```

The `data` field stores station information as JSONB. When cleared, `data` is set to `null`.

### Responsive Design

- **Desktop**: Full grid visible (14 columns)
- **Mobile**: Horizontal scroll with sticky column/row headers
- Critical CSS is in `<style scoped>` blocks in App.vue
- Mobile breakpoint: 768px

### Key Components (Single File Architecture)

All logic is in `src/App.vue`:
- `stations` ref - Local cache of all station data
- `generateStations()` - Creates initial empty grid structure
- `loadFromSupabase()` - Fetches data on mount
- `subscribeToUpdates()` - Sets up real-time Postgres changes listener
- `saveStation()` / `clearStation()` - Write operations with optimistic updates

## Important Notes

- **Supabase credentials** are in `src/supabase.js` - do NOT commit service_role key
- **No build step needed** for Supabase schema changes - use Supabase SQL Editor directly
- **Real-time sync** means you don't need to implement polling or refresh logic
- **Station grid is hardcoded** - to add/remove stations, modify `generateStations()`
