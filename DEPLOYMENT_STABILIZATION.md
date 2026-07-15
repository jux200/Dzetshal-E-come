# Dzetshal Release Candidate — Deployment Steps

## 1. Supabase
Run `supabase/DEPLOY_FINAL_STABILIZATION.sql` in the Supabase SQL Editor.
Then test `track_customer_order` with a real order number and the same email or phone used at checkout.

## 2. Images
This ZIP contains the two brand-theme images. Your full historical perfume image library must remain in `/img` with exact filename capitalization. Do not deploy an empty or partial `/img` folder.
Products uploaded through the admin may use Supabase Storage and do not require a Git push.

## 3. Vercel
Deploy the contents of `dzetshal_db_driven_app` as the project root.
Confirm that `vercel.json`, `robots.txt`, `sitemap.xml`, `_headers`, `index.html`, `track-order.html`, `admin/`, `assets/`, `img/`, and `supabase/` are present.

## 4. Domain
Add `dzetshalrwanda.com` and `www.dzetshalrwanda.com` in Vercel. Set the preferred production domain and redirect the other hostname to it.

## 5. Required launch tests
- Browse and search products on desktop and mobile.
- Open a product, change gallery thumbnails, and test zoom.
- Add items to cart and complete Email and WhatsApp checkout.
- Confirm the order is created once in Supabase.
- Confirm the success popup contains Track Your Order.
- Track the order by email and by phone.
- Change order/payment/delivery status in admin and confirm tracking updates.
- Cancel an order and verify it leaves Dispatch and is excluded from revenue.
- Add/edit a product and upload an image through Admin.
- Test the Green and Peach themes.

## 6. Known external console messages
`runtime.lastError`, `extInfoFrame.js`, and `ERR_BLOCKED_BY_CLIENT` are usually caused by browser extensions or ad blockers. Test once in an Incognito window with extensions disabled before treating them as website errors.
