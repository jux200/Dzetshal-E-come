# Dzetshal Phase 10 Final Production Package

This package is the final production-ready structure for the Dzetshal storefront and admin dashboard.

## What is included

- Customer storefront: `index.html`
- Admin dashboard: `admin/`
- Supabase SQL files: `supabase/`
- Final deployment checklist
- SEO helper files: `robots.txt`, `sitemap.xml`
- Hosting/security helper file: `_headers`

## Final steps before publishing

1. Run `supabase/phase10_final_checks.sql` in Supabase SQL Editor.
2. Upload/deploy this full folder to your hosting provider.
3. Test the storefront filters, product modal, cart, Email checkout, WhatsApp checkout, and admin dashboard.
4. Test admin product image upload.
5. Confirm order creation in the `orders` table and item creation in `order_items`.
6. Confirm stock decreases after order item creation.

## Recommended hosting

Free/easy options:

- Netlify
- Vercel
- Cloudflare Pages
- GitHub Pages

For this project, Netlify or Cloudflare Pages are recommended because they are simple for static sites and support deployment from GitHub.

## Important security note

The Supabase anon/public key is safe to expose in frontend code only if Row Level Security policies are correct. Never expose the `service_role` key in this project.
