# metriX — Step 3: Projects

This version adds real Projects stored in Supabase.

Required database table:
public.projects with RLS policies already created.

What works:
- Create project
- Save project to Supabase
- Each user only sees their own projects due to RLS
- Project list on dashboard
- Bilingual EN/AR
- Existing Supabase Auth remains active

Upload the CONTENTS of this folder to the existing GitHub repository.
Vercel should deploy automatically.

Test:
1. Log in.
2. Open Dashboard.
3. Click Create project.
4. Enter project name, e.g. University of Jeddah.
5. Submit.
6. Project should appear on the dashboard.
