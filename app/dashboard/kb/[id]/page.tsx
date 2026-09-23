"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Document {
  id: string;
  filename: string;
  source_type: string;
  status: string;
  file_size: number;
  chunk_count: number;
  error_message: string | null;
  uploaded_at: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
  greeting_message: string;
  widget_public_key: string;
}

export default function KBWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"docs" | "chat">("chat");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Chat hook
  const { messages, input, handleInputChange, handleSubmit, isLoading: chatLoading, setMessages } = useChat({
    api: `/api/kb/${id}/chat`,
    id: `kb-${id}`,
  });

  // Fetch KB details
  useEffect(() => {
    async function fetchKB() {
      const res = await fetch(`/api/kb`);
      if (res.ok) {
        const kbs = await res.json();
        const found = kbs.find((k: KnowledgeBase) => k.id === id);
        if (found) setKb(found);
      }
    }
    fetchKB();
  }, [id]);

  // Fetch documents
  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch(`/api/kb/${id}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } finally {
      setDocsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDocs();
    // Poll for processing updates every 5 seconds
    const interval = setInterval(fetchDocs, 5000);
    return () => clearInterval(interval);
  }, [fetchDocs]);

  // Load chat history
  useEffect(() => {
    async function loadHistory() {
      // Chat history is managed by useChat's built-in persistence
      // We could also load from the messages table if needed
    }
    loadHistory();
  }, [id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // File upload handler
  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        await fetch(`/api/kb/${id}/documents`, {
          method: "POST",
          body: formData,
        });
      }
      await fetchDocs();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // URL upload handler
  async function handleUrlUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setUploading(true);

    try {
      await fetch(`/api/kb/${id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      setUrlInput("");
      await fetchDocs();
    } finally {
      setUploading(false);
    }
  }

  // Delete document
  async function handleDeleteDoc(docId: string) {
    await fetch(`/api/kb/${id}/documents/${docId}`, { method: "DELETE" });
    setDocuments(documents.filter((d) => d.id !== docId));
  }

  // Drag and drop
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }

  // Give feedback
  async function handleFeedback(messageId: string, feedback: "up" | "down") {
    // Store feedback — in a real app you'd update the messages table
    console.log("Feedback:", messageId, feedback);
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />;
      case "ready":
        return <span style={{ color: "var(--color-success)" }}>✓</span>;
      case "failed":
        return <span style={{ color: "var(--color-error)" }}>✗</span>;
      default:
        return null;
    }
  };

  const sourceTypeIcon = (type: string) => {
    switch (type) {
      case "pdf": return "📄";
      case "docx": return "📝";
      case "txt": return "📃";
      case "url": return "🔗";
      default: return "📎";
    }
  };

  return (
    <div className="kb-workspace">
      {/* Header */}
      <header className="workspace-header">
        <div className="flex items-center gap-md">
          <h1 className="workspace-title">{kb?.name || "Knowledge Base"}</h1>
          <Link
            href={`/dashboard/kb/${id}/settings`}
            className="btn btn-ghost btn-sm"
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" />
              <path d="M13.5 8a5.5 5.5 0 01-.4 2l1.2 1.2-1.1 1.1-1.2-1.2a5.5 5.5 0 01-2 .4 5.5 5.5 0 01-2-.4l-1.2 1.2-1.1-1.1L6.9 10a5.5 5.5 0 01-.4-2c0-.7.1-1.4.4-2L5.7 4.8l1.1-1.1L8 4.9a5.5 5.5 0 012-.4c.7 0 1.4.1 2 .4l1.2-1.2 1.1 1.1L13.1 6a5.5 5.5 0 01.4 2z" />
            </svg>
            Settings
          </Link>
        </div>

        {/* Mobile tab toggle */}
        <div className="mobile-tabs">
          <button
            className={`tab-btn ${activeTab === "docs" ? "active" : ""}`}
            onClick={() => setActiveTab("docs")}
          >
            📄 Documents
          </button>
          <button
            className={`tab-btn ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            💬 Chat
          </button>
        </div>
      </header>

      <div className="workspace-panels">
        {/* LEFT PANEL — Documents */}
        <div className={`panel panel-docs ${activeTab === "docs" ? "active" : ""}`}>
          {/* Upload Zone */}
          <div
            className={`upload-zone ${dragOver ? "drag-over" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              style={{ display: "none" }}
            />
            <div className="upload-icon">
              {uploading ? (
                <div className="spinner spinner-lg" />
              ) : (
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M16 22V10M16 10l-5 5M16 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 22v2a2 2 0 002 2h16a2 2 0 002-2v-2" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <p className="upload-text">
              {uploading ? "Uploading..." : "Drop files here or click to upload"}
            </p>
            <p className="upload-hint">PDF, DOCX, or TXT — up to 10MB</p>
          </div>

          {/* URL Input */}
          <form className="url-form" onSubmit={handleUrlUpload}>
            <input
              className="input"
              placeholder="Or paste a URL to index..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              type="url"
            />
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
              disabled={!urlInput.trim() || uploading}
            >
              Index
            </button>
          </form>

          {/* Document List */}
          <div className="doc-list">
            {docsLoading ? (
              <div className="loading-state" style={{ padding: "var(--space-lg)" }}>
                <div className="spinner" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-secondary text-sm" style={{ padding: "var(--space-lg)", textAlign: "center" }}>
                No documents yet. Upload your first file to get started.
              </p>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="doc-item animate-fade-in">
                  <span className="doc-type-icon">{sourceTypeIcon(doc.source_type)}</span>
                  <div className="doc-info">
                    <span className="doc-name truncate">{doc.filename}</span>
                    <span className="doc-meta text-xs text-secondary">
                      {doc.status === "ready" && `${doc.chunk_count} chunks`}
                      {doc.status === "failed" && (doc.error_message || "Processing failed")}
                      {doc.status === "processing" && "Processing..."}
                    </span>
                  </div>
                  <div className="doc-status">
                    {statusIcon(doc.status)}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm btn-icon doc-delete"
                    onClick={() => handleDeleteDoc(doc.id)}
                    title="Delete document"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 3h8M4.5 3V2.5a1 1 0 011-1h1a1 1 0 011 1V3M9 3v6a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 013 9V3" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Chat */}
        <div className={`panel panel-chat ${activeTab === "chat" ? "active" : ""}`}>
          {/* Chat Messages */}
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome animate-fade-in-up">
                <div className="chat-welcome-icon">💬</div>
                <h3>Start a conversation</h3>
                <p className="text-secondary text-sm">
                  {kb?.greeting_message || "Ask questions about your uploaded documents."}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-msg ${msg.role} animate-fade-in-up`}
              >
                <div className="chat-msg-avatar">
                  {msg.role === "user" ? "👤" : "🤖"}
                </div>
                <div className="chat-msg-content">
                  <div className="chat-msg-body">
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && (
                    <div className="chat-msg-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleFeedback(msg.id, "up")}
                        title="Helpful"
                      >
                        👍
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleFeedback(msg.id, "down")}
                        title="Not helpful"
                      >
                        👎
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="chat-msg assistant animate-fade-in">
                <div className="chat-msg-avatar">🤖</div>
                <div className="chat-msg-content">
                  <div className="chat-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <form className="chat-input-form" onSubmit={handleSubmit}>
            <input
              className="input chat-input"
              placeholder="Ask a question about your documents..."
              value={input}
              onChange={handleInputChange}
              disabled={chatLoading}
              autoComplete="off"
            />
            <button
              type="submit"
              className="btn btn-primary btn-icon"
              disabled={chatLoading || !input.trim()}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 2L8 10M16 2L11 16l-3-6-6-3 14-5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .kb-workspace {
          display: flex;
          flex-direction: column;
          height: 100vh;
        }

        .workspace-header {
          padding: var(--space-md) var(--space-lg);
          border-bottom: 1px solid var(--color-glass-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
          background: var(--color-bg-secondary);
        }

        .workspace-title {
          font-size: var(--font-size-lg);
          font-weight: 700;
        }

        .mobile-tabs {
          display: none;
        }

        .workspace-panels {
          flex: 1;
          display: flex;
          min-height: 0;
        }

        /* Document Panel */
        .panel-docs {
          width: 380px;
          min-width: 380px;
          border-right: 1px solid var(--color-glass-border);
          display: flex;
          flex-direction: column;
          background: var(--color-bg-primary);
        }

        .upload-zone {
          margin: var(--space-md);
          padding: var(--space-lg);
          border: 2px dashed var(--color-glass-border);
          border-radius: var(--radius-lg);
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .upload-zone:hover,
        .upload-zone.drag-over {
          border-color: var(--color-accent-primary);
          background: var(--color-accent-primary-glow);
        }

        .upload-icon {
          color: var(--color-text-tertiary);
          margin-bottom: var(--space-sm);
        }

        .upload-text {
          font-size: var(--font-size-sm);
          font-weight: 500;
          color: var(--color-text-secondary);
        }

        .upload-hint {
          font-size: var(--font-size-xs);
          color: var(--color-text-tertiary);
          margin-top: var(--space-xs);
        }

        .url-form {
          display: flex;
          gap: var(--space-sm);
          padding: 0 var(--space-md) var(--space-md);
        }

        .doc-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 var(--space-sm);
        }

        .doc-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-sm);
          border-radius: var(--radius-md);
          transition: background var(--transition-fast);
        }

        .doc-item:hover {
          background: var(--color-bg-elevated);
        }

        .doc-type-icon {
          flex-shrink: 0;
          font-size: 1.1rem;
        }

        .doc-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .doc-name {
          font-size: var(--font-size-sm);
          font-weight: 500;
        }

        .doc-meta {
          margin-top: 1px;
        }

        .doc-status {
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .doc-delete {
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .doc-item:hover .doc-delete {
          opacity: 1;
        }

        /* Chat Panel */
        .panel-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: var(--color-bg-primary);
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-lg);
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .chat-welcome {
          text-align: center;
          padding: var(--space-3xl) var(--space-lg);
          margin: auto 0;
        }

        .chat-welcome-icon {
          font-size: 3rem;
          margin-bottom: var(--space-md);
        }

        .chat-welcome h3 {
          font-size: var(--font-size-xl);
          font-weight: 700;
          margin-bottom: var(--space-sm);
        }

        .chat-msg {
          display: flex;
          gap: var(--space-sm);
          max-width: 85%;
        }

        .chat-msg.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .chat-msg-avatar {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          flex-shrink: 0;
          background: var(--color-bg-elevated);
        }

        .chat-msg.user .chat-msg-avatar {
          background: var(--color-accent-primary);
        }

        .chat-msg-content {
          min-width: 0;
        }

        .chat-msg-body {
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-lg);
          font-size: var(--font-size-sm);
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .chat-msg.user .chat-msg-body {
          background: var(--color-accent-primary);
          color: white;
          border-bottom-right-radius: var(--space-xs);
        }

        .chat-msg.assistant .chat-msg-body {
          background: var(--color-bg-elevated);
          color: var(--color-text-primary);
          border-bottom-left-radius: var(--space-xs);
        }

        .chat-msg-actions {
          display: flex;
          gap: var(--space-xs);
          margin-top: var(--space-xs);
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .chat-msg:hover .chat-msg-actions {
          opacity: 1;
        }

        .chat-typing {
          display: flex;
          gap: 4px;
          padding: var(--space-sm) var(--space-md);
          background: var(--color-bg-elevated);
          border-radius: var(--radius-lg);
          border-bottom-left-radius: var(--space-xs);
        }

        .chat-typing span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-text-tertiary);
          animation: pulse 1.4s ease-in-out infinite;
        }

        .chat-typing span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .chat-typing span:nth-child(3) {
          animation-delay: 0.4s;
        }

        .chat-input-form {
          display: flex;
          gap: var(--space-sm);
          padding: var(--space-md) var(--space-lg);
          border-top: 1px solid var(--color-glass-border);
          background: var(--color-bg-secondary);
        }

        .chat-input {
          flex: 1;
        }

        @media (max-width: 768px) {
          .mobile-tabs {
            display: flex;
            gap: var(--space-xs);
          }

          .tab-btn {
            padding: var(--space-xs) var(--space-sm);
            border-radius: var(--radius-md);
            background: transparent;
            border: 1px solid var(--color-glass-border);
            color: var(--color-text-secondary);
            font-size: var(--font-size-xs);
            font-family: var(--font-family);
            cursor: pointer;
            transition: all var(--transition-fast);
          }

          .tab-btn.active {
            background: var(--color-accent-primary-glow);
            border-color: var(--color-accent-primary);
            color: var(--color-text-accent);
          }

          .workspace-panels {
            position: relative;
          }

          .panel {
            display: none;
            position: absolute;
            inset: 0;
          }

          .panel.active {
            display: flex;
          }

          .panel-docs {
            width: 100%;
            min-width: 100%;
            border-right: none;
          }
        }
      `}</style>
    </div>
  );
}
