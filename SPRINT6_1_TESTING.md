# Sprint 6.1 testing checklist

1. Run `supabase/sprint6_1_cancelled_order_rules.sql`.
2. Refresh the admin app.
3. Open a non-cancelled test order and record the current product stock.
4. Change the order to Cancelled.
5. Confirm:
   - product stock increases by the ordered quantity once;
   - Dispatch no longer shows the order;
   - Dashboard/Analytics/AI Insights no longer count it as revenue;
   - the order remains visible in Orders with a Cancelled badge;
   - attempting to reopen it returns an error.
6. Refresh and edit the cancelled order again. Stock must not be restored a second time.

Revenue is now recognized only for orders that are paid or delivered and are not cancelled/refunded.
