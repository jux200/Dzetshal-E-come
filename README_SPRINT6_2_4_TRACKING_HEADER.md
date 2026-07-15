# Sprint 6.2.4 – Tracking and Header Patch

## Changes
- Reduced the Dzetshal wordmark size on desktop and mobile.
- Added a full-width **Track Your Order** button to the order success dialog.
- The success button pre-fills the customer order number.
- Rebuilt the public tracking RPC to match emails case-insensitively and Rwanda phone numbers across formats such as `078...`, `+25078...`, and spaced numbers.
- Tracking returns only customer-safe order information.

## Required Supabase step
Run `supabase/sprint6_2_tracking_brand_theme.sql` in the Supabase SQL Editor.

## Test
1. Place an order.
2. Click **Track Your Order** in the success dialog.
3. Enter the same email or phone used at checkout.
4. Confirm the tracking timeline appears.
