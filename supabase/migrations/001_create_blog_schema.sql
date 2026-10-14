-- ============================================================================
-- NiDAA Clinic — Production Blog CMS Database Schema & Migrations
-- Target: Supabase / PostgreSQL 14+
-- File: 001_create_blog_schema.sql
-- ============================================================================

-- Enable pgcrypto / uuid extensions if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. BLOG CATEGORIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON public.blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_categories_display_order ON public.blog_categories(display_order);

-- ----------------------------------------------------------------------------
-- 2. AUTHORIZED BLOG ADMINISTRATORS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_admins_user_id ON public.blog_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_admins_email ON public.blog_admins(email);

-- ----------------------------------------------------------------------------
-- 3. BLOG POSTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image_url TEXT,
    category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
    category_slug TEXT,
    category_name TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'trash')),
    trashed_at TIMESTAMPTZ,
    seo_title TEXT,
    seo_description TEXT,
    author_name TEXT NOT NULL DEFAULT 'Dr. Bilal Warraich',
    author_role TEXT NOT NULL DEFAULT 'Consultant Psychiatrist & Medical Director',
    author_avatar TEXT NOT NULL DEFAULT '/assets/images/dr_bilal_warraich.jpg',
    reading_time INT NOT NULL DEFAULT 3,
    word_count INT NOT NULL DEFAULT 500,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON public.blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_slug ON public.blog_posts(category_slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON public.blog_posts(created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. AUTOMATIC updated_at TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_blog_categories_updated_at ON public.blog_categories;
CREATE TRIGGER tr_blog_categories_updated_at
    BEFORE UPDATE ON public.blog_categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_blog_admins_updated_at ON public.blog_admins;
CREATE TRIGGER tr_blog_admins_updated_at
    BEFORE UPDATE ON public.blog_admins
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER tr_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) & HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Helper function: checks if authenticated user is active administrator
CREATE OR REPLACE FUNCTION public.is_blog_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.blog_admins
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS: blog_categories
DROP POLICY IF EXISTS "Public can view all blog categories" ON public.blog_categories;
CREATE POLICY "Public can view all blog categories"
    ON public.blog_categories FOR SELECT
    TO anon, authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.blog_categories;
CREATE POLICY "Admins can manage categories"
    ON public.blog_categories FOR ALL
    TO authenticated
    USING (public.is_blog_admin())
    WITH CHECK (public.is_blog_admin());

-- RLS: blog_admins
DROP POLICY IF EXISTS "Admins can view admin list" ON public.blog_admins;
CREATE POLICY "Admins can view admin list"
    ON public.blog_admins FOR SELECT
    TO authenticated
    USING (public.is_blog_admin());

DROP POLICY IF EXISTS "Super admins can manage admin records" ON public.blog_admins;
CREATE POLICY "Super admins can manage admin records"
    ON public.blog_admins FOR ALL
    TO authenticated
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.blog_admins
            WHERE user_id = auth.uid() AND role = 'admin' AND is_active = TRUE
        )
    );

-- RLS: blog_posts
-- 1. Public can ONLY view published posts whose publication time has arrived
DROP POLICY IF EXISTS "Public can view published posts" ON public.blog_posts;
CREATE POLICY "Public can view published posts"
    ON public.blog_posts FOR SELECT
    TO anon, authenticated
    USING (
        status = 'published'
        AND published_at IS NOT NULL
        AND published_at <= NOW()
    );

-- 2. Authenticated administrators can view ALL posts (including drafts and archives)
DROP POLICY IF EXISTS "Admins can view all posts" ON public.blog_posts;
CREATE POLICY "Admins can view all posts"
    ON public.blog_posts FOR SELECT
    TO authenticated
    USING (public.is_blog_admin());

-- 3. Authenticated administrators can insert, update, and delete posts
DROP POLICY IF EXISTS "Admins can insert posts" ON public.blog_posts;
CREATE POLICY "Admins can insert posts"
    ON public.blog_posts FOR INSERT
    TO authenticated
    WITH CHECK (public.is_blog_admin());

DROP POLICY IF EXISTS "Admins can update posts" ON public.blog_posts;
CREATE POLICY "Admins can update posts"
    ON public.blog_posts FOR UPDATE
    TO authenticated
    USING (public.is_blog_admin())
    WITH CHECK (public.is_blog_admin());

