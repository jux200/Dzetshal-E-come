# Phase 9: Product Image Manager

This version adds product media management to the admin dashboard and storefront.

## What changed

- Admin product form can upload multiple product images to Supabase Storage.
- Images are saved in the `product_images` table.
- Admin can set a main image per product.
- Admin can delete product gallery images.
- Storefront loads gallery images from Supabase and uses them in product modals.
- Product cards use the main image automatically.

## Required Supabase SQL

Run this file in Supabase SQL Editor before testing:

```text
supabase/phase9_product_media.sql
```

## How to test

1. Open `admin/login.html` and log in as admin.
2. Open Products.
3. Edit a product.
4. Upload multiple images.
5. Set one as Main.
6. Open the storefront and click the same product.
7. Confirm the product modal shows gallery thumbnails.

## Notes

- The `products` storage bucket must be public.
- The admin user must exist in `admin_users` and be logged in through Supabase Auth.
- Deleted images are removed from both the gallery table and Supabase Storage when `storage_path` exists.
