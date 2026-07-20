import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const FAQ_DATA = {
  "Document Review": [
    { q: "How do I review a document?", a: "From the Admin Dashboard, click on any user. You'll see their uploaded documents. Click Approve or Reject and leave a note if needed." },
    { q: "What happens when I reject a document?", a: "The document's status changes to Rejected and the user is notified. They will see your review note and can upload a corrected version to replace it." },
    { q: "How do I upload admin documents for a user?", a: "Go to the user's detail page and scroll down to Admin Documents. You can upload tax returns, reports, and other finalized forms there. These will be visible to the user." }
  ],
  "User Management": [
    { q: "How do I see user details?", a: "Simply click on any user in the Admin Dashboard table. This will take you to their detailed view where you can see their info and all their documents." },
    { q: "Can I add another admin?", a: "Currently, Super Admins can only be created via the backend script `create_super_admin.py` for security reasons." }
  ],
  "Notifications": [
    { q: "How are users notified?", a: "Users receive automated emails when they sign up, when their documents are ready for review, and when you approve or reject their documents." }
  ]
};

const CATEGORY_ICONS = {
  "Document Review": "📑",
  "User Management": "👥",
  "Notifications": "🔔"
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

export default function AdminChatbot() {
  const { user, authFetch } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [view, setView] = useState('menu'); 
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

  const handleAdminStatusCheck = async () => {
    setMessages([...messages, { type: 'user', text: 'Give me a system overview.' }]);
    setView('chat');

    try {
      const res = await authFetch('/api/chatbot/admin-status');
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { type: 'bot', text: data.message }]);
      } else {
        setMessages(prev => [...prev, { type: 'bot', text: 'Sorry, I could not fetch the system status right now.' }]);
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

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin') || !location.pathname.startsWith('/admin')) {
    return null; 
  }

  return (
    <>
      <button className={`chatbot-fab ${isOpen ? 'open' : ''}`} onClick={toggleChat} aria-label="Open admin assistant" style={{background: 'linear-gradient(135deg, var(--navy) 0%, var(--blue) 100%)'}}>
        <span className="fab-icon">🤖</span>
        <span className="notif-dot"></span>
      </button>

      {isOpen && (
        <div className="chatbot-window visible">
          <div className="chatbot-header" style={{background: 'linear-gradient(135deg, var(--navy) 0%, #005fa3 100%)'}}>
            <div className="bot-avatar">🤖</div>
            <div className="bot-info">
              <h4>Admin Assistant</h4>
              <span>System Insights & Help</span>
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
                <button className="quick-reply-btn" style={{display: 'flex', width: '100%', marginBottom: '8px'}} onClick={handleAdminStatusCheck}>
                  <span className="qr-icon">📊</span>
                  Check System Status
                </button>
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
                    Admin Assistant is typing...
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
                <button type="submit" style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', padding: '8px 16px', cursor: 'pointer' }}>
                  Send
                </button>
              </form>
            ) : (
              <p style={{ margin: 0 }}>Admin tools & shortcuts</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
