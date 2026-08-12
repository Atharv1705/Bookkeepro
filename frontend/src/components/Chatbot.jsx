import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'user_chat_history';
const MAX_HISTORY = 30;

const FAQ_DATA = {
  "Account": [
    { q: "How do I reset my password?", a: 'Go to the login page and click "Forgot Password". Enter your email and we\'ll send a reset link.' },
    { q: "How do I verify my email?", a: 'Check your inbox for a verification email from BookKeepPro. Click the link inside to verify.' },
    { q: "How do I update my profile?", a: 'Go to your Profile page to update your name, phone number, or change your password.' },
  ],
  "Documents": [
    { q: "What file types are accepted?", a: "We accept PDF, JPG, PNG, WEBP, DOC, and DOCX files. Maximum file size is 10 MB." },
    { q: 'What does "Pending" status mean?', a: 'Your document has been uploaded and is waiting for an admin to review it.' },
    { q: 'What does "Rejected" mean?', a: "The admin found an issue. Check the review note for details and re-upload a corrected version." },
  ],
  "Tax Filing": [
    { q: "What tax years are supported?", a: "We currently support tax years 2023, 2024, 2025, and 2026." },
    { q: "What personal documents do I need?", a: 'An Individual Taxpayer Organizer for your tax year.' },
  ],
  "Security": [
    { q: "Is my data secure?", a: "Yes. All files are stored securely on our servers with encrypted access tokens." },
  ]
};

const CATEGORY_ICONS = { "Account": "👤", "Documents": "📄", "Tax Filing": "📋", "Security": "🔒" };

const formatMessage = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:var(--blue);text-decoration:underline">$1</a>')
    .replace(/\n/g, '<br/>');
};

