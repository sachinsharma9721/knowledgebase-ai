/**
 * KnowledgeBase AI — Embeddable Chat Widget
 * 
 * Usage: <script src="https://yourapp.com/widget.js" data-kb="public_key_xyz"></script>
 * 
 * Self-contained, no dependencies. Uses Shadow DOM to prevent CSS conflicts.
 * Communicates with the public widget API endpoint.
 */
(function () {
  "use strict";

  // Find the script tag to get the public key and API base URL
  const scriptTag = document.currentScript;
  if (!scriptTag) return;

  const publicKey = scriptTag.getAttribute("data-kb");
  if (!publicKey) {
    console.error("[KnowledgeBase AI] Missing data-kb attribute on script tag.");
    return;
  }

  // Derive API base from script src
  const scriptSrc = scriptTag.src;
  const apiBase = scriptSrc.replace(/\/widget\.js.*$/, "");

  // State
  let isOpen = false;
  let messages = [];
  let isLoading = false;
  let config = { name: "AI Assistant", greeting: "Hello! How can I help you?", theme: { primaryColor: "#6366f1" } };

  // Load config
  fetch(`${apiBase}/api/widget/${publicKey}/config`)
    .then((res) => res.json())
    .then((data) => {
      config = { ...config, ...data };
      updateGreeting();
      updateTheme();
    })
    .catch(() => {});

  // Create host element
  const host = document.createElement("div");
  host.id = "kb-ai-widget";
  document.body.appendChild(host);

  // Shadow DOM
  const shadow = host.attachShadow({ mode: "closed" });

  // Styles
  const styles = document.createElement("style");
  styles.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :host {
      --primary: ${config.theme.primaryColor || "#6366f1"};
      --bg: #0c0c1d;
      --bg-secondary: #111127;
      --bg-elevated: #16163a;
      --text: #f1f1f7;
      --text-secondary: #9ca3af;
      --border: rgba(99, 102, 241, 0.15);
      --radius: 16px;
      font-family: 'Inter', -apple-system, sans-serif;
    }

    .widget-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 2147483647;
    }

    .widget-bubble:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(99, 102, 241, 0.5);
    }

    .widget-bubble svg {
      width: 24px;
      height: 24px;
    }

    .widget-panel {
      position: fixed;
      bottom: 88px;
      right: 20px;
      width: 380px;
      height: 520px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      display: none;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.5);
      z-index: 2147483646;
      animation: slideUp 0.3s ease-out;
    }

    .widget-panel.open {
      display: flex;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .widget-header {
      padding: 14px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .widget-header-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      flex-shrink: 0;
    }

    .widget-header-info {
      flex: 1;
    }

    .widget-header-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
    }

    .widget-header-status {
      font-size: 11px;
      color: #22c55e;
    }

    .widget-close {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
    }

    .widget-close:hover {
      background: var(--bg-elevated);
    }

    .widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .widget-messages::-webkit-scrollbar { width: 4px; }
    .widget-messages::-webkit-scrollbar-thumb { background: var(--bg-elevated); border-radius: 4px; }

    .msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.5;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .msg-user {
      background: var(--primary);
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    .msg-assistant {
      background: var(--bg-elevated);
      color: var(--text);
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }

    .msg-greeting {
      text-align: center;
      font-size: 13px;
      color: var(--text-secondary);
      padding: 20px;
      align-self: center;
    }

    .typing {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      background: var(--bg-elevated);
      border-radius: 14px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }

    .typing span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-secondary);
      animation: typingDot 1.4s ease-in-out infinite;
    }

    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typingDot {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }

    .widget-input-area {
      padding: 12px 16px;
      border-top: 1px solid var(--border);
      background: var(--bg-secondary);
      display: flex;
      gap: 8px;
    }

    .widget-input {
      flex: 1;
      padding: 8px 12px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s;
    }

    .widget-input:focus {
      border-color: var(--primary);
    }

    .widget-input::placeholder {
      color: var(--text-secondary);
    }

    .widget-send {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--primary);
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.15s;
      flex-shrink: 0;
    }

    .widget-send:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .widget-send:hover:not(:disabled) {
      opacity: 0.85;
    }

    .widget-powered {
      text-align: center;
      font-size: 10px;
      color: var(--text-secondary);
      padding: 6px;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
    }

    @media (max-width: 480px) {
      .widget-panel {
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;
        border-radius: 0;
      }
      .widget-bubble {
        bottom: 16px;
        right: 16px;
      }
    }
  `;
  shadow.appendChild(styles);

  // Build DOM
  const container = document.createElement("div");

  // Bubble button
  const bubble = document.createElement("button");
  bubble.className = "widget-bubble";
  bubble.setAttribute("aria-label", "Open chat");
  bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;
  bubble.onclick = toggleWidget;

  // Panel
  const panel = document.createElement("div");
  panel.className = "widget-panel";
  panel.innerHTML = `
    <div class="widget-header">
      <div class="widget-header-icon">🤖</div>
      <div class="widget-header-info">
        <div class="widget-header-name">${escapeHtml(config.name)}</div>
        <div class="widget-header-status">● Online</div>
      </div>
      <button class="widget-close" aria-label="Close chat">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l10 10M14 4L4 14" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="widget-messages">
      <div class="msg-greeting">${escapeHtml(config.greeting)}</div>
    </div>
    <div class="widget-input-area">
      <input class="widget-input" placeholder="Type your question..." autocomplete="off" />
      <button class="widget-send" disabled aria-label="Send message">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 2L8 10M16 2L11 16l-3-6-6-3 14-5z" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <div class="widget-powered">Powered by KnowledgeBase AI</div>
  `;

  container.appendChild(panel);
  container.appendChild(bubble);
  shadow.appendChild(container);

  // DOM references
  const closeBtn = panel.querySelector(".widget-close");
  const messagesEl = panel.querySelector(".widget-messages");
  const inputEl = panel.querySelector(".widget-input");
  const sendBtn = panel.querySelector(".widget-send");

  // Events
  closeBtn.onclick = toggleWidget;
  inputEl.oninput = () => {
    sendBtn.disabled = !inputEl.value.trim() || isLoading;
  };
  inputEl.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  sendBtn.onclick = sendMessage;

  function toggleWidget() {
    isOpen = !isOpen;
    panel.classList.toggle("open", isOpen);
    if (isOpen) {
      inputEl.focus();
      bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/></svg>`;
    } else {
      bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;
    }
  }

  function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isLoading) return;

    // Add user message
    messages.push({ role: "user", content: text });
    appendMessage("user", text);
    inputEl.value = "";
    sendBtn.disabled = true;
    isLoading = true;

    // Show typing indicator
    const typingEl = document.createElement("div");
    typingEl.className = "typing";
    typingEl.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(typingEl);
    scrollToBottom();

    // Send to API
    fetch(`${apiBase}/api/widget/${publicKey}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          id: Math.random().toString(36).slice(2),
          role: m.role,
          content: m.content,
        })),
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Request failed");
        }

        // Read the streaming response
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        // Remove typing indicator
        if (typingEl.parentNode) typingEl.remove();

        // Create assistant message element
        const msgEl = document.createElement("div");
        msgEl.className = "msg msg-assistant";
        messagesEl.appendChild(msgEl);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE-style data — extract text content from the stream
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("0:")) {
              // Text delta — the format is 0:"text content"
              try {
                const textContent = JSON.parse(line.slice(2));
                if (typeof textContent === "string") {
                  assistantContent += textContent;
                  msgEl.textContent = assistantContent;
                  scrollToBottom();
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
        }

        messages.push({ role: "assistant", content: assistantContent });
      })
      .catch((err) => {
        if (typingEl.parentNode) typingEl.remove();
        appendMessage("assistant", `Error: ${err.message}`);
      })
      .finally(() => {
        isLoading = false;
        sendBtn.disabled = !inputEl.value.trim();
        scrollToBottom();
      });
  }

  function appendMessage(role, text) {
    const el = document.createElement("div");
    el.className = `msg msg-${role}`;
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function updateGreeting() {
    const greetingEl = panel.querySelector(".msg-greeting");
    if (greetingEl) greetingEl.textContent = config.greeting;

    const nameEl = panel.querySelector(".widget-header-name");
    if (nameEl) nameEl.textContent = config.name;
  }

  function updateTheme() {
    const primary = config.theme?.primaryColor || "#6366f1";
    styles.textContent = styles.textContent.replace(
      /--primary:\s*[^;]+/,
      `--primary: ${primary}`
    );
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
