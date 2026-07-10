# Sprint 6.1 — Cancelled order rules

Run `supabase/sprint6_1_cancelled_order_rules.sql` in Supabase SQL Editor.

This update:
- excludes cancelled/refunded orders from revenue and sales intelligence;
- removes terminal orders from Dispatch;
- restores stock once when an order is cancelled/refunded;
- prevents cancelled/refunded orders from being reopened;
- keeps cancelled orders visible in the general Orders list and status charts.
