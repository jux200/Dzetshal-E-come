# Dzetshal Production Checklist

## Supabase

- [ ] `products` table exists
- [ ] `orders` table exists
- [ ] `order_items` table exists
- [ ] `product_images` table exists
- [ ] `admin_users` table exists
- [ ] `stock_logs` table exists
- [ ] Storage bucket `products` exists and is public
- [ ] RLS enabled on key tables
- [ ] Public can view active products
- [ ] Public can insert orders and order items
- [ ] Admin can manage products, stock, images, and orders

## Storefront tests

- [ ] Products load from Supabase
- [ ] Brand filters work
- [ ] Type filters work
- [ ] Gender filter works
- [ ] Search works
- [ ] Product modal opens correctly
- [ ] No stuck zoom square remains
- [ ] Cart works
- [ ] Checkout form validates fields
- [ ] Email checkout saves order
- [ ] WhatsApp checkout saves order before redirect

## Admin tests

- [ ] Admin login works
- [ ] Dashboard opens
- [ ] Orders load
- [ ] Products load
- [ ] Add product works
- [ ] Edit product works
- [ ] Stock update works
- [ ] Price update works
- [ ] Hide/show product works
- [ ] Image upload works
- [ ] Main image setting works

## Deployment

- [ ] Deploy latest folder
- [ ] Test desktop
- [ ] Test mobile
- [ ] Test Chrome
- [ ] Test Safari/Edge if available
- [ ] Confirm Supabase URL/key are correct
- [ ] Confirm EmailJS templates are correct
- [ ] Confirm WhatsApp phone number is correct
