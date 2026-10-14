'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  created_at?: string;
}

export default function CategoriesManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setCategories(data);
      } else {
        // Fallback default clinical categories
        setCategories([
          {
            id: '1',
            name: 'Psychiatric Care',
            slug: 'psychiatric-care',
            description: 'Medical assessments, pharmacology, and psychiatric interventions.',
            display_order: 1,
          },
          {
            id: '2',
            name: 'Addiction Recovery',
            slug: 'addiction-recovery',
            description: 'Inpatient rehabilitation, detoxification, and relapse prevention.',
            display_order: 2,
          },
          {
            id: '3',
            name: 'Mental Health & Wellness',
            slug: 'mental-health',
            description: 'Holistic psychiatric well-being, mindfulness, and lifestyle health.',
            display_order: 3,
          },
          {
            id: '4',
            name: 'Clinical Psychology',
            slug: 'clinical-psychology',
            description: 'Cognitive behavioral therapy, counseling, and psychotherapy.',
            display_order: 4,
          },
        ]);
      }
    } catch (err: any) {
      console.error('Error loading categories:', err);
      setNotification({ type: 'error', message: 'Failed to load categories from database.' });
    } finally {
      setLoading(false);
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!editingId) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setDisplayOrder(cat.display_order || 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setDisplayOrder(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !slug.trim()) {
      setNotification({ type: 'error', message: 'Category Name and Slug are required.' });
      return;
    }

    setSaving(true);
    setNotification(null);

    try {
      const supabase = createClient();
      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim() || null,
        display_order: Number(displayOrder) || 0,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase.from('blog_categories').update(payload).eq('id', editingId);
        if (error) throw error;
        setNotification({ type: 'success', message: `Category "${name}" updated successfully.` });
      } else {
        const { error } = await supabase.from('blog_categories').insert([payload]);
        if (error) throw error;
        setNotification({ type: 'success', message: `Category "${name}" created successfully.` });
      }

      handleCancelEdit();
      fetchCategories();
    } catch (err: any) {
      console.error('Category save error:', err);
      setNotification({ type: 'error', message: err.message || 'Failed to save category.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from('blog_categories').delete().eq('id', id);
      if (error) throw error;

      setCategories((prev) => prev.filter((c) => c.id !== id));
      setNotification({ type: 'success', message: `Category "${catName}" deleted.` });
    } catch (err: any) {
      console.error('Category delete error:', err);
      setNotification({ type: 'error', message: err.message || 'Failed to delete category.' });
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <span className="nidaa-pill" style={{ marginBottom: '0.4rem' }}>
          Taxonomy &amp; Organization
        </span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
          Medical Categories
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Organize clinical articles into structured medical specialties and patient guidance topics.
        </p>
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
            background:
              notification.type === 'success'
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.25) 100%)'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.25) 100%)',
            border:
              notification.type === 'success'
                ? '1px solid rgba(16, 185, 129, 0.4)'
                : '1px solid rgba(239, 68, 68, 0.4)',
            color: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
            <span>{notification.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2-Column Layout: Add/Edit Form (Left) & Existing Categories Table (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '2rem' }}>
        {/* Category Form */}
        <div className="nidaa-card" style={{ padding: '1.75rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '1.25rem' }}>
            {editingId ? '✏️ Edit Category' : '➕ Add New Category'}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                Category Name *
              </label>
              <input
                type="text"
                className="nidaa-input"
                placeholder="e.g. Inpatient Psychiatry"
                value={name}
                onChange={handleNameChange}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                Slug (URL Identifier) *
              </label>
              <input
                type="text"
                className="nidaa-input"
                placeholder="inpatient-psychiatry"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                Description
              </label>
              <textarea
                className="nidaa-input"
                rows={3}
                placeholder="Brief clinical description of this category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                Display Order Priority
              </label>
              <input
                type="number"
                className="nidaa-input"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={saving}
                className="nidaa-btn-primary"
                style={{ flex: 1 }}
              >
                {saving ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="nidaa-btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Categories Table */}
        <div className="nidaa-card" style={{ overflow: 'hidden' }}>
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Active Clinical Categories ({categories.length})
            </h3>
            <button
              onClick={fetchCategories}
              className="nidaa-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
              ⏳ Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
              No categories found. Use the form on the left to add one.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="nidaa-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Name &amp; Slug</th>
                    <th style={{ width: '40%' }}>Description</th>
                    <th style={{ width: '12%' }}>Order</th>
                    <th style={{ width: '18%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#FF8F94' }}>/{c.slug}</div>
                      </td>
                      <td style={{ fontSize: '0.825rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                        {c.description || <em style={{ color: 'rgba(255, 255, 255, 0.3)' }}>No description</em>}
                      </td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.display_order}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleStartEdit(c)}
                            title="Edit Category"
                            style={{
                              padding: '0.3rem 0.6rem',
                              borderRadius: '6px',
                              background: 'rgba(196, 22, 28, 0.25)',
                              color: '#FF8F94',
                              border: '1px solid rgba(196, 22, 28, 0.4)',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            title="Delete Category"
                            style={{
                              padding: '0.3rem 0.6rem',
                              borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#F87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