DROP POLICY IF EXISTS "Admins can delete posts" ON public.blog_posts;
CREATE POLICY "Admins can delete posts"
    ON public.blog_posts FOR DELETE
    TO authenticated
    USING (public.is_blog_admin());

-- ----------------------------------------------------------------------------
-- 6. SUPABASE STORAGE BUCKET FOR FEATURED IMAGES & MEDIA
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'blog-media',
    'blog-media',
    TRUE,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 10485760;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public can view blog-media objects" ON storage.objects;
CREATE POLICY "Public can view blog-media objects"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'blog-media');

DROP POLICY IF EXISTS "Admins can upload to blog-media" ON storage.objects;
CREATE POLICY "Admins can upload to blog-media"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'blog-media'
        AND public.is_blog_admin()
    );

DROP POLICY IF EXISTS "Admins can update blog-media" ON storage.objects;
CREATE POLICY "Admins can update blog-media"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'blog-media'
        AND public.is_blog_admin()
    );

DROP POLICY IF EXISTS "Admins can delete from blog-media" ON storage.objects;
CREATE POLICY "Admins can delete from blog-media"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'blog-media'
        AND public.is_blog_admin()
    );

-- ----------------------------------------------------------------------------
-- 7. INITIAL CLINICAL SEED DATA (NiDAA Clinic Brand & Clinical Journal)
-- ----------------------------------------------------------------------------
INSERT INTO public.blog_categories (name, slug, description, display_order)
VALUES
    ('Psychiatric Care', 'psychiatric-care', 'Evidence-based psychiatric assessments, clinical medication management, and medical detox protocols.', 1),
    ('Rehabilitation & Recovery', 'rehabilitation-recovery', 'Inpatient residential rehabilitation, addiction psychotherapy, and relapse prevention.', 2),
    ('Clinical CBT & Training', 'cbt-clinical-training', 'Hands-on clinical training, cognitive behavioral therapy, ACT, and ERP for psychological practitioners.', 3),
    ('Mental Health Awareness', 'mental-health-awareness', 'Educational resources on anxiety, MDD, psychosis, bipolar disorder, and community wellbeing.', 4)
ON CONFLICT (slug) DO NOTHING;

