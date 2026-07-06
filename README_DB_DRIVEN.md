# Dzetshal DB-driven update

This package makes the storefront and admin product forms database-driven.

## What changed
- Storefront products load from Supabase as the main source of truth.
- Brand, type, and gender filters are generated from Supabase products.
- Stock and price come from Supabase.
- Admin add/edit product form now uses matching brand/type/gender options.
- Admin image upload still uses Supabase Storage bucket: `products`.

## Supabase step
Run this file in Supabase SQL Editor if needed:

`supabase/db_driven_products_policies.sql`

Then upload the full project folder to your hosting.
