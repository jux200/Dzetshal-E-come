# Sprint 6 – Production Foundation + Banner Manager

This update adds a real Banner Manager to the admin dashboard.

## What changed

- New `admin/banners.html` page
- New `admin/js/banners.js` logic
- Sidebar link: Marketing → Banners
- Supabase table: `store_banners`
- Supabase Storage bucket: `banners`
- Homepage hero now loads active banners from Supabase
- Add, edit, hide/show, delete, upload banner images
- Schedule banners with start/end dates
- Control title, subtitle, buttons, sort order and overlay opacity

## Before testing

Run this SQL in Supabase SQL Editor:

```text
supabase/sprint6_banners_settings.sql
```

Then open:

```text
admin/banners.html
```

Add a banner, refresh `index.html`, and the homepage hero should use the banner from Supabase.
