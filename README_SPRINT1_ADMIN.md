# Dzetshal Sprint 1 Admin Upgrade

This package upgrades the admin dashboard UI without changing the customer storefront.

## Added
- Professional sidebar with grouped navigation
- Dashboard KPI cards: revenue, orders, products, customers, average order, low stock, out of stock
- Chart.js revenue chart with fallback bars
- New Analytics page
- Notifications dropdown for pending orders and low stock
- Dark/light mode toggle
- Improved mobile sidebar behavior
- Better tables, product image previews, and inventory badges

## Test
1. Open `admin/login.html`.
2. Login with the Supabase admin user.
3. Open Dashboard, Analytics, Products, Orders, Customers.
4. Test mobile width and dark mode.
5. Confirm Supabase data loads correctly.
