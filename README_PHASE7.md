# Dzetshal Phase 7 Admin Dashboard

This package keeps your customer storefront as `index.html` and adds a new admin dashboard in `/admin`.

## Setup
1. Go to Supabase SQL Editor.
2. Run `supabase/phase7_admin_policies.sql`.
3. In Supabase Authentication, make sure Email provider is enabled.
4. Add/login with the admin user: `dzetshalweb@gmail.com`.
5. Open `admin/login.html` in your browser.

## Admin features
- Login with Supabase Auth
- Dashboard revenue/order/product stats
- View and update orders
- View, add, edit, hide/show products
- Update stock and price
- Upload product images to Supabase Storage
- View customers generated from order history

## Important
Only the anon key is included in browser files. Never add your Supabase service-role key to frontend code.
