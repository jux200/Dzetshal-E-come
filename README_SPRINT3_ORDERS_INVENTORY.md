# Sprint 3: Orders & Inventory Management

This version adds operational tools for Dzetshal's admin dashboard.

## Before testing
Run this file in Supabase SQL Editor:

`supabase/sprint3_orders_inventory.sql`

## Added
- Professional order table with search, status, payment and date filters
- Order details modal
- Order status timeline
- One-click status progression
- Admin order notes
- Printable invoice view
- CSV order export
- Inventory page
- Inventory history table
- Low-stock and out-of-stock widgets
- CSV inventory export
- Stock adjustment logging from Products page
- Stock reduction trigger when `order_items` are created

## Test checklist
1. Open `admin/orders.html`.
2. Open an order with View.
3. Change its status using the timeline buttons.
4. Add an admin note.
5. Print invoice.
6. Export orders CSV.
7. Open `admin/inventory.html`.
8. Change product stock from `admin/products.html` and confirm the movement appears in Inventory.
9. Place a checkout order and confirm stock decreases through `order_items`.
