"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface KnowledgeBase {
  id: string;
  name: string;
  created_at: string;
  documents: { count: number }[];
}

export default function DashboardPage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newKbName, setNewKbName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const fetchKBs = useCallback(async () => {
    try {
      const res = await fetch("/api/kb");
      if (res.ok) {
        const data = await res.json();
        setKbs(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKBs();
  }, [fetchKBs]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKbName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/kb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKbName.trim() }),
      });

      if (res.ok) {
        const kb = await res.json();
        setShowModal(false);
        setNewKbName("");
        router.push(`/dashboard/kb/${kb.id}`);
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/kb/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setKbs(kbs.filter((kb) => kb.id !== deleteId));
        setDeleteId(null);
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Knowledge Bases</h1>
          <p className="text-secondary text-sm">
            Create and manage your AI-powered knowledge bases
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          New Knowledge Base
        </button>
      </header>

      {/* Content */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner spinner-lg" />
          <p className="text-secondary">Loading your knowledge bases...</p>
        </div>
      ) : kbs.length === 0 ? (
        <div className="empty-state animate-fade-in-up">
          <div className="empty-icon">📚</div>
          <h2>No knowledge bases yet</h2>
          <p className="text-secondary">
            Create your first knowledge base to start uploading documents and chatting with AI.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>
            Create Your First KB
          </button>
        </div>
      ) : (
        <div className="kb-grid">
          {kbs.map((kb, i) => (
            <div
              key={kb.id}
              className="glass-card glass-card-interactive kb-card animate-fade-in-up"
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => router.push(`/dashboard/kb/${kb.id}`)}
            >
              <div className="kb-card-header">
                <div className="kb-card-icon">📚</div>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(kb.id);
                  }}
                  title="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v7a2 2 0 01-2 2H5a2 2 0 01-2-2V4" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <h3 className="kb-card-name">{kb.name}</h3>
              <div className="kb-card-meta">
                <span className="text-xs text-secondary">
                  {kb.documents?.[0]?.count ?? 0} documents
                </span>
                <span className="text-xs text-secondary">
                  {new Date(kb.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Create Knowledge Base</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label htmlFor="kb-name" className="label">Name</label>
                <input
                  id="kb-name"
                  className="input"
                  placeholder='e.g. "Product Docs", "FAQ", "Policies"'
                  value={newKbName}
                  onChange={(e) => setNewKbName(e.target.value)}
                  autoFocus
                  required
                  maxLength={100}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating || !newKbName.trim()}>
                  {creating ? (
                    <>
                      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Delete Knowledge Base</h2>
            <p className="text-secondary text-sm">
              This will permanently delete this knowledge base, all its documents, chat history, and analytics.
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Deleting...
                  </>
                ) : (
                  "Delete Forever"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dashboard-page {
          padding: var(--space-xl);
          max-width: 1000px;
        }

        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-md);
          margin-bottom: var(--space-xl);
          flex-wrap: wrap;
        }

        .page-title {
          font-size: var(--font-size-2xl);
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-3xl) 0;
        }

        .empty-state {
          text-align: center;
          padding: var(--space-3xl) var(--space-xl);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: var(--space-md);
        }

        .empty-state h2 {
          font-size: var(--font-size-xl);
          font-weight: 700;
          margin-bottom: var(--space-sm);
        }

        .empty-state p {
          max-width: 400px;
          margin: 0 auto var(--space-lg);
        }

        .kb-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-md);
        }

        .kb-card {
          padding: var(--space-lg);
          cursor: pointer;
        }

        .kb-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-md);
        }

        .kb-card-icon {
          font-size: 1.75rem;
        }

        .kb-card-name {
          font-size: var(--font-size-lg);
          font-weight: 700;
          margin-bottom: var(--space-sm);
        }

        .kb-card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        @media (max-width: 768px) {
          .dashboard-page { padding: var(--space-md); }
          .page-header { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
