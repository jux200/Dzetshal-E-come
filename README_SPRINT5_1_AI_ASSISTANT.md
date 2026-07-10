# Sprint 5.1 – AI Product Assistant + Branding Update

## Included
- Updated Dzetshal storefront logo layout with round emblem + text.
- `Dzetshal` text styled with HolidayFree fallback stack.
- `Jardin de beauté` styled with Mont Bold/Montserrat fallback.
- About section headline updated to `Dzetshal — Redefining Luxury Fragrance in Africa`.
- New admin page: `admin/ai-assistant.html`.
- New script: `admin/js/ai-assistant.js`.
- Optional SQL: `supabase/sprint5_1_ai_assistant.sql`.

## Before testing
Run `supabase/sprint5_1_ai_assistant.sql` in Supabase if you want the extra SEO/notes columns and generation log table.

## Test
1. Open `index.html` and check desktop/mobile logo.
2. Open admin, login, and click `AI Assistant`.
3. Select a product and generate content.
4. Use `Copy` or `Insert into Product Description`.

## Note about fonts
The CSS uses `HolidayFree` and `Mont Bold` by name with safe fallbacks. If the browser does not have those fonts installed or loaded from your own licensed font files, it will use the fallback fonts.
