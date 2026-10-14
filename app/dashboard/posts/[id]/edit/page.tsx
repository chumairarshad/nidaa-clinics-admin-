'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PostEditor from '@/components/PostEditor';
import { createClient } from '@/lib/supabase/client';

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;

  const [postData, setPostData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPost() {
      if (!postId) return;
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (queryError || !data) {
          // Attempt fallback to local API
          let foundViaApi = false;
          try {
            const apiRes = await fetch(`/api/blog/posts?id=${encodeURIComponent(postId)}`);
            if (apiRes.ok) {
              const resJson = await apiRes.json();
              if (resJson.data) {
                setPostData(resJson.data);
                foundViaApi = true;
              }
            }
          } catch {
            // Ignore API fetch error
          }

          if (foundViaApi) return;

          // If not found in Supabase (or using default demo post)
          if (postId === 'default-welcome-1' || postId === '1') {
            setPostData({
              id: postId,
              title: 'Welcome to NiDAA Clinic: Evidence-Based Psychiatric Care & Clinical Excellence',
              slug: 'welcome-to-nidaa-clinic-blog',
              excerpt:
                'NiDAA Clinic provides premier psychiatric evaluation, inpatient addiction rehabilitation, and cognitive-behavioral clinical services.',
              content:
                'NiDAA Clinic represents a paradigm shift in specialized psychiatric treatment, psychological counseling, and addiction medicine. Our multidisciplinary medical team combines advanced pharmacological stabilization with cognitive-behavioral therapy and compassion-first rehabilitation.\n\n## Our Clinical Focus Areas\n\n- Comprehensive psychiatric diagnostic assessments\n- Personalized inpatient detoxification & recovery programs\n- Adult and child clinical psychology\n- Dual-diagnosis mental health care',
              featured_image_url: '/assets/images/service-bg-3.jpg',
              category_id: '1',
              category_slug: 'psychiatric-care',
              category_name: 'Psychiatric Care',
              status: 'published',
              seo_title: 'Welcome to NiDAA Clinic | Evidence-Based Psychiatric Care',
              seo_description:
                'NiDAA Clinic provides premier psychiatric evaluation, inpatient addiction rehabilitation, and clinical psychology in Lahore.',
              author_name: 'Dr. Bilal Warraich',
              author_role: 'Consultant Psychiatrist & Medical Director',
              author_avatar: '/assets/images/dr_bilal_warraich.jpg',
              reading_time: 4,
              published_at: new Date().toISOString(),
            });
          } else {
            setError('Post not found in database.');
          }
        } else {
          setPostData(data);
        }
      } catch (err: any) {
        console.error('Error fetching post:', err);
        setError(err.message || 'Failed to load post.');
      } finally {
        setLoading(false);
      }
    }

    void loadPost();
  }, [postId]);

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center', color: '#FFFFFF' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <p>Loading article details from database...</p>
      </div>
    );
  }

  if (error || !postData) {
    return (
      <div className="nidaa-card" style={{ maxWidth: '600px', margin: '4rem auto', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.75rem' }}>
          Article Not Found
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {error || 'The requested article could not be located in Supabase.'}
        </p>
        <button
          onClick={() => router.push('/dashboard/posts')}
          className="nidaa-btn-primary"
        >
          ← Return to Articles List
        </button>
      </div>
    );
  }

  return <PostEditor initialData={postData} isEditMode={true} />;
}
