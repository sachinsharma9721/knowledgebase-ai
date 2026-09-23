"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface KnowledgeBase {
  id: string;
  name: string;
  system_prompt: string;
  greeting_message: string;
  widget_public_key: string;
  widget_theme_json: {
    primaryColor: string;
    position: string;
    logoUrl: string;
  };
}

export default function KBSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchKB() {
      const res = await fetch("/api/kb");
      if (res.ok) {
        const kbs = await res.json();
        const found = kbs.find((k: KnowledgeBase) => k.id === id);
        if (found) {
          setKb(found);
          setName(found.name);
          setSystemPrompt(found.system_prompt || "");
          setGreetingMessage(found.greeting_message || "");
          setPrimaryColor(found.widget_theme_json?.primaryColor || "#6366f1");
        }
      }
      setLoading(false);
    }
    fetchKB();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/kb/${id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          system_prompt: systemPrompt,
          greeting_message: greetingMessage,
          widget_theme_json: { primaryColor, position: "bottom-right", logoUrl: "" },
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateKey() {
    if (!confirm("Regenerating the public key will break all existing widget embeds. Continue?")) return;

    const res = await fetch(`/api/kb/${id}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate_key" }),
    });

    if (res.ok) {
      const updated = await res.json();
      setKb(updated);
    }
  }

  function copyEmbed() {
    const snippet = `<script src="${window.location.origin}/widget.js" data-kb="${kb?.widget_public_key}"></script>`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="loading-state" style={{ padding: "var(--space-3xl)" }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          <Link href={`/dashboard/kb/${id}`} className="text-secondary text-sm" style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "var(--space-sm)" }}>
            ← Back to workspace
          </Link>
          <h1 className="page-title">Settings</h1>
        </div>
      </header>

      <form onSubmit={handleSave} className="settings-form">
        {/* General */}
        <section className="glass-card settings-section">
          <h2 className="settings-section-title">General</h2>

          <div className="form-group">
            <label htmlFor="kb-name" className="label">Name</label>
            <input
              id="kb-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="greeting" className="label">Greeting Message</label>
            <input
              id="greeting"
              className="input"
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              placeholder="Hello! How can I help you today?"
            />
            <p className="text-xs text-secondary" style={{ marginTop: "4px" }}>
              Shown when a user first opens the chat
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="system-prompt" className="label">System Prompt</label>
            <textarea
              id="system-prompt"
              className="input textarea"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder='e.g. "Only answer questions about our refund policy. Be concise and friendly."'
              rows={4}
            />
            <p className="text-xs text-secondary" style={{ marginTop: "4px" }}>
              Customize the AI&apos;s personality and instructions
            </p>
          </div>
        </section>

        {/* Widget Theme */}
        <section className="glass-card settings-section">
          <h2 className="settings-section-title">Widget Theme</h2>

          <div className="form-group">
            <label htmlFor="primary-color" className="label">Primary Color</label>
            <div className="flex items-center gap-sm">
              <input
                id="primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ width: 40, height: 36, borderRadius: "var(--radius-md)", border: "none", cursor: "pointer" }}
              />
              <input
                className="input"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ width: 120 }}
              />
            </div>
          </div>
        </section>

        {/* Embed Code */}
        <section className="glass-card settings-section">
          <h2 className="settings-section-title">Embed Widget</h2>
          <p className="text-secondary text-sm" style={{ marginBottom: "var(--space-md)" }}>
            Copy this code and paste it into any HTML page to embed a chat widget scoped to this knowledge base.
          </p>

          <div className="embed-code-box">
            <code>
              {`<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com'}/widget.js" data-kb="${kb?.widget_public_key}"></script>`}
            </code>
            <button type="button" className="btn btn-secondary btn-sm" onClick={copyEmbed}>
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>

          <div style={{ marginTop: "var(--space-md)" }}>
            <p className="label">Public Key</p>
            <div className="flex items-center gap-sm">
              <code className="text-sm text-accent">{kb?.widget_public_key}</code>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleRegenerateKey}
              >
                Regenerate
              </button>
            </div>
            <p className="text-xs text-secondary" style={{ marginTop: "4px" }}>
              Regenerating invalidates all existing widget embeds
            </p>
          </div>
        </section>

        {/* Save */}
        <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
          {saving ? (
            <>
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Saving...
            </>
          ) : saved ? (
            "✓ Saved!"
          ) : (
            "Save Changes"
          )}
        </button>
      </form>

      <style>{`
        .settings-page {
          padding: var(--space-xl);
          max-width: 700px;
        }

        .settings-header {
          margin-bottom: var(--space-xl);
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .settings-section {
          padding: var(--space-lg);
        }

        .settings-section-title {
          font-size: var(--font-size-lg);
          font-weight: 700;
          margin-bottom: var(--space-lg);
          padding-bottom: var(--space-sm);
          border-bottom: 1px solid var(--color-glass-border);
        }

        .embed-code-box {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          background: var(--color-bg-primary);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-glass-border);
          overflow-x: auto;
        }

        .embed-code-box code {
          flex: 1;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: var(--font-size-xs);
          color: var(--color-text-accent);
          word-break: break-all;
        }
      `}</style>
    </div>
  );
}