export default function Chatbot() {
  const { user, authFetch } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [isOpen, setIsOpen]         = useState(false);
  const [view, setView]             = useState('menu');
  const [activeCategory, setActiveCategory] = useState(null);
  const [inputText, setInputText]   = useState("");
  const [menuInput, setMenuInput]   = useState("");
  const [isTyping, setIsTyping]     = useState(false);
  const chatEndRef = useRef(null);

  // ── Conversation memory via localStorage ──────────────────────────────────
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY))); }
    catch { /* storage full */ }
  }, [messages]);

  useEffect(() => { setIsOpen(false); }, [location.pathname]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, view]);

  const clearHistory = () => { setMessages([]); localStorage.removeItem(STORAGE_KEY); };

  // ── Document status quick-check ────────────────────────────────────────────
  const handleDocStatusCheck = async () => {
    if (!user) return;
    setMessages(prev => [...prev, { type: 'user', role: 'user', text: 'Check my document status' }]);
    setView('chat');
    try {
      const res = await authFetch('/api/chatbot/doc-status');
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: data.message }]);
      } else {
        setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: 'Could not fetch your document status right now.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: 'Network error occurred.' }]);
    }
  };

  // ── Upload shortcut (deeplink) ─────────────────────────────────────────────
  const handleUploadShortcut = (type) => {
    setIsOpen(false);
    navigate(type === 'personal' ? '/upload-personal' : '/upload-business');
  };

  // ── Send message with full history for memory ──────────────────────────────
  const sendMessage = useCallback(async (text, overrideMessages) => {
    const userMsg = { type: 'user', role: 'user', text };
    const allMessages = [...(overrideMessages ?? messages), userMsg];
    setMessages(allMessages);
    setInputText("");
    setMenuInput("");
    setView('chat');
    setIsTyping(true);

    // Detect upload intent — shortcut before hitting API
    const lower = text.toLowerCase();
    if (lower.includes('upload') && (lower.includes('personal') || lower.includes('w-2') || lower.includes('w2'))) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        type: 'bot', role: 'assistant',
        text: 'I can take you there directly! Click below to go to the Personal Upload page.',
        action: { type: 'navigate', dest: 'personal', label: '📄 Go to Personal Upload' }
      }]);
      return;
    }
    if (lower.includes('upload') && (lower.includes('business') || lower.includes('llc') || lower.includes('1099'))) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        type: 'bot', role: 'assistant',
        text: 'I can take you there directly! Click below to go to the Business Upload page.',
        action: { type: 'navigate', dest: 'business', label: '🏢 Go to Business Upload' }
      }]);
      return;
    }

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
        setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: data.content || "Sorry, I couldn't understand that." }]);
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

  if (!user || user.role === 'admin' || user.role === 'super_admin' || location.pathname.startsWith('/admin')) return null;

  return (
    <>
      <button className={`chatbot-fab ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(o => !o)} aria-label="Open chat assistant">
        <span className="fab-icon">💬</span>
        <span className="notif-dot"></span>
      </button>

      {isOpen && (
        <div className="chatbot-window visible">
          <div className="chatbot-header">
            <div className="bot-avatar">🤖</div>
            <div className="bot-info"><h4>BookKeep Assistant</h4><span>Online and ready to help</span></div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {messages.length > 0 && (
                <button onClick={clearHistory} title="Clear history"
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '11px', padding: '4px' }}>🗑</button>
              )}
              <button className="close-chat" onClick={() => setIsOpen(false)}>✕</button>
            </div>
          </div>

          <div className="chatbot-messages">
            {view === 'menu' && (
              <>
                <div className="chatbot-welcome-text">
                  <span className="material-symbols-outlined sparkle">auto_awesome</span>
                  <p>How can we help you today?</p>
                </div>
                <form onSubmit={handleMenuAsk} style={{ marginBottom: '12px', display: 'flex', gap: '6px' }}>
                  <input type="text" value={menuInput} onChange={e => setMenuInput(e.target.value)}
                    placeholder="Ask anything…"
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--navy)', fontSize: '13px' }} />
                  <button type="submit" style={{ background: 'var(--emerald)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' }}>Ask</button>
                </form>

                {/* Upload shortcuts */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <button className="quick-reply-btn" style={{ flex: 1 }} onClick={() => handleUploadShortcut('personal')}>
                    📄 Upload Personal Docs
                  </button>
                  <button className="quick-reply-btn" style={{ flex: 1 }} onClick={() => handleUploadShortcut('business')}>
                    🏢 Upload Business Docs
                  </button>
                </div>

                {user && (
                  <button className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '8px' }} onClick={handleDocStatusCheck}>
                    <span className="qr-icon">📋</span> Check Document Status
                  </button>
                )}
                {messages.length > 0 && (
                  <button className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '8px' }} onClick={() => setView('chat')}>
                    <span className="qr-icon">💬</span> Continue conversation
                  </button>
                )}
                {Object.keys(FAQ_DATA).map(cat => (
                  <button key={cat} className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '8px' }}
                    onClick={() => { setActiveCategory(cat); setView('category'); }}>
                    <span className="qr-icon">{CATEGORY_ICONS[cat]}</span> {cat} FAQ
                  </button>
                ))}
              </>
            )}

            {view === 'category' && (
              <>
                <button className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '16px', background: 'transparent', border: 'none' }} onClick={() => setView('menu')}>← Back</button>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--navy)' }}>{activeCategory} Questions</h4>
                {FAQ_DATA[activeCategory].map((faq, i) => (
                  <button key={i} className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '8px' }} onClick={() => askFaq(faq)}>{faq.q}</button>
                ))}
              </>
            )}

            {view === 'chat' && (
              <>
                <button className="quick-reply-btn" onClick={() => setView('menu')} style={{ display: 'flex', width: '100%', marginBottom: '16px', background: 'transparent', border: 'none' }}>← Back to menu</button>
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div className={`chat-msg ${msg.type === 'bot' ? 'bot' : 'user'}`}
                      {...(msg.type === 'bot' ? { dangerouslySetInnerHTML: { __html: formatMessage(msg.text) } } : { children: msg.text })} />
                    {/* Upload action button if bot suggested navigation */}
                    {msg.action?.type === 'navigate' && (
                      <div style={{ marginTop: '6px', marginLeft: '12px' }}>
                        <button className="btn btn-primary btn-sm" style={{ borderRadius: 'var(--radius-pill)' }}
                          onClick={() => handleUploadShortcut(msg.action.dest)}>
                          {msg.action.label}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && <div className="chat-msg bot" style={{ fontStyle: 'italic', opacity: 0.7 }}>BookKeep Assistant is typing…</div>}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          <div className="chatbot-footer" style={{ padding: '12px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            {view === 'chat' ? (
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                  placeholder="Ask a question..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--navy)' }} />
                <button type="submit" style={{ background: 'var(--emerald)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', padding: '8px 16px', cursor: 'pointer' }}>Send</button>
              </form>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Need more help? <a href="/contact">Contact Support</a></p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
