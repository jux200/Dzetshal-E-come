# SQL Fix Included

The Supabase error happened because an older `store_settings` table existed without an `id` column.

This package fixes `supabase/sprint6_practical_launch.sql` so it is defensive:

- Adds `id` to `store_settings` if missing.
- Adds `id` to `theme_settings` if missing.
- Creates primary keys safely.
- Preserves existing settings when possible.
- Inserts the required `main` settings row without failing.

Run this file in Supabase SQL Editor:

```text
supabase/sprint6_practical_launch.sql
```

A migration copy is also available at:

```text
supabase/migrations/006_practical_launch_settings.sql
```
