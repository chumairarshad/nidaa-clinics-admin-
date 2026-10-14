'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface PostEditorProps {
  initialData?: {
    id?: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    featured_image_url: string;
    category_id: string;
    category_slug: string;
    category_name: string;
    status: 'draft' | 'published' | 'archived';
    seo_title: string;
    seo_description: string;
    author_name: string;
    author_role: string;
    author_avatar: string;
    reading_time: number;
    published_at: string | null;
  };
  isEditMode?: boolean;
}

export default function PostEditor({ initialData, isEditMode = false }: PostEditorProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Form states
  const [title, setTitle] = useState(initialData?.title || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [isAutoSlug, setIsAutoSlug] = useState(!isEditMode);
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [featuredImageUrl, setFeaturedImageUrl] = useState(initialData?.featured_image_url || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialData?.category_id || '');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(initialData?.status || 'draft');
  const [publishedAt, setPublishedAt] = useState(
    initialData?.published_at ? initialData.published_at.slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [seoTitle, setSeoTitle] = useState(initialData?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(initialData?.seo_description || '');
  const [authorName, setAuthorName] = useState(initialData?.author_name || 'Dr. Bilal Warraich');
  const [authorRole, setAuthorRole] = useState(
    initialData?.author_role || 'Consultant Psychiatrist & Medical Director'
  );
  const [authorAvatar, setAuthorAvatar] = useState(
    initialData?.author_avatar || '/assets/images/dr_bilal_warraich.jpg'
  );

  // UI States
  const [categories, setCategories] = useState<Category[]>([]);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Synchronize form states when initialData arrives or changes
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setSlug(initialData.slug || '');
      setExcerpt(initialData.excerpt || '');
      setContent(initialData.content || (initialData as any).contentHTML || '');
      setFeaturedImageUrl(
        initialData.featured_image_url ||
          (initialData as any).coverImage?.url ||
          ''
      );
      setSelectedCategoryId(initialData.category_id || (initialData as any).category_slug || '');
      setStatus(initialData.status || 'draft');
      if (initialData.published_at) {
        setPublishedAt(initialData.published_at.slice(0, 16));
      }
      setSeoTitle(initialData.seo_title || (initialData as any).seo?.metaTitle || '');
      setSeoDescription(initialData.seo_description || (initialData as any).seo?.metaDescription || '');
      setAuthorName(initialData.author_name || (initialData as any).author?.name || 'Dr. Bilal Warraich');
      setAuthorRole(initialData.author_role || (initialData as any).author?.role || 'Consultant Psychiatrist');
      setAuthorAvatar(initialData.author_avatar || (initialData as any).author?.avatar || '/assets/images/dr_bilal_warraich.jpg');
    }
  }, [initialData]);

  // Fetch categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('blog_categories').select('id, name, slug').order('display_order');
        if (data && data.length > 0) {
          setCategories(data);
          if (!selectedCategoryId) {
            setSelectedCategoryId(data[0].id);
          }
        } else {
          // Defaults
          const defaultCats = [
            { id: '1', name: 'Psychiatric Care', slug: 'psychiatric-care' },
            { id: '2', name: 'Addiction Recovery', slug: 'addiction-recovery' },
            { id: '3', name: 'Mental Health & Wellness', slug: 'mental-health' },
            { id: '4', name: 'Clinical Psychology', slug: 'clinical-psychology' },
          ];
          setCategories(defaultCats);
          if (!selectedCategoryId) setSelectedCategoryId(defaultCats[0].id);
        }
      } catch (err) {
        console.warn('Could not load categories:', err);
      }
    }
    void loadCategories();
  }, [selectedCategoryId]);

  // Title to slug generator
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (isAutoSlug) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  };

  // Insert markdown formatting into textarea
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = content.substring(start, end);
    const replacement = `${prefix}${selection || 'text'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selection ? selection.length : 4));
    }, 10);
  };

  // Image Upload to Supabase Storage bucket 'blog-media'
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setNotification({ type: 'error', message: 'Image size exceeds 5MB limit.' });
      return;
    }

    setUploadingImage(true);
    setNotification(null);

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `featured/${fileName}`;

      const { data, error } = await supabase.storage.from('blog-media').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        // If storage bucket is missing or unconfigured, fallback to preview via object URL
        console.warn('Supabase storage upload error:', error);
        const reader = new FileReader();
        reader.onloadend = () => {
          setFeaturedImageUrl(reader.result as string);
          setNotification({
            type: 'success',
            message: 'Image loaded locally (Storage bucket policy setup recommended in production).',
          });
        };
        reader.readAsDataURL(file);
      } else {
        const { data: urlData } = supabase.storage.from('blog-media').getPublicUrl(filePath);
        setFeaturedImageUrl(urlData.publicUrl);
        setNotification({ type: 'success', message: 'Featured image uploaded to Supabase Storage successfully.' });
      }
    } catch (err: any) {
      console.error('Storage upload exception:', err);
      setNotification({ type: 'error', message: 'Image upload failed. You can also paste an image URL directly.' });
    } finally {
      setUploadingImage(false);
    }
  };

  // Calculate estimated reading time
  const readingTime = Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200));

  // Save handler (draft or publish)
  const handleSubmit = async (e: React.FormEvent, targetStatus?: 'draft' | 'published') => {
    e.preventDefault();

    const saveStatus = targetStatus || status;

    if (!title.trim()) {
      setNotification({ type: 'error', message: 'Article title is required.' });
      return;
    }

    if (!slug.trim()) {
      setNotification({ type: 'error', message: 'Article slug is required.' });
      return;
    }

    if (!content.trim()) {
      setNotification({ type: 'error', message: 'Article content cannot be empty.' });
      return;
    }

    setSaving(true);
    setNotification(null);

    try {
      const supabase = createClient();
      const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

      const postPayload: any = {
        title: title.trim(),
        slug: slug.trim().toLowerCase(),
        excerpt: excerpt.trim() || title.trim(),
        content: content.trim(),
        featured_image_url: featuredImageUrl.trim() || '/assets/images/service-bg-3.jpg',
        category_id: selectedCategory ? selectedCategory.id : null,
        category_slug: selectedCategory ? selectedCategory.slug : 'clinical-psychology',
        category_name: selectedCategory ? selectedCategory.name : 'Clinical Psychology',
        status: saveStatus,
        seo_title: seoTitle.trim() || title.trim(),
        seo_description: seoDescription.trim() || excerpt.trim(),
        author_name: authorName.trim() || 'Dr. Bilal Warraich',
        author_role: authorRole.trim() || 'Consultant Psychiatrist',
        author_avatar: authorAvatar.trim() || '/assets/images/dr_bilal_warraich.jpg',
        reading_time: readingTime,
        word_count: content.split(/\s+/).filter(Boolean).length,
        updated_at: new Date().toISOString(),
      };

      if (saveStatus === 'published') {
        postPayload.published_at = publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString();
      }

      let savedId = initialData?.id;

      if (isEditMode && initialData?.id) {
        const { error } = await supabase.from('blog_posts').update(postPayload).eq('id', initialData.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('blog_posts').insert([postPayload]).select().single();
        if (error) throw error;
        if (data) savedId = data.id;
      }

      // Trigger cache revalidation on the main website via secure server-side API proxy
      try {
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: postPayload.slug, path: '/blog' }),
        });
      } catch (e) {
        console.warn('Cache revalidation trigger attempted:', e);
      }

      setNotification({
        type: 'success',
        message:
          saveStatus === 'published'
            ? 'Article published and synchronized to main website!'
            : 'Article draft saved successfully.',
      });

      setTimeout(() => {
        router.push('/dashboard/posts');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error('Save article error:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to save article. Please check your Supabase permissions.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Breadcrumb & Actions */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Link
              href="/dashboard/posts"
              style={{ color: '#BA181E', textDecoration: 'none', fontSize: '0.825rem', fontWeight: 600 }}
            >
              ← Back to Articles
            </Link>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
            {isEditMode ? 'Edit Clinical Article' : 'Compose New Article'}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'draft')}
            disabled={saving}
            className="nidaa-btn-secondary"
            style={{ fontSize: '0.875rem' }}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'published')}
            disabled={saving}
            className="nidaa-btn-primary"
            style={{ fontSize: '0.875rem' }}
          >
            {saving ? 'Publishing...' : 'Publish Article'}
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: notification.type === 'success' ? '#DCFCE7' : '#FEF2F2',
            border: notification.type === 'success' ? '1px solid #BBF7D0' : '1px solid #FECACA',
            color: notification.type === 'success' ? '#15803D' : '#BA181E',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
            <span>{notification.type === 'success' ? '✓' : '!'}</span>
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Editor Grid: Main Form (Left 70%) & Sidebar Controls (Right 30%) */}
      <form onSubmit={(e) => handleSubmit(e)} style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
        {/* Left Column: Title, Slug, Excerpt, Content Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Article Title */}
          <div className="nidaa-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.5rem',
              }}
            >
              Article Title *
            </label>
            <input
              type="text"
              className="nidaa-input"
              placeholder="e.g. Cognitive Behavioral Interventions for Severe Clinical Anxiety..."
              value={title}
              onChange={handleTitleChange}
              style={{ fontSize: '1.25rem', fontWeight: 700, padding: '0.85rem 1rem' }}
              required
            />

            {/* Slug URL Row */}
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.825rem', color: '#6B7280' }}>
                https://nidaclinic.com/blog/
              </span>
              <input
                type="text"
                className="nidaa-input"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setIsAutoSlug(false);
                }}
                placeholder="article-slug"
                style={{ flex: 1, minWidth: '180px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                required
              />
              <button
                type="button"
                onClick={() => {
                  setIsAutoSlug(true);
                  setSlug(
                    title
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '')
                  );
                }}
                style={{
                  background: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  color: '#374151',
                  borderRadius: '8px',
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Auto-Slug
              </button>
            </div>
          </div>

          {/* Excerpt */}
          <div className="nidaa-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.5rem',
              }}
            >
              Short Excerpt / Clinical Abstract
            </label>
            <textarea
              className="nidaa-input"
              rows={3}
              placeholder="A brief 1-2 sentence overview shown on blog cards and search engine listings..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              style={{ lineHeight: 1.5, color: '#1F2937' }}
            />
          </div>

          {/* Rich Content Editor */}
          <div className="nidaa-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #E5E7EB',
                paddingBottom: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditorTab('write')}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: editorTab === 'write' ? '#FEF2F2' : 'transparent',
                    color: editorTab === 'write' ? '#BA181E' : '#4B5563',
                    border: editorTab === 'write' ? '1px solid #FECACA' : '1px solid transparent',
                  }}
                >
                  Write Content
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('preview')}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: editorTab === 'preview' ? '#FEF2F2' : 'transparent',
                    color: editorTab === 'preview' ? '#BA181E' : '#4B5563',
                    border: editorTab === 'preview' ? '1px solid #FECACA' : '1px solid transparent',
                  }}
                >
                  Live Preview
                </button>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                {content.split(/\s+/).filter(Boolean).length} words &bull; ~{readingTime} min read
              </div>
            </div>

            {editorTab === 'write' ? (
              <>
                {/* Editor Toolbar */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.4rem',
                    background: '#F9FAFB',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    marginBottom: '0.75rem',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => insertFormatting('## ')}
                    style={toolbarBtnStyle}
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('### ')}
                    style={toolbarBtnStyle}
                    title="Heading 3"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    style={toolbarBtnStyle}
                    title="Bold"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*')}
                    style={toolbarBtnStyle}
                    title="Italic"
                  >
                    <em>I</em>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('- ')}
                    style={toolbarBtnStyle}
                    title="Bullet List"
                  >
                    &bull; List
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('1. ')}
                    style={toolbarBtnStyle}
                    title="Numbered List"
                  >
                    1. List
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('> ')}
                    style={toolbarBtnStyle}
                    title="Quote"
                  >
                    “ Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('[Link Title](https://', ')')}
                    style={toolbarBtnStyle}
                    title="Link"
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('```\n', '\n```')}
                    style={toolbarBtnStyle}
                    title="Code block"
                  >
                    &lt;/&gt;
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  className="nidaa-input"
                  rows={16}
                  placeholder="Write clinical content in Markdown or formatted text here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{
                    fontFamily: 'monospace, sans-serif',
                    lineHeight: 1.8,
                    fontSize: '0.95rem',
                    color: '#1F2937', /* Charcoal Black */
                    backgroundColor: '#FFFFFF',
                  }}
                  required
                />
              </>
            ) : (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  minHeight: '380px',
                  lineHeight: 1.8,
                  color: '#1F2937', /* Charcoal Black */
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {content || <em style={{ color: '#9CA3AF' }}>No content entered yet.</em>}
                </div>
              </div>
            )}
          </div>

          {/* SEO Metadata Section */}
          <div className="nidaa-card" style={{ padding: '1.75rem', backgroundColor: '#FFFFFF' }}>
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#111827',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              Technical SEO &amp; Social Metadata
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                    SEO Meta Title
                  </label>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: seoTitle.length > 60 ? '#BA181E' : '#6B7280',
                    }}
                  >
                    {seoTitle.length} / 60 recommended
                  </span>
                </div>
                <input
                  type="text"
                  className="nidaa-input"
                  placeholder={title || 'NiDAA Clinic | Article Title'}
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                    SEO Meta Description
                  </label>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: seoDescription.length > 160 ? '#BA181E' : '#6B7280',
                    }}
                  >
                    {seoDescription.length} / 160 recommended
                  </span>
                </div>
                <textarea
                  className="nidaa-input"
                  rows={3}
                  placeholder={excerpt || 'Brief search snippet describing the clinical findings...'}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Publishing Settings, Image, Category, Author */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Publishing Box */}
          <div className="nidaa-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>
              Publication Status
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#4B5563', marginBottom: '0.3rem' }}>
                  Current Status
                </label>
                <select
                  className="nidaa-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="draft">Draft (Private)</option>
                  <option value="published">Published (Live on Website)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#4B5563', marginBottom: '0.3rem' }}>
                  Publish Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  className="nidaa-input"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
              </div>

              <div style={{ paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, 'published')}
                  disabled={saving}
                  className="nidaa-btn-primary"
                  style={{ width: '100%' }}
                >
                  {saving ? 'Processing...' : status === 'published' ? 'Update Published Article' : 'Publish to Live Site'}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, 'draft')}
                  disabled={saving}
                  className="nidaa-btn-secondary"
                  style={{ width: '100%' }}
                >
                  {saving ? 'Saving...' : 'Save Draft Only'}
                </button>
              </div>
            </div>
          </div>

          {/* Category Selector */}
          <div className="nidaa-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>
              Medical Category
            </h3>
            <select
              className="nidaa-input"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Featured Image */}
          <div className="nidaa-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>
              Featured Image
            </h3>

            {featuredImageUrl && (
              <div
                style={{
                  width: '100%',
                  height: '140px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginBottom: '1rem',
                  border: '1px solid #E5E7EB',
                  position: 'relative',
                  backgroundColor: '#F3F4F6',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featuredImageUrl}
                  alt="Featured preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="nidaa-btn-secondary"
                style={{ width: '100%', fontSize: '0.8rem' }}
              >
                {uploadingImage ? 'Uploading to Supabase...' : 'Upload Image File'}
              </button>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                  Or Direct Image URL:
                </label>
                <input
                  type="text"
                  className="nidaa-input"
                  placeholder="https://... or /assets/images/..."
                  value={featuredImageUrl}
                  onChange={(e) => setFeaturedImageUrl(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                />
              </div>
            </div>
          </div>

          {/* Author Details */}
          <div className="nidaa-card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>
              Author Profile
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                  Author Name
                </label>
                <input
                  type="text"
                  className="nidaa-input"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                  Author Title / Credentials
                </label>
                <input
                  type="text"
                  className="nidaa-input"
                  value={authorRole}
                  onChange={(e) => setAuthorRole(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

const toolbarBtnStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #D1D5DB',
  borderRadius: '6px',
  color: '#374151',
  padding: '0.35rem 0.6rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
  transition: 'background 0.2s',
};
