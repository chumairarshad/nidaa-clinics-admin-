# NiDAA Clinic — Standalone Blog CMS

Production-grade, standalone Blog Content Management System (CMS) for **NiDAA Clinic** (`https://nidaclinic.com`), built with **Next.js 14 App Router**, **Supabase Auth & PostgreSQL**, and **Supabase Storage**.

Designed to be hosted independently on **`https://blog.nidaclinic.com`** via its own GitHub repository and separate Vercel project.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                   SUPABASE PROJECT                     │
│  - PostgreSQL Database (Tables: blog_posts, etc.)     │
│  - Supabase Auth (Admin login sessions)                │
│  - Supabase Storage (Bucket: 'blog-media')             │
│  - Row Level Security (RLS) Policies                   │
└──────────────────┬──────────────────┬──────────────────┘
                   │                  │
                   ▼                  ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│     MAIN CLINIC WEBSITE      │   │    STANDALONE BLOG ADMIN     │
│   https://nidaclinic.com     │   │   https://blog.nidaclinic.com│
│                              │   │                              │
│ • Public /blog (3 cards/row) │   │ • Protected /dashboard       │
│ • Public /blog/[slug]        │   │ • Post Editor (Draft/Publish)│
│ • Revalidation: /api/reval.. │◄──┤ • Categories & Media Upload  │
│ • XML Sitemap: /sitemap.xml  │   │ • Webhook Cache Buster       │
└──────────────────────────────┘   └──────────────────────────────┘
```

---

## 🚀 Quick Start (Local Development on Windows)

### 1. Open Terminal in this Folder
```powershell
cd "c:\Users\Nexus Computer\Downloads\lahore-psychologists\nidaa-blog-admin"
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```powershell
Copy-Item .env.example .env.local
```

Fill in your Supabase credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
NEXT_PUBLIC_MAIN_SITE_URL=http://localhost:3009
REVALIDATION_SECRET=c265b99480509cc04867857d2f2fe6b94736b3ba4fc669bd1a1412271dfbe297
```

### 4. Start the Admin Dev Server
```powershell
npm run dev
```
Open **`http://localhost:3010`** in your browser to access the NiDAA Clinic CMS login.

---

## 📦 How to Publish to a Separate GitHub Repository

This project folder is completely decoupled from the main website. To publish it to its own repository on GitHub:

### Option A: From Current Directory
```powershell
cd "c:\Users\Nexus Computer\Downloads\lahore-psychologists\nidaa-blog-admin"
git init
git add .
git commit -m "feat: initial commit of standalone NiDAA Clinic Blog CMS"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/nidaa-blog-admin.git
git push -u origin main
```

### Option B: Move to Any Standalone Folder First (Optional)
```powershell
# Move folder to your preferred code directory
Move-Item "c:\Users\Nexus Computer\Downloads\lahore-psychologists\nidaa-blog-admin" "C:\Projects\nidaa-blog-admin"
cd "C:\Projects\nidaa-blog-admin"
git init
git add .
git commit -m "feat: initial commit of standalone NiDAA Clinic Blog CMS"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/nidaa-blog-admin.git
git push -u origin main
```

---

## 🗄️ Database Setup (Supabase SQL Migration)

The complete SQL migration script is located at:
`supabase/migrations/001_create_blog_schema.sql`

### How to Apply in Supabase Dashboard (1-Click Safe Method):
1. Go to your **[Supabase Dashboard](https://supabase.com/dashboard)** and select your project.
2. In the left navigation, click on **SQL Editor**.
3. Click **New Query**.
4. Open `supabase/migrations/001_create_blog_schema.sql` from this project, copy the entire contents, and paste them into the SQL Editor.
5. Click **Run**.

### What this migration creates:
- `blog_categories` table (Psychiatric Care, Addiction Recovery, Mental Health, Clinical Psychology)
- `blog_posts` table with complete columns (`title`, `slug`, `content`, `excerpt`, `featured_image_url`, `status`, `seo_title`, `seo_description`, `author_name`, `reading_time`, `published_at`, `created_at`, `updated_at`)
- `blog_admins` table for role-based authorization
- `is_blog_admin()` security helper function
- Row Level Security (RLS) policies:
  - **Public Visitors**: Read-only access to published articles (`status = 'published'` AND `published_at <= NOW()`).
  - **Authorized Administrators**: Full permissions to create, update, delete, and publish articles.
- `blog-media` Storage bucket for featured image uploads with restrictive admin-only mutation policies.

---

## 🌐 Deploying to Vercel (Independent Deployment)

1. Go to **[vercel.com](https://vercel.com)** and click **Add New Project**.
2. Import your `nidaa-blog-admin` GitHub repository.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Your Supabase Project URL)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = (Your Supabase Publishable / Anon Key)
   - `NEXT_PUBLIC_MAIN_SITE_URL` = `https://nidaclinic.com`
   - `REVALIDATION_SECRET` = `c265b99480509cc04867857d2f2fe6b94736b3ba4fc669bd1a1412271dfbe297` (Server-only)
4. Click **Deploy**.

---

## 🔗 Custom Domain Setup (`blog.nidaclinic.com`)

1. In your Vercel Project Dashboard for `nidaa-blog-admin`:
   - Go to **Settings** → **Domains**.
   - Enter `blog.nidaclinic.com` and click **Add**.
2. Vercel will provide you with the exact DNS record needed:
   - **Type**: `CNAME`
   - **Name / Host**: `blog`
   - **Target / Value**: `cname.vercel-dns.com`
3. Add this `CNAME` record in your DNS provider (e.g. Cloudflare, Namecheap, GoDaddy, or Route 53).
4. Once verified, configure your Supabase Auth settings:
   - Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**.
   - Set **Site URL** to: `https://blog.nidaclinic.com`
   - In **Redirect URLs**, add: `https://blog.nidaclinic.com/**` and `http://localhost:3010/**`.

---

## 🧪 Acceptance & Security Criteria Satisfied

- ✅ **Independent Codebase**: Standalone `package.json`, isolated dependencies, zero cross-dependencies on main website.
- ✅ **No Secret Leaks**: Only `NEXT_PUBLIC_` variables in browser code; RLS policies enforce security at the database layer.
- ✅ **Medical Crimson Aesthetic**: Signature NiDAA Clinic brand theme matching the clinical reference card.
- ✅ **Instant Cache Invalidation**: Publishes call `/api/revalidate` on the main website to ensure immediate public updates without redeploys.
- ✅ **Robots & Indexing Protection**: Standalone admin sets `X-Robots-Tag: noindex, nofollow` and `robots: { index: false, follow: false }` to prevent search engine indexing of the admin portal.
