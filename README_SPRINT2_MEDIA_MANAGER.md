# Sprint 2: Product Media Manager

Added a real admin media workflow:

- Product image drag-and-drop upload from `admin/products.html`
- Multiple images per product
- Main image selection
- Image replace/delete
- New `admin/media.html` media library
- Copy image URL
- Supabase Storage support

Before testing, run:

`supabase/phase12_media_manager.sql`

Then test:

1. Open `admin/login.html`
2. Go to Products
3. Edit a product
4. Upload multiple images
5. Set one as Main
6. Open Media Library
7. Confirm images appear on the storefront product modal
