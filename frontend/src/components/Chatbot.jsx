import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const FAQ_DATA = {
  // ... (keep the same FAQ_DATA below this)
  "Account": [
    { q: "How do I reset my password?", a: 'Go to the login page and click "Forgot Password". Enter your email and we\'ll send a reset link to your inbox.' },
    { q: "How do I verify my email?", a: 'Check your inbox for a verification email from BookKeepPro. Click the link inside to verify.' },
    { q: "How do I update my profile?", a: 'Go to your Profile page to update your name, phone number, or change your password.' },
  ],
  "Documents": [
    { q: "What file types are accepted?", a: "We accept PDF, JPG, PNG, WEBP, DOC, and DOCX files. The maximum file size is 10 MB." },
    { q: 'What does "Pending" status mean?', a: 'Your document has been uploaded successfully and is waiting for an admin to review it.' },
    { q: 'What does "Rejected" mean?', a: "The admin found an issue with your document. Check the review note for details." },
  ],
  "Tax Filing": [
    { q: "What tax years are supported?", a: "We currently support tax years 2023, 2024, 2025, and 2026." },
    { q: "What personal documents do I need?", a: 'An Individual Taxpayer Organizer for your tax year.' },
  ],
  "Security": [
    { q: "Is my data secure?", a: "Absolutely. All files are stored securely on our servers with encrypted access tokens." },
  ]
};

const CATEGORY_ICONS = {
  "Account": "👤",
  "Documents": "📄",
  "Tax Filing": "📋",
  "Security": "🔒"
};

const formatMessage = (text) => {
  if (!text) return '';
  let html = text;
  html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--blue); text-decoration: underline;">$1</a>');
  html = html.replace(/\n/g, '<br/>');
  return html;
};

export default function Chatbot() {
  const { user, authFetch } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [view, setView] = useState('menu'); // menu, category, chat
  const [activeCategory, setActiveCategory] = useState(null);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Close chatbot when navigating
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, view]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleDocStatusCheck = async () => {
    if (!user) {
      setMessages([...messages, { type: 'bot', text: 'You need to log in to check your document status.' }]);
      setView('chat');
      return;
    }
    
    setMessages([...messages, { type: 'user', text: 'Check my document status' }]);
    setView('chat');

    try {
      const res = await authFetch('/api/chatbot/doc-status');
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { type: 'bot', text: data.message }]);
      } else {
        setMessages(prev => [...prev, { type: 'bot', text: 'Sorry, I could not fetch your document status right now.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { type: 'bot', text: 'Network error occurred.' }]);
    }
  };

  const selectCategory = (cat) => {
    setActiveCategory(cat);
    setView('category');
  };

  const askFaq = (faq) => {
    setMessages(prev => [...prev, { type: 'user', text: faq.q }, { type: 'bot', text: faq.a }]);
    setView('chat');
  };

  const resetToMenu = () => {
    setView('menu');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = { type: 'user', role: 'user', text: inputText.trim() };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInputText("");
    setView('chat');
    setIsTyping(true);

    try {
      // Convert messages to format expected by backend
      const backendMessages = currentMessages.map(m => ({
        role: m.role || (m.type === 'bot' ? 'assistant' : 'user'),
        content: m.text,
        reasoning_details: m.reasoning_details || null
      }));

      const res = await authFetch('/api/chatbot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: backendMessages })
      });

      if (res.ok) {
        const data = await res.json();
        // Extract content and optional reasoning details
        const contentText = data.content || "Sorry, I couldn't understand that.";
        const reasoning = data.reasoning_details;
        setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: contentText, reasoning_details: reasoning }]);
      } else {
        setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: 'Sorry, I am having trouble connecting to the server.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { type: 'bot', role: 'assistant', text: 'Network error occurred. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!user || user.role === 'admin' || user.role === 'super_admin' || location.pathname.startsWith('/admin')) {
    return null; // Admin has a different dashboard, and logged out users shouldn't see it
  }

  return (
    <>
      <button className={`chatbot-fab ${isOpen ? 'open' : ''}`} onClick={toggleChat} aria-label="Open chat assistant">
        <span className="fab-icon">💬</span>
        <span className="notif-dot"></span>
      </button>

      {isOpen && (
        <div className="chatbot-window visible">
          <div className="chatbot-header">
            <div className="bot-avatar">🤖</div>
            <div className="bot-info">
              <h4>BookKeep Assistant</h4>
              <span>Online and ready to help</span>
            </div>
            <button className="close-chat" onClick={toggleChat}>✕</button>
          </div>

          <div className="chatbot-messages">
            {view === 'menu' && (
              <>
                <div className="chatbot-welcome-text">
                  <span className="material-symbols-outlined sparkle">auto_awesome</span>
                  <p>How can we help you today?</p>
                </div>
                {user && (
                  <button className="quick-reply-btn" style={{display: 'flex', width: '100%', marginBottom: '8px'}} onClick={handleDocStatusCheck}>
                    <span className="qr-icon">📋</span>
                    Check Document Status
                  </button>
                )}
                {Object.keys(FAQ_DATA).map(cat => (
                  <button key={cat} className="quick-reply-btn" style={{display: 'flex', width: '100%', marginBottom: '8px'}} onClick={() => selectCategory(cat)}>
                    <span className="qr-icon">{CATEGORY_ICONS[cat]}</span> {cat} FAQ
                  </button>
                ))}
              </>
            )}

            {view === 'category' && (
              <>
                <button className="quick-reply-btn" style={{display: 'flex', width: '100%', marginBottom: '16px', background: 'transparent', border: 'none'}} onClick={resetToMenu}>← Back to menu</button>
                <h4 style={{margin:'0 0 12px', fontSize:'14px', color:'var(--navy)'}}>{activeCategory} Questions</h4>
                {FAQ_DATA[activeCategory].map((faq, i) => (
                  <button key={i} className="quick-reply-btn" style={{display: 'flex', width: '100%', marginBottom: '8px'}} onClick={() => askFaq(faq)}>
                    {faq.q}
                  </button>
                ))}
              </>
            )}

            {view === 'chat' && (
              <>
                <button className="quick-reply-btn" onClick={resetToMenu} style={{display: 'flex', width: '100%', marginBottom: '16px', background: 'transparent', border: 'none'}}>
                  ← Back to menu
                </button>
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-msg ${msg.type === 'bot' ? 'bot' : 'user'}`} 
                       {...(msg.type === 'bot' ? { dangerouslySetInnerHTML: { __html: formatMessage(msg.text) } } : { children: msg.text })} 
                  />
                ))}
                {isTyping && (
                  <div className="chat-msg bot" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                    BookKeep Assistant is typing...
                  </div>
                )}
                <div ref={chatEndRef} />
              </>
            )}
          </div>
          
          <div className="chatbot-footer" style={{ padding: '12px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            {view === 'chat' ? (
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask a question..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--navy)' }}
                />
                <button type="submit" style={{ background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', padding: '8px 16px', cursor: 'pointer' }}>
                  Send
                </button>
              </form>
            ) : (
              <p style={{ margin: 0 }}>Need more help? <a href="/contact">Contact Support</a></p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
