import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'admin_chat_history';
const MAX_HISTORY = 40; // messages to persist

const FAQ_DATA = {
  "Document Review": [
    { q: "How do I review a document?", a: "From the Admin Dashboard, click on any user. You'll see their uploaded documents. Click Approve or Reject and leave a note if needed." },
    { q: "What happens when I reject a document?", a: "The document status changes to Rejected and the user is notified. They can upload a corrected version." },
    { q: "How do I upload admin documents for a user?", a: "Go to the user's detail page → Returns for Review tab → click '+ Upload Document'." }
  ],
  "User Management": [
    { q: "How do I see user details?", a: "Click any user in the Admin Dashboard table to open their full detail view." },
    { q: "Can I add another admin?", a: "Super Admins can only be created via the backend script `create_super_admin.py`." }
  ],
  "Notifications": [
    { q: "How are users notified?", a: "Users receive emails on signup, document submission, and when you approve or reject their documents." }
  ]
};

const CATEGORY_ICONS = { "Document Review": "📑", "User Management": "👥", "Notifications": "🔔" };

const formatMessage = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--blue);text-decoration:underline">$1</a>')
    .replace(/\n/g, '<br/>');
};

export default function AdminChatbot() {
  const { user, authFetch } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen]         = useState(false);
  const [view, setView]             = useState('menu');
  const [activeCategory, setActiveCategory] = useState(null);
  const [inputText, setInputText]   = useState("");
  const [menuInput, setMenuInput]   = useState("");
  const [isTyping, setIsTyping]     = useState(false);
  const [pendingBulk, setPendingBulk] = useState(null); // bulk action awaiting confirmation
  const chatEndRef = useRef(null);

  // ── Conversation memory via localStorage ──────────────────────────────────
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
    } catch { /* storage full — ignore */ }
  }, [messages]);

  useEffect(() => { setIsOpen(false); }, [location.pathname]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, view]);

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // ── System overview ───────────────────────────────────────────────────────
  const handleAdminStatusCheck = async () => {
    setMessages(prev => [...prev, { type: 'user', role: 'user', text: 'Give me a system overview.' }]);
    setView('chat');
    try {
      const res = await authFetch('/api/chatbot/admin-status');
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: data.message }]);
      } else {
        setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: 'Could not fetch system status right now.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: 'Network error.' }]);
    }
  };

  // ── Bulk action executor with confirmation ────────────────────────────────
  const executeBulkAction = async (action) => {
    if (!action) return;
    try {
      const res = await authFetch('/api/chatbot/admin-bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...action, confirm: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: `✅ ${data.message}` }]);
      } else {
        setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: 'Action failed. Please try from the user detail page.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: 'Network error during bulk action.' }]);
    } finally {
      setPendingBulk(null);
    }
  };

  // ── Send message (with full history for memory) ───────────────────────────
  const sendMessage = useCallback(async (text, overrideMessages) => {
    const userMsg = { type: 'user', role: 'user', text };
    const allMessages = [...(overrideMessages ?? messages), userMsg];
    setMessages(allMessages);
    setInputText("");
    setMenuInput("");
    setView('chat');
    setIsTyping(true);

    try {
      const res = await authFetch('/api/chatbot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream: false,
          messages: allMessages.map(m => ({
            role: m.role || (m.type === 'bot' ? 'assistant' : 'user'),
            content: m.text,
            reasoning_details: null,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.content || "Sorry, I couldn't understand that.";

        // Check if response contains a bulk_action JSON block
        const bulkMatch = replyText.match(/\{[^{}]*"bulk_action"[^{}]*\}/s);
        if (bulkMatch) {
          try {
            const parsed = JSON.parse(bulkMatch[0]);
            if (parsed.bulk_action) {
              setPendingBulk(parsed.bulk_action);
              const cleanText = replyText.replace(bulkMatch[0], '').trim();
              setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: cleanText || "I can do that. Please confirm below." }]);
              setIsTyping(false);
              return;
            }
          } catch { /* not valid JSON, render as text */ }
        }

        setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: replyText }]);
      } else {
        setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: 'Having trouble connecting. Please try again.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: 'Network error. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, authFetch]);

  const handleSendMessage = (e) => { e.preventDefault(); if (inputText.trim()) sendMessage(inputText.trim()); };
  const handleMenuAsk = (e) => { e.preventDefault(); if (menuInput.trim()) sendMessage(menuInput.trim(), []); };
  const askFaq = (faq) => {
    setMessages(prev => [...prev, { type: 'user', text: faq.q }, { type: 'bot', text: faq.a }]);
    setView('chat');
  };

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin') || !location.pathname.startsWith('/admin')) return null;

  return (
    <>
      <button className={`chatbot-fab ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(o => !o)}
        aria-label="Open admin assistant"
        style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--blue) 100%)' }}>
        <span className="fab-icon">🤖</span>
        <span className="notif-dot"></span>
      </button>

      {isOpen && (
        <div className="chatbot-window visible">
          <div className="chatbot-header" style={{ background: 'var(--ink)' }}>
            <div className="bot-avatar">🤖</div>
            <div className="bot-info">
              <h4>Admin Assistant</h4>
              <span>Live system insights</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {messages.length > 0 && (
                <button onClick={clearHistory} title="Clear history"
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '11px', padding: '4px' }}>
                  🗑
                </button>
              )}
              <button className="close-chat" onClick={() => setIsOpen(false)}>✕</button>
            </div>
          </div>

          <div className="chatbot-messages">
            {view === 'menu' && (
              <>
                <div className="chatbot-welcome-text">
                  <span className="material-symbols-outlined sparkle">auto_awesome</span>
                  <p>What do you need today?</p>
                </div>
                <form onSubmit={handleMenuAsk} style={{ marginBottom: '12px', display: 'flex', gap: '6px' }}>
                  <input type="text" value={menuInput} onChange={e => setMenuInput(e.target.value)}
                    placeholder="Ask anything… e.g. who uploaded today?"
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--navy)', fontSize: '13px' }} />
                  <button type="submit" style={{ background: 'var(--emerald)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' }}>Ask</button>
                </form>
                <button className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '8px' }} onClick={handleAdminStatusCheck}>
                  <span className="qr-icon">📊</span> System Overview
                </button>
                {messages.length > 0 && (
                  <button className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '8px' }} onClick={() => setView('chat')}>
                    <span className="qr-icon">💬</span> Continue conversation
                  </button>
                )}
                {Object.keys(FAQ_DATA).map(cat => (
                  <button key={cat} className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '8px' }}
                    onClick={() => { setActiveCategory(cat); setView('category'); }}>
                    <span className="qr-icon">{CATEGORY_ICONS[cat]}</span> {cat}
                  </button>
                ))}
              </>
            )}

            {view === 'category' && (
              <>
                <button className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '16px', background: 'transparent', border: 'none' }} onClick={() => setView('menu')}>← Back</button>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--navy)' }}>{activeCategory}</h4>
                {FAQ_DATA[activeCategory].map((faq, i) => (
                  <button key={i} className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '8px' }} onClick={() => askFaq(faq)}>{faq.q}</button>
                ))}
              </>
            )}

            {view === 'chat' && (
              <>
                <button className="quick-reply-btn" onClick={() => setView('menu')}
                  style={{ display: 'flex', width: '100%', marginBottom: '16px', background: 'transparent', border: 'none' }}>← Back to menu</button>
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-msg ${msg.type === 'bot' ? 'bot' : 'user'}`}
                    {...(msg.type === 'bot' ? { dangerouslySetInnerHTML: { __html: formatMessage(msg.text) } } : { children: msg.text })} />
                ))}
                {isTyping && <div className="chat-msg bot" style={{ fontStyle: 'italic', opacity: 0.7 }}>Admin Assistant is typing…</div>}

                {/* Bulk action confirmation card */}
                {pendingBulk && (
                  <div style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn)', borderRadius: 'var(--radius-sm)', padding: '12px', margin: '8px 0' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--warn)', marginBottom: '8px' }}>
                      ⚠️ Confirm bulk action
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '10px' }}>
                      <b>{pendingBulk.action?.replace('_', ' ')}</b> all pending {pendingBulk.action?.split('_')[1]} docs for user ID {pendingBulk.user_id}?
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => executeBulkAction(pendingBulk)}>Yes, execute</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setPendingBulk(null); setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: 'Cancelled. No changes made.' }]); }}>Cancel</button>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          <div className="chatbot-footer" style={{ padding: '12px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            {view === 'chat' ? (
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                  placeholder="Ask a question…"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--navy)' }} />
                <button type="submit" style={{ background: 'var(--emerald)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', padding: '8px 16px', cursor: 'pointer' }}>Send</button>
              </form>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Admin tools &amp; shortcuts</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
