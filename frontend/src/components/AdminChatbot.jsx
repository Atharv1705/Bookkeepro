import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const FAQ_DATA = {
  "Document Review": [
    { q: "How do I review a document?", a: "From the Admin Dashboard, click on any user. You'll see their uploaded documents. Click Approve or Reject and leave a note if needed." },
    { q: "What happens when I reject a document?", a: "The document's status changes to Rejected and the user is notified. They will see your review note and can upload a corrected version to replace it." },
    { q: "How do I upload admin documents for a user?", a: "Go to the user's detail page and scroll down to Admin Documents. You can upload tax returns, reports, and other finalized forms there." }
  ],
  "User Management": [
    { q: "How do I see user details?", a: "Click on any user in the Admin Dashboard table to open their detailed view — documents, audit trail, and filing timeline." },
    { q: "Can I add another admin?", a: "Super Admins can only be created via the backend script `create_super_admin.py` for security reasons." }
  ],
  "Notifications": [
    { q: "How are users notified?", a: "Users receive automated emails on signup, document submission, and when you approve or reject their documents." }
  ]
};

const CATEGORY_ICONS = {
  "Document Review": "📑",
  "User Management": "👥",
  "Notifications":   "🔔",
};

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
  const [messages, setMessages]     = useState([]);
  const [view, setView]             = useState('menu');   // menu | category | chat
  const [activeCategory, setActiveCategory] = useState(null);
  const [inputText, setInputText]   = useState("");
  const [menuInput, setMenuInput]   = useState("");       // free-text from menu
  const [isTyping, setIsTyping]     = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { setIsOpen(false); }, [location.pathname]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, view]);

  const toggleChat = () => setIsOpen(o => !o);

  /* ── quick-action: system overview ── */
  const handleAdminStatusCheck = async () => {
    setMessages(prev => [...prev, { type: 'user', text: 'Give me a system overview.' }]);
    setView('chat');
    try {
      const res = await authFetch('/api/chatbot/admin-status');
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { type: 'bot', text: data.message }]);
      } else {
        setMessages(prev => [...prev, { type: 'bot', text: 'Could not fetch system status right now.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { type: 'bot', text: 'Network error.' }]);
    }
  };

  /* ── send a message to /ask ── */
  const sendMessage = async (text, existingMessages) => {
    const userMsg = { type: 'user', role: 'user', text };
    const allMessages = [...(existingMessages ?? messages), userMsg];
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
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    await sendMessage(inputText.trim());
  };

  const handleMenuAsk = async (e) => {
    e.preventDefault();
    if (!menuInput.trim()) return;
    await sendMessage(menuInput.trim(), []);
  };

  const askFaq = (faq) => {
    setMessages(prev => [...prev, { type: 'user', text: faq.q }, { type: 'bot', text: faq.a }]);
    setView('chat');
  };

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin') || !location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <button
        className={`chatbot-fab ${isOpen ? 'open' : ''}`}
        onClick={toggleChat}
        aria-label="Open admin assistant"
        style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--blue) 100%)' }}
      >
        <span className="fab-icon">🤖</span>
        <span className="notif-dot"></span>
      </button>

      {isOpen && (
        <div className="chatbot-window visible">
          {/* header */}
          <div className="chatbot-header" style={{ background: 'var(--ink)' }}>
            <div className="bot-avatar">🤖</div>
            <div className="bot-info">
              <h4>Admin Assistant</h4>
              <span>Live system insights</span>
            </div>
            <button className="close-chat" onClick={toggleChat}>✕</button>
          </div>

          {/* messages area */}
          <div className="chatbot-messages">

            {/* ── MENU VIEW ── */}
            {view === 'menu' && (
              <>
                <div className="chatbot-welcome-text">
                  <span className="material-symbols-outlined sparkle">auto_awesome</span>
                  <p>What do you need today?</p>
                </div>

                {/* free-text ask from menu */}
                <form onSubmit={handleMenuAsk} style={{ marginBottom: '12px', display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={menuInput}
                    onChange={e => setMenuInput(e.target.value)}
                    placeholder="Ask anything… e.g. who uploaded today?"
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--navy)', fontSize: '13px' }}
                  />
                  <button type="submit" style={{ background: 'var(--emerald)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' }}>
                    Ask
                  </button>
                </form>

                <button className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '8px' }} onClick={handleAdminStatusCheck}>
                  <span className="qr-icon">📊</span> System Overview
                </button>

                {Object.keys(FAQ_DATA).map(cat => (
                  <button key={cat} className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '8px' }} onClick={() => { setActiveCategory(cat); setView('category'); }}>
                    <span className="qr-icon">{CATEGORY_ICONS[cat]}</span> {cat}
                  </button>
                ))}
              </>
            )}

            {/* ── CATEGORY VIEW ── */}
            {view === 'category' && (
              <>
                <button className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '16px', background: 'transparent', border: 'none' }} onClick={() => setView('menu')}>
                  ← Back to menu
                </button>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--navy)' }}>{activeCategory}</h4>
                {FAQ_DATA[activeCategory].map((faq, i) => (
                  <button key={i} className="quick-reply-btn" style={{ display: 'flex', width: '100%', marginBottom: '8px' }} onClick={() => askFaq(faq)}>
                    {faq.q}
                  </button>
                ))}
              </>
            )}

            {/* ── CHAT VIEW ── */}
            {view === 'chat' && (
              <>
                <button className="quick-reply-btn" onClick={() => setView('menu')} style={{ display: 'flex', width: '100%', marginBottom: '16px', background: 'transparent', border: 'none' }}>
                  ← Back to menu
                </button>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`chat-msg ${msg.type === 'bot' ? 'bot' : 'user'}`}
                    {...(msg.type === 'bot'
                      ? { dangerouslySetInnerHTML: { __html: formatMessage(msg.text) } }
                      : { children: msg.text })}
                  />
                ))}
                {isTyping && (
                  <div className="chat-msg bot" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                    Admin Assistant is typing…
                  </div>
                )}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* footer input — always shown in chat view */}
          <div className="chatbot-footer" style={{ padding: '12px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            {view === 'chat' ? (
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Ask a question…"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--navy)' }}
                />
                <button type="submit" style={{ background: 'var(--emerald)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', padding: '8px 16px', cursor: 'pointer' }}>
                  Send
                </button>
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
