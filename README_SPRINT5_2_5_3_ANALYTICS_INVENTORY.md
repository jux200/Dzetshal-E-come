
# Dzetshal Sprint 5.2 + 5.3

This update adds real Smart Analytics and Inventory Intelligence.

## Run this SQL first

Open Supabase SQL Editor and run:

`supabase/sprint5_2_5_3_analytics_inventory.sql`

## New / upgraded admin pages

- `admin/analytics.html` - smart analytics with date filters, KPIs, charts, top products, top brands, top customers, CSV export.
- `admin/ai-insights.html` - rule-based AI business insights using Supabase order, product, and inventory data.
- `admin/reports.html` - CSV exports for orders, inventory, and customers.
- `admin/inventory.html` - added inventory intelligence cards.

## Notes

The insights are data-driven and work without an external AI API. Later, Sprint 5.4 can connect this to OpenAI or another AI API for natural-language summaries.
