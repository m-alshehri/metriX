metriX — UI / Dashboard / Project Management Update
====================================================

THIS BUNDLE ALSO PRESERVES THE LATEST BRIGHT DATA + REDDIT FIXES FROM v3.

IMPORTANT: RUN SQL FIRST
------------------------
Open Supabase -> SQL Editor and run:

supabase/project_branding_upgrade.sql

This:
- adds projects.avatar_url
- creates the public project-avatars storage bucket
- adds authenticated upload/update/delete policies

THEN REPLACE / ADD ALL FILES IN THIS ZIP
----------------------------------------

New shared UI:
components/SiteHeader.tsx
components/SiteFooter.tsx
components/PlatformIcon.tsx
components/ProjectCardManager.tsx
components/ProjectDashboard.tsx

Updated:
components/SocialAccounts.tsx
app/[locale]/layout.tsx
app/[locale]/page.tsx
app/[locale]/dashboard/page.tsx
app/[locale]/projects/[id]/page.tsx

New API routes:
app/api/projects/[id]/route.ts
app/api/projects/[id]/avatar/route.ts

Preserved provider fixes:
lib/brightdata.ts
lib/ensembledata.ts
lib/pipeline.ts

WHAT CHANGED
------------

1) HEADER + FOOTER
- Brand24-inspired SaaS structure without copying their exact design.
- Sticky white header.
- Product / Solutions / Resources / Pricing temporary links (#).
- Dashboard, language switch and Start free buttons.
- Large dark footer with Product / Solutions / Resources columns.
- Added at locale layout level so it appears across the site.

2) /en/dashboard
- Removed the four global KPI cards:
  Mentions / Reach / Engagement / Positive sentiment.
- Dashboard now focuses on projects.
- Each project card supports:
  - Open project
  - Rename
  - Delete
  - Upload/change a project logo/avatar
- Logo upload supports PNG/JPG/WebP up to 2 MB.

3) /en/projects/[id]
- Rebuilt into a compact dashboard.
- Platform names are replaced visually by grayscale platform logos.
- Social source inputs use logos instead of large text labels.
- Long vertical analytics sections are replaced by one dashboard grid.
- Added interactive Platform Performance selector:
  Items / Engagement / Views.
- Added:
  Platform share donut
  Sentiment donut
  Activity timeline
  Platform performance bars
  Topic signals
  Top engaging content
- AI Insights is collapsed by default.
- Automation & Alerts is collapsed by default.
- Mentions & posts is collapsed by default.
- Manual test mention form remains available but collapsed.

4) PROVIDER FIXES
- Keeps the latest Bright Data / Reddit v3 fixes already prepared previously.

DEPLOYMENT ORDER
----------------
1. Run supabase/project_branding_upgrade.sql
2. Upload ALL files to the same paths in GitHub.
3. Commit to main.
4. Wait for Vercel deployment.
5. Open /en/dashboard.
6. Test Rename, Delete and project logo upload.
7. Open a project and confirm the compact analytics dashboard.

NOTES
-----
- Header/footer links using "#" are intentionally temporary as requested.
- Existing privacy/terms pages are still linked.
- No new NPM dependency is required.
- Charts use lightweight SVG/CSS/React, so package.json does not need changes.
