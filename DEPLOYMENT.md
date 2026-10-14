# NiDAA Clinic — Standalone Blog CMS Deployment Guide

This guide details the exact steps for deploying `nidaa-blog-admin` to Vercel under `blog.nidaclinic.com` and synchronizing it with the main website at `nidaclinic.com`.

---

## Architecture Summary

| System | Role | Target Domain | Hosting / Repo |
| :--- | :--- | :--- | :--- |
| **Main Website** | Public marketing site & published blog articles | `https://nidaclinic.com` | Primary Vercel Project / Main Git Repo |
| **Blog CMS** | Private admin portal for doctors & editors | `https://blog.nidaclinic.com` | Separate Vercel Project / `nidaa-blog-admin` Repo |
| **Supabase** | Shared PostgreSQL DB, Auth, & Storage | `https://[ref].supabase.co` | Shared Cloud Project |

---

## Phase 1: Database Migration in Supabase

1. Open your browser and navigate to the **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Select your NiDAA Clinic project.
3. Open the **SQL Editor** tab from the left sidebar.
4. Open the migration file:
   `nidaa-blog-admin/supabase/migrations/001_create_blog_schema.sql`
5. Copy its entire text, paste it into the Supabase SQL Editor, and click **Run**.
6. Check that the tables have been created:
   - `public.blog_posts`
   - `public.blog_categories`
   - `public.blog_admins`
   - `storage.buckets` contains `blog-media`

### Adding Your Admin User:
1. In Supabase Dashboard, go to **Authentication** → **Users**.
2. Click **Add User** → **Create User**.
3. Enter your administrator email (e.g. `admin@nidaclinic.com` or your doctor email) and a strong password. Click **Auto Confirm User**.
4. In the **SQL Editor**, run this query to grant admin privileges to that email:
   ```sql
   INSERT INTO public.blog_admins (user_id, email, full_name, role, is_active)
   SELECT id, email, 'Dr. Bilal Warraich', 'admin', TRUE
   FROM auth.users
   WHERE email = 'admin@nidaclinic.com'
   ON CONFLICT (email) DO UPDATE SET is_active = TRUE, role = 'admin';
   ```

---

## Phase 2: Create Separate GitHub Repository

1. Create a new repository on GitHub named `nidaa-blog-admin` (set it to **Private**).
2. Open PowerShell on Windows and run:
   ```powershell
   cd "c:\Users\Nexus Computer\Downloads\lahore-psychologists\nidaa-blog-admin"
   git init
   git add .
   git commit -m "feat: initial commit of standalone NiDAA Clinic Blog CMS"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/nidaa-blog-admin.git
   git push -u origin main
   ```

---

## Phase 3: Deploy to Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import the `nidaa-blog-admin` repository.
4. Set Framework Preset: **Next.js** (Root Directory: `./`).
5. Under **Environment Variables**, add:

| Variable Name | Required Value | Notes |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Found in Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOi...` | Supabase Publishable / Anon Key |
| `NEXT_PUBLIC_MAIN_SITE_URL` | `https://nidaclinic.com` | Target main clinic website domain |
| `REVALIDATION_SECRET` | `c265b99480509cc04867857d2f2fe6b94736b3ba4fc669bd1a1412271dfbe297` | Server-only secret; matches main site env |

6. Click **Deploy**.

---

## Phase 4: Configure Custom Domain (`blog.nidaclinic.com`)

1. In the Vercel project for `nidaa-blog-admin`, click **Settings** → **Domains**.
2. Add `blog.nidaclinic.com`.
3. In your DNS Provider (e.g., Cloudflare, GoDaddy, Namecheap):
   - **Record Type**: `CNAME`
   - **Name**: `blog`
   - **Target**: `cname.vercel-dns.com`
   - **TTL**: Auto or 3600
   - *Note if using Cloudflare*: Set Proxy status to DNS-only (Grey cloud) during initial SSL certificate verification.
4. Wait for Vercel to verify the DNS record and automatically issue the Let's Encrypt SSL certificate.

---

## Phase 5: Supabase Auth Redirect URLs

1. Return to the **Supabase Dashboard** → **Authentication** → **URL Configuration**.
2. Under **Site URL**, set:
   `https://blog.nidaclinic.com`
3. Under **Redirect URLs**, add:
   - `https://blog.nidaclinic.com/**`
   - `http://localhost:3010/**`
4. Click **Save**.

---

## Phase 6: Main Website Cache Revalidation Verification

1. On the main website Vercel project (`nidaclinic.com`), ensure the following environment variable is configured in Vercel settings:
   - `REVALIDATION_SECRET` = `c265b99480509cc04867857d2f2fe6b94736b3ba4fc669bd1a1412271dfbe297`
2. Test the connection:
   - When an article is published or unpublished in `blog.nidaclinic.com`, the webhook sends a POST request to `https://nidaclinic.com/api/revalidate`.
   - The Next.js cache for `/blog`, `/blog/[slug]`, and `/sitemap.xml` is purged in real time without redeploying code.
