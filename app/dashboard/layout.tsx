"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface KnowledgeBase {
  id: string;
  name: string;
  created_at: string;
  documents: { count: number }[];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const fetchKBs = useCallback(async () => {
    const res = await fetch("/api/kb");
    if (res.ok) {
      const data = await res.json();
      setKbs(data);
    }
  }, []);

  useEffect(() => {
    fetchKBs();

    // Get user email
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email || "");
    });
  }, [fetchKBs, supabase.auth]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const activeKbId = pathname.match(/\/dashboard\/kb\/([^/]+)/)?.[1];

  return (
    <div className="dashboard-layout">
      {/* Mobile toggle */}
      <button
        className="sidebar-toggle btn btn-ghost btn-icon"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <Link href="/dashboard" className="sidebar-brand">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#slg)" />
              <path d="M8 12h16M8 16h12M8 20h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <defs>
                <linearGradient id="slg" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <span className="sidebar-brand-text">KnowledgeBase AI</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Knowledge Bases</div>
          <div className="sidebar-kb-list">
            {kbs.map((kb) => (
              <Link
                key={kb.id}
                href={`/dashboard/kb/${kb.id}`}
                className={`sidebar-kb-item ${activeKbId === kb.id ? "active" : ""}`}
              >
                <span className="sidebar-kb-icon">📚</span>
                <span className="sidebar-kb-name truncate">{kb.name}</span>
                <span className="sidebar-kb-count">
                  {kb.documents?.[0]?.count ?? 0}
                </span>
              </Link>
            ))}
            {kbs.length === 0 && (
              <p className="text-secondary text-xs" style={{ padding: "var(--space-sm) var(--space-md)" }}>
                No knowledge bases yet
              </p>
            )}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-email truncate">{userEmail}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm w-full" style={{ justifyContent: "flex-start" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-main">
        {children}
      </main>

      <style>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
        }

        .sidebar-toggle {
          display: none;
          position: fixed;
          top: var(--space-md);
          left: var(--space-md);
          z-index: 200;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-glass-border);
        }

        .sidebar {
          width: var(--sidebar-width);
          min-width: var(--sidebar-width);
          height: 100vh;
          position: sticky;
          top: 0;
          display: flex;
          flex-direction: column;
          background: var(--color-bg-secondary);
          border-right: 1px solid var(--color-glass-border);
          transition: transform var(--transition-base);
          z-index: 150;
        }

        .sidebar-header {
          padding: var(--space-md) var(--space-md);
          border-bottom: 1px solid var(--color-glass-border);
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--color-text-primary);
        }

        .sidebar-brand-text {
          font-size: var(--font-size-sm);
          font-weight: 700;
          background: var(--color-accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-md) 0;
        }

        .sidebar-section-title {
          padding: var(--space-xs) var(--space-md);
          font-size: var(--font-size-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-tertiary);
          margin-bottom: var(--space-xs);
        }

        .sidebar-kb-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 var(--space-sm);
        }

        .sidebar-kb-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-sm);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
          transition: all var(--transition-fast);
        }

        .sidebar-kb-item:hover {
          background: var(--color-bg-elevated);
          color: var(--color-text-primary);
        }

        .sidebar-kb-item.active {
          background: var(--color-accent-primary-glow);
          color: var(--color-text-accent);
        }

        .sidebar-kb-icon {
          flex-shrink: 0;
          font-size: 1rem;
        }

        .sidebar-kb-name {
          flex: 1;
          min-width: 0;
        }

        .sidebar-kb-count {
          flex-shrink: 0;
          font-size: var(--font-size-xs);
          background: var(--color-bg-tertiary);
          padding: 1px 6px;
          border-radius: var(--radius-full);
          color: var(--color-text-tertiary);
        }

        .sidebar-footer {
          padding: var(--space-md);
          border-top: 1px solid var(--color-glass-border);
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .sidebar-user-avatar {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          background: var(--color-accent-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-sm);
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .sidebar-user-info {
          min-width: 0;
        }

        .sidebar-user-email {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
          display: block;
        }

        .dashboard-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        @media (max-width: 768px) {
          .sidebar-toggle {
            display: flex;
          }
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            transform: translateX(-100%);
            width: 280px;
            min-width: 280px;
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .dashboard-main {
            padding-top: 60px;
          }
        }
      `}</style>
    </div>
  );
}
