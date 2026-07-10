# Sprint 4: Marketing & Customer Experience

Run `supabase/sprint4_marketing_customer_experience.sql` in Supabase before testing.

Added admin modules:
- Marketing Hub
- Coupons
- Flash Sales
- Featured Products
- Reviews moderation
- Newsletter subscribers + CSV export
- Loyalty points
- Gift Cards

Main tables added:
- coupons, coupon_redemptions
- reviews, review_images
- newsletter_subscribers
- flash_sales, flash_sale_products
- wishlist_items, recently_viewed
- loyalty_accounts, loyalty_transactions
- gift_cards, gift_card_transactions
- marketing_campaigns

Testing checklist:
1. Open `admin/login.html` and sign in.
2. Go to Marketing Hub.
3. Create a coupon in Coupons.
4. Create a flash sale.
5. Feature/unfeature a product.
6. Add a newsletter subscriber and export CSV.
7. Create a loyalty account and adjust points.
8. Create and disable a gift card.
9. Moderate reviews after test reviews exist.