-- Initial Seed Post: Welcome to NiDAA Clinic Blog
INSERT INTO public.blog_posts (
    title,
    slug,
    excerpt,
    content,
    featured_image_url,
    category_slug,
    category_name,
    tags,
    status,
    seo_title,
    seo_description,
    author_name,
    author_role,
    published_at
)
VALUES (
    'Welcome to NiDAA Clinic: Evidence-Based Psychiatric Care & Clinical Excellence',
    'welcome-to-nidaa-clinic-blog',
    'Under the medical direction of Dr. Bilal Warraich (UNODC American Qualified), NiDAA Clinic delivers state-of-the-art psychiatric treatment, addiction detoxification, and evidence-based psychotherapy in Lahore.',
    '<h2>Leading Psychiatric & Rehabilitation Care in Lahore</h2><p>At <strong>NiDAA Clinic</strong> (National Institute on Drug Abuse and Addiction), under the clinical leadership of <strong>Dr. Bilal Warraich (MBBS, FCPS Psychiatry, UNODC American Qualified)</strong>, our mission is to deliver comprehensive, compassionate, and evidence-based mental healthcare.</p><h3>Our Clinical Focus Areas</h3><ul><li><strong>Medical Detoxification & Inpatient Rehab:</strong> Supervised 24/7 care with private residential recovery rooms.</li><li><strong>Evidence-Based Psychotherapies:</strong> Scientifically validated Cognitive Behavioral Therapy (CBT), Acceptance and Commitment Therapy (ACT), and Exposure and Response Prevention (ERP).</li><li><strong>Dual Diagnosis Care:</strong> Addressing co-occurring depression, psychosis, bipolar affective disorder, and substance abuse.</li><li><strong>Capacity Building:</strong> Hands-on clinical training programs for future clinical psychologists.</li></ul><h3>Need Immediate Clinical Assistance?</h3><p>Our dedicated care coordinators and emergency psychiatric on-call teams are available 24/7. Reach out via our care helpline or visit our clinic on Canal Road, Westwood Colony, Lahore.</p>',
    '/assets/images/rehabilitation_session.jpg',
    'psychiatric-care',
    'Psychiatric Care',
    ARRAY['Psychiatry', 'Rehabilitation', 'CBT', 'Mental Health Lahore'],
    'published',
    'Welcome to NiDAA Clinic | Psychiatric Care & Rehab Lahore',
    'Discover NiDAA Clinic Lahore. Medical direction by Dr. Bilal Warraich (UNODC American Qualified) providing psychiatric detox, CBT, and clinical rehabilitation.',
    'Dr. Bilal Warraich',
    'Medical Director & Chief Consultant Psychiatrist',
    NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- Featured Article Seed: Best Rehabilitation Centre in Lahore
INSERT INTO public.blog_posts (
    title,
    slug,
    excerpt,
    content,
    featured_image_url,
    category_slug,
    category_name,
    tags,
    status,
    seo_title,
    seo_description,
    author_name,
    author_role,
    reading_time,
    word_count,
    published_at
)
VALUES (
    'Best Rehabilitation Centre in Lahore: Evidence-Based Inpatient Addiction Recovery & Psychiatric Care',
    'best-rehabilitation-centre-in-lahore',
    'Discover why NiDAA Clinic is recognized as the leading rehabilitation centre in Lahore. Led by Dr. Bilal Warraich (UNODC American Qualified), offering 24/7 medical detox, psychiatric stabilization, and CBT recovery.',
    '<p class="lead">Navigating substance use disorders and severe psychiatric crises requires far more than isolation or temporary restraint; it demands scientifically validated medical intervention, psychiatric diagnostic precision, and compassionate psychological rehabilitation. At <strong>NiDAA Clinic</strong> (National Institute on Drug Abuse and Addiction), under the medical direction of <strong>Dr. Bilal Warraich (MBBS, FCPS Psychiatry, UNODC American Qualified)</strong>, we have established Lahore''s premier inpatient treatment sanctuary dedicated to restoring dignity, mental clarity, and lasting recovery.</p><h2>Why Choosing the Right Rehabilitation Centre in Lahore Matters</h2><p>Substance dependency—whether involving ice (crystal methamphetamine), heroin, opioids, alcohol, prescription benzodiazepines, or cannabis—is recognized by modern medicine as a chronic, relapsing disorder of the brain''s reward circuitry. At NiDAA Clinic, our clinical philosophy is rooted in evidence-based medicine and human empathy. Patients are not treated as moral failures; they are respected as medical patients battling a treatable neurological and behavioral condition.</p><h2>The 4 Clinical Pillars of Inpatient Recovery at NiDAA Clinic</h2><h3>1. Medically Monitored Inpatient Detoxification (24/7 Safety)</h3><p>Abruptly stopping substances without medical supervision can trigger life-threatening withdrawal complications. Our inpatient detox unit features continuous medical monitoring, individualized pharmacological comfort tapers, and IV electrolyte rebalancing.</p><h3>2. Dual-Diagnosis Psychiatric Treatment</h3><p>Over 75% of individuals presenting with chemical dependency suffer from underlying depression, bipolar affective disorder, panic disorder, or PTSD. Dr. Bilal Warraich conducts comprehensive psychiatric diagnostic assessments to treat both conditions simultaneously.</p><h3>3. Evidence-Based Psychotherapy & CBT</h3><p>Our clinical psychology team conducts intensive daily Cognitive Behavioral Therapy (CBT), Dialectical Behavior Therapy (DBT) distress tolerance skills, and personalized relapse prevention plans.</p><h3>4. Family Systems Therapy & Relationship Healing</h3><p>We actively counsel families to resolve codependency, establish healthy protective boundaries, and rebuild damaged domestic trust.</p><h2>Inside Our Executive Residential Facility in Lahore</h2><ul><li>Private executive air-conditioned suites with en-suite bathrooms</li><li>Clinical nutritionist-designed meals for gut-brain restoration</li><li>Zero punitive isolation or harsh labor; dignity-first therapeutic environment</li><li>Strict medical confidentiality conforming to international healthcare standards</li></ul><h2>Frequently Asked Questions About Rehabilitation in Lahore</h2><h3>How long does inpatient rehabilitation typically last?</h3><p>Comprehensive recovery programs span 30 to 90 days depending on substance history and psychiatric dual diagnosis.</p><h3>How do we arrange an emergency admission?</h3><p>Our 24/7 clinical helpline operates round the clock. Call <strong>+92 321 7507866</strong> for direct admission assistance.</p>',
    '/assets/images/rehab_centre_lahore.jpg',
    'rehabilitation-recovery',
    'Rehabilitation & Recovery',
    ARRAY['Rehabilitation Centre in Lahore', 'Best Rehab Lahore', 'Drug Detox Lahore', 'Dr Bilal Warraich', 'Inpatient Recovery'],
    'published',
    'Best Rehabilitation Centre in Lahore | NiDAA Clinic',
    'NiDAA Clinic is the premier inpatient rehabilitation centre in Lahore. Medical detox, dual diagnosis, CBT therapy, and 24/7 confidential clinical psychiatric care.',
    'Dr. Bilal Warraich',
    'Medical Director & Chief Consultant Psychiatrist',
    6,
    1450,
    NOW()
)
ON CONFLICT (slug) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 7. HOMEPAGE ARTICLES SEED
-- ----------------------------------------------------------------------------

INSERT INTO public.blog_posts (
    title, slug, excerpt, content, featured_image_url, category_slug, category_name,
    tags, status, seo_title, seo_description, author_name, author_role, reading_time, published_at
) VALUES (
    'Understanding Ice (Crystal Meth) Addiction & Safe Medical Detox',
    'understanding-ice-crystal-meth-addiction-medical-detox',
    'A clinical roadmap for withdrawal stabilization, vital monitoring, neurochemical rebalancing, and inpatient medical detox protocols under PHC standards.',
    '<p class="lead">Crystal methamphetamine (commonly termed "Ice") represents one of the most potent and destructive central nervous system stimulants circulating in modern society. Due to its intense surge of dopamine release—exceeding ten times the body''s baseline natural rewards—ice rapidly rewires the brain''s mesolimbic circuitry, precipitating rapid physiological dependence, profound sleep disruption, and high risks of stimulant-induced psychosis.</p>

<h2>The Neurobiology of Crystal Methamphetamine Dependence</h2>
<p>Unlike opioids or alcohol that depress neural signaling, crystal meth acts as an intensive neuro-stimulant, reversing dopamine, norepinephrine, and serotonin transporters. Over repeated cycles of abuse, cellular dopamine reserves are thoroughly exhausted, resulting in severe anhedonia (the absolute inability to experience pleasure) when the drug leaves the bloodstream.</p>
<p>At <strong>NiDAA Clinic</strong> under the medical direction of <strong>Dr. Bilal Warraich (UNODC American Qualified)</strong>, we approach crystal meth detox as an intensive medical and neuropsychiatric procedure, prioritizing neurological stabilization and compassionate clinical management.</p>

<h2>Why "Cold Turkey" Detox at Home is Extremely Dangerous</h2>
<p>Attempting unmonitored withdrawal from crystal meth outside a licensed hospital poses severe psychiatric and somatic risks:</p>
<ul>
  <li><strong>Stimulant Withdrawal Psychosis:</strong> Acute paranoid delusions, persecutory ideations, and severe auditory hallucinations.</li>
  <li><strong>Severe Depressive Crash & Suicidality:</strong> Extreme neurochemical depletion often induces intense suicidal impulses during the first 72 to 120 hours.</li>
  <li><strong>Cardiovascular Instability:</strong> Dysregulated adrenergic rebound causing tachyarrhythmias, malignant hypertension, and cardiac distress.</li>
  <li><strong>Severe Hyperpyrexia & Exhaustion:</strong> Disrupted hypothalamic thermoregulation coupled with metabolic collapse.</li>
</ul>

<h2>The 4 Phases of Inpatient Medical Detox at NiDAA Clinic</h2>

<h3>Phase 1: Emergency Clinical Triage & Neurochemical Stabilization (Days 1–3)</h3>
<p>Upon admission to our Canal Road Westwood residential facility in Lahore, every patient undergoes a complete metabolic panel, electrocardiogram (ECG), toxicology screening, and a psychiatric baseline assessment. We administer non-addictive neurochemical stabilizing agents to alleviate acute agitation, protect cardiac function, and gently restore natural circadian sleep architecture without dangerous over-sedation.</p>

<h3>Phase 2: Physiological Rehydration & Cellular Restoration (Days 4–7)</h3>
<p>Chronic meth consumption causes profound cellular dehydration, severe electrolyte imbalances, and nutritional cachexia. Our inpatient medical team utilizes clinical-grade IV vitamin therapy, zinc-magnesium infusion, and tailored electrolyte replenishment to repair cellular mitochondrial function.</p>

<h3>Phase 3: Cognitive Clarification & Psychiatric Assessment (Days 8–14)</h3>
<p>As the acute pharmacological fog dissipates, Miss Ayesha Ishaq and our clinical psychology team administer cognitive assessments to detect underlying co-occurring disorders such as ADHD, clinical depression, or trauma-induced anxiety that initially contributed to self-medication.</p>

<h3>Phase 4: Transition to Cognitive Behavioral Relapse Prevention</h3>
<p>Detoxification cleanses the body, but cognitive therapy protects long-term sobriety. Patients transition into intensive Cognitive Behavioral Therapy (CBT), learning to map environmental triggers, interrupt craving loops, and rebuild self-worth.</p>

<h2>Confidential Helpline & Admission Information</h2>
<p>If you or someone you care about is battling crystal meth in Lahore, confidential inpatient help is available 24/7. Call NiDAA Clinic at <strong>0321 7507866</strong> or visit our clinic at 99 Westwood Colony, Thokar Niaz Baig, Lahore.</p>',
    '/assets/images/service_rehab.jpg',
    'addiction-detox',
    'addiction detox',
    ARRAY['ice addiction', 'crystal meth detox', 'rehab in lahore', 'substance detox', 'dr bilal warraich'],
    'published',
    'Understanding Ice Addiction & Safe Medical Detox in Lahore | NiDAA Clinic',
    'A clinical roadmap for crystal meth withdrawal stabilization, vital monitoring, and medical detox under PHC standards at NiDAA Clinic Lahore.',
    'Miss Ayesha Ishaq',
    'Senior Clinical Psychologist, Specialist in Addiction Medicine and Cognitive Therapy.',
    5,
    NOW()
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.blog_posts (
    title, slug, excerpt, content, featured_image_url, category_slug, category_name,
    tags, status, seo_title, seo_description, author_name, author_role, reading_time, published_at
) VALUES (
    'CBT & Exposure Therapy: Overcoming Severe Panic Attacks & OCD',
    'cbt-exposure-therapy-panic-attacks-ocd',
    'How evidence-based Cognitive Behavioral Therapy (CBT) and ERP desensitize compulsive loops, intrusive thoughts, and generalized anxiety disorders.',
    '<p class="lead">Severe panic attacks and Obsessive-Compulsive Disorder (OCD) can transform everyday life into an unrelenting gauntlet of fear, physical distress, and mental exhaustion. While the sensations of panic feel like imminent physical disaster, evidence-based psychotherapy provides proven, long-lasting clinical relief without lifetime dependency on tranquilizers.</p>

<h2>Deconstructing the Anatomy of a Panic Attack</h2>
<p>A panic attack is essentially a false alarm triggered by the amygdala—the brain''s ancient threat detection center. During an attack, a massive surge of adrenaline prompts rapid somatic reactions:</p>
<ul>
  <li>Tachycardia and chest tightness (frequently misinterpreted as an impending heart attack)</li>
  <li>Hyperventilation resulting in hypocapnia, tingling extremities, and lightheadedness</li>
  <li>Depersonalization (feeling detached from one''s body) and derealization</li>
  <li>Catastrophic misinterpretation: "I am losing control, going crazy, or about to die."</li>
</ul>

<h2>The Cognitive Model of Panic: Breaking the Fear-Adrenaline Cycle</h2>
<p>At NiDAA Clinic, <strong>Miss Ayesha Ishaq</strong> leads specialized CBT protocols designed to break the cycle of anxiety:</p>
<ol>
  <li><strong>Somatic Symptom:</strong> A harmless physiological variation occurs (e.g., elevated heart rate from climbing stairs).</li>
  <li><strong>Catastrophic Thought:</strong> "My heart is failing."</li>
  <li><strong>Adrenaline Surge:</strong> The brain believes a mortal threat exists, releasing more adrenaline.</li>
  <li><strong>Intensified Symptoms:</strong> The heart pounds faster, seemingly confirming the catastrophe.</li>
</ol>
<p>Through systematic cognitive restructuring, clients learn to objectively identify distorted cognitions, examine empirical evidence, and replace catastrophic predictions with factual, neutral appraisals.</p>

<h2>Exposure and Response Prevention (ERP) for OCD</h2>
<p>Obsessive-Compulsive Disorder operates on a vicious cycle of <em>Intrusive Thought &rarr; Severe Anxiety &rarr; Compulsive Ritual &rarr; Temporary Relief &rarr; Strengthened Obsession</em>. Compulsions—whether physical washing, checking locks, or mental counting—actually reinforce OCD over time.</p>
<p>Exposure and Response Prevention (ERP) is the gold standard clinical treatment worldwide:</p>
<ul>
  <li><strong>Hierarchical Exposure:</strong> The psychologist and client co-create an anxiety hierarchy ranking triggers from mild to severe.</li>
  <li><strong>Controlled In-Vivo Exposure:</strong> The patient deliberately confronts the obsessive trigger in a safe, therapeutic setting.</li>
  <li><strong>Response Prevention:</strong> The patient is guided to refrain from the neutralizing ritual or reassurance-seeking.</li>
  <li><strong>Neuroplastic Habituation:</strong> The brain''s alarm system gradually learns that the dreaded catastrophe does not occur, permanently dampening baseline anxiety.</li>
</ul>

<h2>Somatic Interoceptive Training</h2>
<p>In addition to cognitive exercises, we conduct interoceptive exposure: gentle, guided somatic exercises (such as voluntary hyperventilation or spinning) that reproduce benign panic sensations, desensitizing the nervous system to physical arousal.</p>

<h2>Consult Our Clinical Psychologists in Lahore</h2>
<p>If panic disorder, health anxiety, or OCD are impairing your peace of mind, reach out to NiDAA Clinic today at <strong>0321 7507866</strong> for in-clinic or online psychological consultation.</p>',
    '/assets/images/service_counseling.jpg',
    'clinical-psychology',
    'clinical psychology',
    ARRAY['cbt therapy', 'panic attacks', 'ocd treatment', 'psychologist lahore', 'anxiety relief'],
    'published',
    'CBT & Exposure Therapy for Panic Attacks & OCD in Lahore | NiDAA Clinic',
    'Learn how evidence-based CBT and Exposure Response Prevention (ERP) eliminate severe panic attacks and obsessive thoughts at NiDAA Clinic Lahore.',
    'Miss Ayesha Ishaq',
    'Clinical Psychologist, Specialist in Cognitive Behavioral Therapy and ERP for Anxiety Disorders.',
    4,
    NOW()
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.blog_posts (
    title, slug, excerpt, content, featured_image_url, category_slug, category_name,
    tags, status, seo_title, seo_description, author_name, author_role, reading_time, published_at
) VALUES (
    'Early Warning Signs of Psychosis & Major Depressive Disorder (MDD)',
    'early-warning-signs-psychosis-major-depressive-disorder',
    'Recognizing subtle cognitive changes, social withdrawal, sleep breakdown, and depressive indicators for timely psychiatric medication and clinical care.',
    '<p class="lead">Severe psychiatric disorders like Major Depressive Disorder (MDD) and first-episode psychosis rarely develop overnight. Instead, they are preceded by weeks or months of subtle, escalating signs known clinically as the <em>prodromal phase</em>. Timely recognition and immediate psychiatric assessment under a qualified consultant psychiatrist dramatically improve long-term clinical recovery and protect brain architecture.</p>

<h2>Understanding the Prodrome of Psychosis</h2>
<p>Psychosis refers to a mental state where an individual''s perception and processing of reality are profoundly impaired. Common early prodromal markers include:</p>
<ul>
  <li><strong>Attenuated Psychotic Symptoms:</strong> Fleeting moments of hearing voices, seeing shadows, or sensing someone standing directly behind when alone.</li>
  <li><strong>Ideas of Reference:</strong> A burgeoning suspicion that everyday radio broadcasts, street signs, or social media posts contain hidden, personalized messages.</li>
  <li><strong>Deteriorating Executive Focus:</strong> Inability to maintain concentration at university or office; speech becoming unusually tangential or disjointed.</li>
  <li><strong>Dramatic Sleep Deprivation:</strong> Consecutive nights of near-zero sleep without feelings of exhaustion, accompanied by heightened emotional agitation.</li>
  <li><strong>Uncharacteristic Social Withdrawal:</strong> Abandoning close friendships, ceasing hygiene routines, and expressing intense distrust of family members.</li>
</ul>

<h2>Major Depressive Disorder (MDD): More Than Transient Sadness</h2>
<p>Major Depressive Disorder is a debilitating neurobiological condition involving severe chemical and structural dysregulation across hippocampal and prefrontal circuits. Clinical diagnostic criteria encompass:</p>
<ul>
  <li><strong>Pervasive Anhedonia:</strong> Total absence of joy or interest in activities once passionately enjoyed.</li>
  <li><strong>Somatic Energy Depletion:</strong> Severe psychomotor retardation; feeling as though limbs are weighed down by lead.</li>
  <li><strong>Sleep & Appetite Disruption:</strong> Early morning awakening (terminal insomnia) accompanied by pervasive morning dread or marked weight shifts.</li>
  <li><strong>Excessive Guilt & Worthlessness:</strong> Irrational self-blame, feelings of being an intolerable burden to one''s loved ones.</li>
  <li><strong>Passive or Active Suicidal Ideation:</strong> Recurring thoughts that "everyone would be better off if I didn''t wake up tomorrow."</li>
</ul>

<h2>The Crucial Difference Between Clinical MDD and Psychotic Depression</h2>
<p>In severe clinical presentations, unipolar depression can develop psychotic features—such as nihilistic delusions (believing one''s body is diseased or decaying) or auditory hallucinations commanding self-harm. In such critical circumstances, immediate medical inpatient evaluation is mandatory.</p>

<h2>Evidence-Based Multidisciplinary Intervention at NiDAA Clinic</h2>
<p>Under the leadership of <strong>Dr. Bilal Warraich (Medical Director)</strong> and our senior psychotherapists, NiDAA Clinic provides comprehensive psychiatric evaluation:</p>
<ul>
  <li><strong>Precision Pharmacotherapy:</strong> Modern, well-tolerated second-generation antipsychotics and SSRI/SNRI antidepressants tailored to minimize metabolic or sedative side effects.</li>
  <li><strong>Inpatient Protective Stabilization:</strong> Peaceful, private residential environment ensuring complete physical safety during acute mental health crises.</li>
  <li><strong>Individual Psychotherapy:</strong> Once acute symptoms stabilize, gentle supportive counseling and cognitive restructuring begin.</li>
</ul>

<h2>24/7 Crisis Support in Lahore</h2>
<p>If you observe sudden personality shifts, intense paranoia, or debilitating depressive paralysis in a loved one, do not wait. Contact NiDAA Clinic immediately at <strong>0321 7507866</strong> for confidential psychiatric evaluation.</p>',
    '/assets/images/service_psychiatric.jpg',
    'neuropsychiatry',
    'neuropsychiatry',
    ARRAY['psychosis symptoms', 'mdd depression', 'psychiatrist in lahore', 'mental health crisis', 'dr bilal warraich'],
    'published',
    'Early Warning Signs of Psychosis & Major Depressive Disorder | NiDAA Clinic',
    'Recognizing subtle cognitive changes, sleep breakdown, and depressive indicators for timely psychiatric care in Lahore at NiDAA Clinic.',
    'Miss Ayesha Ishaq',
    'Clinical Psychologist, Specialist in Neuropsychiatric Evaluation and Crisis Intervention.',
    6,
    NOW()
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.blog_posts (
    title, slug, excerpt, content, featured_image_url, category_slug, category_name,
    tags, status, seo_title, seo_description, author_name, author_role, reading_time, published_at
) VALUES (
    'Breaking Codependency: How Families Heal During Addiction Recovery',
    'breaking-codependency-families-heal-addiction-recovery',
    'Transforming unhealthy enabling dynamics into constructive boundaries, emotional empowerment, and supportive family communication systems.',
    '<p class="lead">Addiction is fundamentally a systemic family disease. When a loved one battles severe chemical dependency or compulsive behavior, the entire family system reorganizes around the crisis. Spouses, parents, and siblings often slip unknowingly into patterns of <em>codependency and enabling</em>—sacrificing their own emotional, financial, and mental health in a desperate attempt to rescue the addicted individual.</p>

<h2>What is Codependency in the Context of Addiction?</h2>
<p>Codependency occurs when family members become so obsessively preoccupied with controlling, hiding, or fixing another person''s addiction that their own lives become unmanageable. Common signs include:</p>
<ul>
  <li>Walking on eggshells at home to prevent emotional outbursts or substance binges</li>
  <li>Covering up legal, financial, or employment disasters caused by substance use</li>
  <li>Experiencing chronic anxiety, panic, and sleepless nights while hyper-monitoring the addicted person</li>
  <li>Feeling extreme guilt whenever attempting to establish personal boundaries or say "no"</li>
  <li>Equating genuine love with self-sacrifice, endurance of abuse, and financial bailouts</li>
</ul>

<h2>Enabling vs. Helping: Understanding the Critical Distinction</h2>
<p>The difference between helping and enabling can be subtle but has life-or-death implications:</p>
<table style="width:100%; border-collapse: collapse; margin: 1.5rem 0;">
  <thead>
    <tr style="background: rgba(186,24,30,0.1); border-bottom: 2px solid #BA181E;">
      <th style="padding: 10px; text-align: left;">Constructive Helping</th>
      <th style="padding: 10px; text-align: left;">Destructive Enabling</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #E5E7EB;">
      <td style="padding: 10px;">Paying for licensed medical inpatient rehabilitation</td>
      <td style="padding: 10px;">Paying off drug debts, fines, or supplying daily unmonitored cash</td>
    </tr>
    <tr style="border-bottom: 1px solid #E5E7EB;">
      <td style="padding: 10px;">Holding the patient accountable for their own behavioral recovery</td>
      <td style="padding: 10px;">Making excuses to employers, teachers, or extended family</td>
    </tr>
    <tr style="border-bottom: 1px solid #E5E7EB;">
      <td style="padding: 10px;">Setting firm boundaries: "You cannot live in our home while actively using."</td>
      <td style="padding: 10px;">Allowing drugs or active substance use in the house to avoid a scene</td>
    </tr>
  </tbody>
</table>

<h2>How Family Systems Therapy Heals the Home</h2>
<p>At NiDAA Clinic, our clinical psychology department conducts structured family therapy sessions alongside inpatient treatment:</p>
<ul>
  <li><strong>De-escalating Chronic Hypervigilance:</strong> Teaching family members somatic calming techniques to overcome caregiver post-traumatic stress.</li>
  <li><strong>Establishing Non-Negotiable Boundaries:</strong> Empowering parents and spouses to state clear, loving limits without guilt or anger.</li>
  <li><strong>Dismantling Manipulation:</strong> Educating relatives on the psychological defenses of addiction (denial, gaslighting, projection) so they are no longer deceived.</li>
  <li><strong>Rebuilding Mutual Trust:</strong> Creating gradual milestones where trust is re-earned through verified biological screens and behavioral consistency.</li>
</ul>

<h2>Begin Family Healing Today</h2>
<p>You do not have to endure the agony of addiction alone. NiDAA Clinic provides confidential family counseling, intervention coordination, and comprehensive inpatient addiction treatment in Lahore. Call our senior team 24/7 at <strong>0321 7507866</strong>.</p>',
    '/assets/images/rehabilitation_session.jpg',
    'family-systems',
    'family systems',
    ARRAY['family therapy', 'codependency', 'addiction recovery', 'family counseling lahore', 'ayesha ishaq'],
    'published',
    'Breaking Codependency: How Families Heal During Addiction Recovery | NiDAA Clinic',
    'Transforming unhealthy enabling dynamics into constructive boundaries and family healing during addiction recovery at NiDAA Clinic Lahore.',
    'Miss Ayesha Ishaq',
    'Clinical Psychologist, Specialist in Family Systems Therapy and Codependency Recovery.',
    5,
    NOW()
) ON CONFLICT (slug) DO NOTHING;
