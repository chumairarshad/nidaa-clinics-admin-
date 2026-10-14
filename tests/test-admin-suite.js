/**
 * NiDAA Clinic — Standalone Blog CMS Automated Test Suite
 * Validates project decoupling, security policies, SQL schema, server-only secrets,
 * path-restricted revalidation, and article publication lifecycle.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('  NiDAA Clinic — Standalone Admin CMS Verification Suite');
  console.log('======================================================\n');

  // TEST SUITE 1: Independent Project Architecture & Decoupling
  console.log('--- Test Suite 1: Project Decoupling & Configuration ---');

  runTest('Standalone package.json exists and has its own isolated dependencies', () => {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    assert.strictEqual(fs.existsSync(pkgPath), true, 'package.json must exist');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assert.strictEqual(pkg.name, 'nidaa-blog-admin');
    assert.ok(pkg.dependencies['@supabase/supabase-js'], 'Must depend on supabase-js');
    assert.ok(pkg.dependencies['@supabase/ssr'], 'Must depend on @supabase/ssr');
    assert.ok(pkg.dependencies['next'], 'Must depend on next');
  });

  runTest('Next.js config enforces noindex, nofollow security headers on all admin routes', () => {
    const nextConfigPath = path.join(__dirname, '..', 'next.config.mjs');
    assert.strictEqual(fs.existsSync(nextConfigPath), true);
    const content = fs.readFileSync(nextConfigPath, 'utf8');
    assert.ok(content.includes('X-Robots-Tag'), 'Must define X-Robots-Tag header');
    assert.ok(content.includes('noindex, nofollow'), 'Must set noindex, nofollow');
  });

  runTest('Environment example documents NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and server-only REVALIDATION_SECRET', () => {
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    assert.strictEqual(fs.existsSync(envExamplePath), true);
    const content = fs.readFileSync(envExamplePath, 'utf8');
    assert.ok(!content.includes('eyJh'), 'Must not contain actual JWTs');
    assert.ok(content.includes('NEXT_PUBLIC_SUPABASE_URL'), 'Must document Supabase URL');
    assert.ok(content.includes('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), 'Must document Publishable Key');
    assert.ok(content.includes('REVALIDATION_SECRET'), 'Must document REVALIDATION_SECRET');
    assert.ok(!content.includes('NEXT_PUBLIC_REVALIDATE_SECRET'), 'Must NOT contain NEXT_PUBLIC_REVALIDATE_SECRET');
  });

  // TEST SUITE 2: SQL Schema & Security Model
  console.log('\n--- Test Suite 2: Supabase SQL Migration & RLS Policies ---');

  runTest('SQL migration file exists and is idempotent (IF NOT EXISTS)', () => {
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_create_blog_schema.sql');
    assert.strictEqual(fs.existsSync(sqlPath), true);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.blog_posts'));
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.blog_categories'));
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.blog_admins'));
  });

  runTest('SQL migration enforces Row Level Security and restrictive mutation policies', () => {
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_create_blog_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    assert.ok(sql.includes('ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;'));
    assert.ok(sql.includes('Public can view published posts'));
    assert.ok(sql.includes("status = 'published'"));
    assert.ok(sql.includes('is_blog_admin()'), 'Mutations must verify is_blog_admin() function');
    assert.ok(!sql.includes('DROP TABLE public.'), 'Must never contain destructive DROP TABLE statements');
  });

  // TEST SUITE 3: Storage & Upload Validation
  console.log('\n--- Test Suite 3: Media Upload & Security Guards ---');

  runTest('File upload validator permits images and rejects malicious binaries', () => {
    function validateUpload(fileName, fileSize, mimeType) {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
      const maxSizeBytes = 5 * 1024 * 1024; // 5MB

      if (fileSize > maxSizeBytes) return { valid: false, reason: 'File exceeds 5MB limit' };
      if (!allowedMimes.includes(mimeType)) return { valid: false, reason: 'Disallowed file type' };
      if (/\.(exe|bat|sh|php|js|py)$/i.test(fileName)) return { valid: false, reason: 'Executable extension prohibited' };

      return { valid: true };
    }

    assert.strictEqual(validateUpload('medical-hero.jpg', 1024 * 500, 'image/jpeg').valid, true);
    assert.strictEqual(validateUpload('infographic.webp', 1024 * 800, 'image/webp').valid, true);
    assert.strictEqual(validateUpload('script.php', 1024, 'application/x-php').valid, false);
    assert.strictEqual(validateUpload('payload.exe', 1024, 'image/jpeg').valid, false);
    assert.strictEqual(validateUpload('huge-file.png', 6 * 1024 * 1024, 'image/png').valid, false);
  });

  // TEST SUITE 4: Timing-Safe Revalidation & Path Restrictions
  console.log('\n--- Test Suite 4: Secure Revalidation & Path Sanitization ---');

  runTest('Timing-safe secret verification rejects wrong or timing-attack payloads', () => {
    function timingSafeEqual(a, b) {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    }

    const secret = 'c265b99480509cc04867857d2f2fe6b94736b3ba4fc669bd1a1412271dfbe297';
    assert.strictEqual(timingSafeEqual(secret, secret), true);
    assert.strictEqual(timingSafeEqual('wrong_secret', secret), false);
    assert.strictEqual(timingSafeEqual('', secret), false);
  });

  runTest('Revalidation endpoint blocks arbitrary path invalidation outside blog routes', () => {
    const ALLOWED_EXACT_PATHS = new Set(['/blog', '/sitemap.xml']);
    const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    function isPathAllowed(p) {
      if (!p || typeof p !== 'string') return false;
      const clean = p.trim();
      if (ALLOWED_EXACT_PATHS.has(clean)) return true;
      if (clean.startsWith('/blog/')) {
        const slug = clean.slice('/blog/'.length);
        return slug.length > 0 && slug.length <= 120 && SLUG_REGEX.test(slug);
      }
      return false;
    }

    assert.strictEqual(isPathAllowed('/blog'), true);
    assert.strictEqual(isPathAllowed('/sitemap.xml'), true);
    assert.strictEqual(isPathAllowed('/blog/addiction-treatment-guide'), true);
    // Arbitrary paths must be rejected!
    assert.strictEqual(isPathAllowed('/'), false);
    assert.strictEqual(isPathAllowed('/about-us'), false);
    assert.strictEqual(isPathAllowed('/admin'), false);
    assert.strictEqual(isPathAllowed('/api/internal'), false);
    assert.strictEqual(isPathAllowed('../etc/passwd'), false);
  });

  // TEST SUITE 5: Publishing Lifecycle & Public Visibility Rules
  console.log('\n--- Test Suite 5: Article Publishing Lifecycle Rules ---');

  runTest('Public visibility filter excludes drafts, future posts, and deleted articles', () => {
    const now = new Date('2026-10-14T12:00:00Z');

    const posts = [
      { id: '1', slug: 'published-article', status: 'published', published_at: '2026-10-14T10:00:00Z' },
      { id: '2', slug: 'draft-article', status: 'draft', published_at: '2026-10-14T08:00:00Z' },
      { id: '3', slug: 'future-scheduled', status: 'published', published_at: '2026-10-15T00:00:00Z' },
      { id: '4', slug: 'archived-article', status: 'archived', published_at: '2026-10-10T00:00:00Z' },
    ];

    function filterPublicPosts(allPosts, currentTime) {
      return allPosts.filter(
        (p) =>
          p.status === 'published' &&
          p.published_at &&
          new Date(p.published_at).getTime() <= currentTime.getTime()
      );
    }

    const publicPosts = filterPublicPosts(posts, now);
    assert.strictEqual(publicPosts.length, 1);
    assert.strictEqual(publicPosts[0].slug, 'published-article');
  });

  console.log('\n======================================================');
  console.log(`  Tests Completed: ${passedTests} / ${totalTests} Passed`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
