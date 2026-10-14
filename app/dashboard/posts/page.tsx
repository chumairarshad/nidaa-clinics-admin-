'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: 'draft' | 'published' | 'archived' | 'trash';
  category_name: string | null;
  category_slug: string | null;
  author_name: string;
  featured_image_url: string | null;
  reading_time: number;
  published_at: string | null;
  trashed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export default function PostsManagementPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived' | 'trash'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Trash & Delete Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'trash' | 'permanent';
    post: BlogPost | null;
  }>({
    isOpen: false,
    type: 'trash',
    post: null,
  });

  useEffect(() => {
    fetchPostsAndCategories();
  }, []);

  async function fetchPostsAndCategories() {
    setLoading(true);
    try {
      const supabase = createClient();
      const [postsRes, catsRes] = await Promise.all([
        supabase.from('blog_posts').select('*').order('created_at', { ascending: false }),
        supabase.from('blog_categories').select('id, name, slug').order('name'),
      ]);

      let loadedPosts: BlogPost[] = [];

      if (postsRes.data && postsRes.data.length > 0) {
        loadedPosts = postsRes.data;
      } else {
        // Fallback to local CMS store API
        try {
          const apiRes = await fetch('/api/blog/posts?limit=100');
          if (apiRes.ok) {
            const apiJson = await apiRes.json();
            if (apiJson.data && Array.isArray(apiJson.data)) {
              loadedPosts = apiJson.data;
            }
          }
        } catch {
          // ignore
        }
      }

      setPosts(loadedPosts);

      if (catsRes.data && catsRes.data.length > 0) {
        setCategories(catsRes.data);
      } else {
        setCategories([
          { id: '1', name: 'Addiction Detox', slug: 'addiction-detox' },
          { id: '2', name: 'Clinical Psychology', slug: 'clinical-psychology' },
          { id: '3', name: 'Neuropsychiatry', slug: 'neuropsychiatry' },
          { id: '4', name: 'Family Systems', slug: 'family-systems' },
          { id: '5', name: 'Psychiatric Care', slug: 'psychiatric-care' },
        ]);
      }
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setActionMessage({ type: 'error', text: 'Failed to load posts from database.' });
    } finally {
      setLoading(false);
    }
  }

  // Open Modal to Move to Trash (30 Days retention)
  function promptMoveToTrash(post: BlogPost) {
    setConfirmModal({
      isOpen: true,
      type: 'trash',
      post,
    });
  }

  // Open Modal for Permanent Purge
  function promptPermanentDelete(post: BlogPost) {
    setConfirmModal({
      isOpen: true,
      type: 'permanent',
      post,
    });
  }

  // Execute Move to Trash
  async function handleConfirmTrash() {
    if (!confirmModal.post) return;
    const post = confirmModal.post;
    setDeletingId(post.id);
    setConfirmModal({ isOpen: false, type: 'trash', post: null });

    const trashedAt = new Date().toISOString();

    try {
      const supabase = createClient();
      await supabase
        .from('blog_posts')
        .update({ status: 'trash', trashed_at: trashedAt, updated_at: trashedAt })
        .eq('id', post.id);

      // Also notify local API
      try {
        await fetch(`/api/blog/posts?id=${encodeURIComponent(post.id)}`, {
          method: 'DELETE',
        });
      } catch {
        // ignore
      }

      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: 'trash', trashed_at: trashedAt } : p))
      );

      setActionMessage({
        type: 'success',
        text: `"${post.title}" moved to Trash. It will be automatically deleted after 30 days.`,
      });

      triggerRevalidation(post.slug);
    } catch (err: any) {
      console.error('Trash error:', err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to move post to Trash.' });
    } finally {
      setDeletingId(null);
    }
  }

  // Execute Restore from Trash
  async function handleRestorePost(post: BlogPost) {
    try {
      const supabase = createClient();
      await supabase
        .from('blog_posts')
        .update({ status: 'draft', trashed_at: null, updated_at: new Date().toISOString() })
        .eq('id', post.id);

      try {
        await fetch('/api/blog/posts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: post.id, action: 'restore', status: 'draft' }),
        });
      } catch {
        // ignore
      }

      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: 'draft', trashed_at: null } : p))
      );

      setActionMessage({
        type: 'success',
        text: `Article "${post.title}" restored to Drafts successfully.`,
      });
    } catch (err: any) {
      console.error('Restore error:', err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to restore post.' });
    }
  }

  // Execute Permanent Delete
  async function handleConfirmPermanentDelete() {
    if (!confirmModal.post) return;
    const post = confirmModal.post;
    setDeletingId(post.id);
    setConfirmModal({ isOpen: false, type: 'permanent', post: null });

    try {
      const supabase = createClient();
      await supabase.from('blog_posts').delete().eq('id', post.id);

      try {
        await fetch(`/api/blog/posts?id=${encodeURIComponent(post.id)}&permanent=true`, {
          method: 'DELETE',
        });
      } catch {
        // ignore
      }

      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      setActionMessage({ type: 'success', text: `Article "${post.title}" permanently deleted.` });

      triggerRevalidation();
    } catch (err: any) {
      console.error('Delete error:', err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete post.' });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleStatus(post: BlogPost) {
    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    const nextPublishedAt = nextStatus === 'published' ? (post.published_at || new Date().toISOString()) : post.published_at;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('blog_posts')
        .update({
          status: nextStatus,
          published_at: nextPublishedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      if (error) throw error;

      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: nextStatus, published_at: nextPublishedAt } : p))
      );

      setActionMessage({
        type: 'success',
        text: `Article status changed to ${nextStatus.toUpperCase()}.`,
      });

      triggerRevalidation(post.slug);
    } catch (err: any) {
      console.error('Status update error:', err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to update status.' });
    }
  }

  async function triggerRevalidation(slug?: string) {
    try {
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, path: '/blog' }),
      });
    } catch (e) {
      console.warn('Revalidation webhook ping attempted:', e);
    }
  }

  // Filtered posts calculation
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (post.excerpt && post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())) ||
      post.slug.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'all') {
      matchesStatus = post.status !== 'trash'; // Exclude trash from main overview
    } else {
      matchesStatus = post.status === statusFilter;
    }

    const matchesCategory = categoryFilter === 'all' || post.category_slug === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const trashCount = posts.filter((p) => p.status === 'trash').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
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
          <span className="nidaa-pill" style={{ marginBottom: '0.4rem' }}>
            Content Management
          </span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
            Blog Articles
          </h1>
          <p style={{ color: '#4B5563', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage clinical articles, drafts, categories, and live public publishing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => fetchPostsAndCategories()}
            className="nidaa-btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            Refresh
          </button>
          <Link href="/dashboard/posts/new" className="nidaa-btn-primary">
            New Article
          </Link>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: actionMessage.type === 'success' ? '#DCFCE7' : '#FEF2F2',
            border: actionMessage.type === 'success' ? '1px solid #BBF7D0' : '1px solid #FECACA',
            color: actionMessage.type === 'success' ? '#15803D' : '#BA181E',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
            <span>{actionMessage.type === 'success' ? '✓' : '!'}</span>
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
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

      {/* Filter and Search Bar */}
      <div
        className="nidaa-card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ flex: '1 1 300px', minWidth: '240px' }}>
          <input
            type="text"
            className="nidaa-input"
            placeholder="Search articles by title, slug, or summary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Status Filter */}
          <select
            className="nidaa-input"
            style={{ width: 'auto', padding: '0.65rem 1rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">
              All Active Articles ({posts.filter((p) => p.status !== 'trash').length})
            </option>
            <option value="published">
              Published ({posts.filter((p) => p.status === 'published').length})
            </option>
            <option value="draft">
              Drafts ({posts.filter((p) => p.status === 'draft').length})
            </option>
            <option value="archived">
              Archived ({posts.filter((p) => p.status === 'archived').length})
            </option>
            <option value="trash">
              Trash (30-Day Retention) ({trashCount})
            </option>
          </select>

          {/* Category Filter */}
          <select
            className="nidaa-input"
            style={{ width: 'auto', padding: '0.65rem 1rem' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Posts Table / List */}
      <div className="nidaa-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
            <p>Loading clinical articles from database...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>
              {statusFilter === 'trash' ? 'Trash is Empty' : 'No Articles Found'}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', maxWidth: '450px', margin: '0 auto 1.5rem auto' }}>
              {statusFilter === 'trash'
                ? 'No articles are currently in the 30-day trash retention bin.'
                : searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search criteria or resetting the filters.'
                : 'No articles have been created yet. Click below to create your first article.'}
            </p>
            {statusFilter !== 'trash' && (
              <Link href="/dashboard/posts/new" className="nidaa-btn-primary">
                Create Article
              </Link>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="nidaa-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Article Title &amp; Details</th>
                  <th style={{ width: '15%' }}>Category</th>
                  <th style={{ width: '15%' }}>Status</th>
                  <th style={{ width: '15%' }}>
                    {statusFilter === 'trash' ? 'Trashed Date' : 'Publication Date'}
                  </th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <div>
                        {post.status !== 'trash' ? (
                          <Link
                            href={`/dashboard/posts/${post.id}/edit`}
                            style={{
                              color: '#111827',
                              fontWeight: 700,
                              textDecoration: 'none',
                              fontSize: '0.95rem',
                              display: 'block',
                              marginBottom: '0.25rem',
                            }}
                          >
                            {post.title}
                          </Link>
                        ) : (
                          <span
                            style={{
                              color: '#9CA3AF',
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              display: 'block',
                              marginBottom: '0.25rem',
                              textDecoration: 'line-through',
                            }}
                          >
                            {post.title}
                          </span>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.75rem',
                            color: '#6B7280',
                          }}
                        >
                          <span>/{post.slug}</span>
                          <span>•</span>
                          <span>{post.author_name}</span>
                          <span>•</span>
                          <span>{post.reading_time || 4} min read</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#FF8F94',
                          background: 'rgba(196, 22, 28, 0.15)',
                          border: '1px solid rgba(196, 22, 28, 0.3)',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '9999px',
                        }}
                      >
                        {post.category_name || 'General'}
                      </span>
                    </td>

                    <td>
                      {post.status === 'trash' ? (
                        <span
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            color: '#F87171',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '9999px',
                            padding: '0.3rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            display: 'inline-block',
                          }}
                        >
                          TRASH (30 DAYS)
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(post)}
                          title="Click to toggle published / draft status"
                          style={{
                            background:
                              post.status === 'published'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : post.status === 'draft'
                                ? 'rgba(245, 158, 11, 0.2)'
                                : 'rgba(156, 163, 175, 0.2)',
                            color:
                              post.status === 'published'
                                ? '#34D399'
                                : post.status === 'draft'
                                ? '#FBBF24'
                                : '#9CA3AF',
                            border: `1px solid ${
                              post.status === 'published'
                                ? 'rgba(16, 185, 129, 0.4)'
                                : post.status === 'draft'
                                ? 'rgba(245, 158, 11, 0.4)'
                                : 'rgba(156, 163, 175, 0.4)'
                            }`,
                            borderRadius: '9999px',
                            padding: '0.3rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <span>{post.status === 'published' ? '●' : '○'}</span>
                          <span>{post.status}</span>
                        </button>
                      )}
                    </td>

                    <td style={{ fontSize: '0.825rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      {post.status === 'trash' ? (
                        <div>
                          <div style={{ color: '#F87171', fontWeight: 600 }}>
                            {post.trashed_at
                              ? new Date(post.trashed_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Recently'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                            Auto-purges in 30 days
                          </div>
                        </div>
                      ) : post.published_at ? (
                        new Date(post.published_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      ) : (
                        'Unpublished'
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                        {post.status === 'trash' ? (
                          <>
                            <button
                              onClick={() => handleRestorePost(post)}
                              title="Restore article to Drafts"
                              style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '8px',
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#34D399',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => promptPermanentDelete(post)}
                              title="Delete permanently from database"
                              style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '8px',
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#F87171',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Delete Forever
                            </button>
                          </>
                        ) : (
                          <>
                            {post.status === 'published' && (
                              <a
                                href={`https://nidaclinic.com/blog/${post.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View published article on live website"
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '8px',
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  color: '#FFFFFF',
                                  textDecoration: 'none',
                                  fontSize: '0.8rem',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                }}
                              >
                                View
                              </a>
                            )}

                            <Link
                              href={`/dashboard/posts/${post.id}/edit`}
                              title="Edit article"
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '8px',
                                background: 'rgba(196, 22, 28, 0.25)',
                                color: '#FF8F94',
                                textDecoration: 'none',
                                fontSize: '0.8rem',
                                border: '1px solid rgba(196, 22, 28, 0.4)',
                                fontWeight: 600,
                              }}
                            >
                              Edit
                            </Link>

                            <button
                              onClick={() => promptMoveToTrash(post)}
                              disabled={deletingId === post.id}
                              title="Move article to Trash (30 days retention)"
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '8px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#F87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                              }}
                            >
                              {deletingId === post.id ? '...' : 'Trash'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal Popup for Trash & Permanent Deletion */}
      {confirmModal.isOpen && confirmModal.post && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmModal({ isOpen: false, type: 'trash', post: null });
            }
          }}
        >
          <div
            className="nidaa-card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '20px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                color: '#BA181E',
                fontSize: '1.35rem',
                fontWeight: 800,
              }}
            >
              !
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0' }}>
              {confirmModal.type === 'trash' ? 'Move Article to Trash?' : 'Permanently Delete Article?'}
            </h3>

            <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
              {confirmModal.type === 'trash' ? (
                <>
                  Are you sure you want to move <strong>"{confirmModal.post.title}"</strong> to Trash?
                  <br />
                  <br />
                  This article will be unlisted from the live website immediately and moved into the 30-day retention trash bin.
                  You can restore it anytime within 30 days before it is permanently purged.
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete <strong>"{confirmModal.post.title}"</strong>?
                  <br />
                  <br />
                  This action <strong>cannot be undone</strong>. The article content and associated SEO metadata will be permanently erased.
                </>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, type: 'trash', post: null })}
                className="nidaa-btn-secondary"
                style={{ fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.type === 'trash' ? handleConfirmTrash : handleConfirmPermanentDelete}
                className="nidaa-btn-primary"
                style={{
                  fontSize: '0.875rem',
                  background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                }}
              >
                {confirmModal.type === 'trash' ? 'Move to Trash (30 Days)' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
