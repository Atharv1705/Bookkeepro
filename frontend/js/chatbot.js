/**
 * chatbot.js — BookKeepPro Chatbot Widget
 *
 * Provides:
 *   - Document status checking (fetches from /api/chatbot/doc-status)
 *   - FAQ answers (hardcoded knowledge base)
 *   - Contact support shortcut
 *
 * Requires: auth.js (for authFetch)
 */

(function () {
  "use strict";

  /* ─────────────────────────────────────────────
     FAQ Knowledge Base
     ───────────────────────────────────────────── */
  const FAQ_DATA = {
    "Account": [
      {
        q: "How do I reset my password?",
        a: 'Go to the <a href="/login">login page</a> and click <b>"Forgot Password"</b>. Enter your email and we\'ll send a reset link to your inbox.'
      },
      {
        q: "How do I verify my email?",
        a: 'Check your inbox for a verification email from BookKeepPro. Click the link inside to verify. If you didn\'t receive it, visit the <a href="/resend-verification">Resend Verification</a> page.'
      },
      {
        q: "How do I update my profile?",
        a: 'Go to your <a href="/profile">Profile page</a> to update your name, phone number, or change your password.'
      },
      {
        q: "Can I change my email address?",
        a: "Currently, email addresses cannot be changed once registered. Please contact support if you need assistance."
      }
    ],
    "Documents": [
      {
        q: "What file types are accepted?",
        a: "We accept <b>PDF, JPG, PNG, WEBP, DOC, and DOCX</b> files. The maximum file size is <b>10 MB</b>."
      },
      {
        q: 'What does "Pending" status mean?',
        a: 'Your document has been <b>uploaded successfully</b> and is waiting for an admin to review it. You\'ll be notified once it\'s reviewed.'
      },
      {
        q: 'What does "Rejected" mean?',
        a: "The admin found an issue with your document. Check the <b>review note</b> for details about what needs to be fixed, then re-upload a corrected version."
      },
      {
        q: "How long does review take?",
        a: "Typically <b>1–3 business days</b>. You'll receive an email notification when your documents are reviewed."
      },
      {
        q: "Can I replace an uploaded document?",
        a: "Yes! Simply go to the upload page for that document type and upload a new file. It will replace the previous one."
      }
    ],
    "Tax Filing": [
      {
        q: "What tax years are supported?",
        a: "We currently support tax years <b>2023, 2024, 2025, and 2026</b>."
      },
      {
        q: "What personal documents do I need?",
        a: 'An <b>Individual Taxpayer Organizer</b> for your tax year. Visit the <a href="/upload-personal">Personal Documents</a> page for the full checklist.'
      },
      {
        q: "What business documents do I need?",
        a: '<b>S-Corp, LLC, or Partnership Organizer</b> plus Certificate of Formation, EIN, and Annual Financial Statements. Visit the <a href="/upload-business">Business Documents</a> page.'
      }
    ],
    "Security": [
      {
        q: "Is my data secure?",
        a: "Absolutely. All files are stored securely on our servers with <b>encrypted access tokens</b>. Only you and authorized admins can view your documents."
      },
      {
        q: "Who can see my documents?",
        a: "Only <b>you</b> and <b>authorized BookKeepPro administrators</b>. Your documents are never shared with third parties."
      }
    ]
  };

  const CATEGORY_ICONS = {
    "Account": "👤",
    "Documents": "📄",
    "Tax Filing": "📋",
    "Security": "🔒"
  };

  /* ─────────────────────────────────────────────
     Inject HTML
     ───────────────────────────────────────────── */
  function injectWidget() {
    const widget = document.createElement("div");
    widget.id = "chatbot-widget";
    widget.innerHTML = `
      <button class="chatbot-fab" id="chatFab" aria-label="Open chat assistant">
        <span class="fab-icon">💬</span>
        <span class="notif-dot"></span>
      </button>
      <div class="chatbot-window" id="chatWindow">
        <div class="chatbot-header">
          <div class="bot-avatar">🤖</div>
          <div class="bot-info">
            <h4>BookKeep Assistant</h4>
            <span>Always here to help</span>
          </div>
          <button class="close-chat" id="chatClose" aria-label="Close chat">✕</button>
        </div>
        <div class="chatbot-messages" id="chatMessages"></div>
      </div>
    `;
    document.body.appendChild(widget);
  }

  /* ─────────────────────────────────────────────
     Core Chat Logic
     ───────────────────────────────────────────── */
  let messagesEl;

  function addBotMessage(html) {
    const div = document.createElement("div");
    div.className = "chat-msg bot";
    div.innerHTML = html;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function addUserMessage(text) {
    const div = document.createElement("div");
    div.className = "chat-msg user";
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "typing-indicator";
    div.id = "typingIndicator";
    div.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function hideTyping() {
    const el = document.getElementById("typingIndicator");
    if (el) el.remove();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function botReply(html, delay) {
    delay = delay || 600;
    showTyping();
    setTimeout(() => {
      hideTyping();
      addBotMessage(html);
    }, delay);
  }

  /* ─────────────────────────────────────────────
     Quick Replies (Menu Buttons)
     ───────────────────────────────────────────── */
  function addQuickReplies(options) {
    const wrapper = document.createElement("div");
    wrapper.className = "quick-replies";
    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "quick-reply-btn";
      btn.innerHTML = `<span class="qr-icon">${opt.icon}</span> ${opt.label}`;
      btn.onclick = () => {
        addUserMessage(opt.label);
        opt.action();
      };
      wrapper.appendChild(btn);
    });
    messagesEl.appendChild(wrapper);
    scrollToBottom();
  }

  /* ─────────────────────────────────────────────
     Main Menu
     ───────────────────────────────────────────── */
  function showMainMenu() {
    botReply("Hi there! 👋 I'm your BookKeep Assistant. How can I help you today?", 400);
    setTimeout(() => {
      addQuickReplies([
        { icon: "📄", label: "Check Document Status", action: handleDocStatus },
        { icon: "❓", label: "FAQs",                  action: handleFAQCategories },
        { icon: "📞", label: "Contact Support",       action: handleContact }
      ]);
    }, 1050);
  }

  function addBackButton() {
    const btn = document.createElement("button");
    btn.className = "back-btn";
    btn.innerHTML = "← Back to main menu";
    btn.onclick = () => {
      addUserMessage("Back to main menu");
      showMainMenu();
    };
    messagesEl.appendChild(btn);
    scrollToBottom();
  }

  /* ─────────────────────────────────────────────
     Document Status Flow
     ───────────────────────────────────────────── */
  async function handleDocStatus() {
    const token = localStorage.getItem("token");
    if (!token) {
      botReply('You need to <a href="/login">log in</a> first to check your document status.', 500);
      setTimeout(addBackButton, 1200);
      return;
    }

    showTyping();

    try {
      const res = await window.authFetch("/api/chatbot/doc-status");
      if (!res || !res.ok) {
        hideTyping();
        addBotMessage("Sorry, I couldn't fetch your document status right now. Please try again later.");
        addBackButton();
        return;
      }

      const data = await res.json();
      hideTyping();

      if (data.summary.total === 0) {
        addBotMessage("You haven't uploaded any documents yet! 📭");
        addBotMessage('Head over to <a href="/upload-personal">Personal Documents</a> or <a href="/upload-business">Business Documents</a> to get started.');
        addBackButton();
        return;
      }

      // Summary banner
      addBotMessage(`Here's your document overview — <b>${data.summary.total} documents</b> total:`);

      const summaryHtml = `
        <div class="status-summary">
          <div class="summary-item pending">
            <span class="count">${data.summary.pending}</span>
            <span class="label">Pending</span>
          </div>
          <div class="summary-item approved">
            <span class="count">${data.summary.approved}</span>
            <span class="label">Approved</span>
          </div>
          <div class="summary-item rejected">
            <span class="count">${data.summary.rejected}</span>
            <span class="label">Rejected</span>
          </div>
        </div>
      `;
      addBotMessage(summaryHtml);

      // Personal docs
      if (data.personal.length > 0) {
        let personalHtml = "<b>📂 Personal Documents:</b>";
        data.personal.forEach(doc => {
          personalHtml += buildDocCard(doc.doc_type, doc.status, doc.note, doc.tax_year);
        });
        addBotMessage(personalHtml);
      }

      // Business docs
      if (data.business.length > 0) {
        let businessHtml = "<b>💼 Business Documents:</b>";
        data.business.forEach(doc => {
          businessHtml += buildDocCard(doc.business_type, doc.status, doc.note, doc.tax_year);
        });
        addBotMessage(businessHtml);
      }

      // Alert on rejected
      if (data.summary.rejected > 0) {
        setTimeout(() => {
          addBotMessage('⚠️ You have <b>' + data.summary.rejected + ' rejected</b> document(s). Please check the review notes and re-upload corrected versions.');
        }, 300);
      }

      setTimeout(addBackButton, 500);

    } catch (err) {
      hideTyping();
      addBotMessage("Oops! Something went wrong while fetching your status. Please try again.");
      addBackButton();
    }
  }

  function buildDocCard(name, status, note, year) {
    const statusIcon = status === "approved" ? "🟢" : status === "rejected" ? "🔴" : "🟡";
    const noteHtml = note ? `<div class="doc-note">📝 ${escapeText(note)}</div>` : "";
    return `
      <div class="doc-status-card">
        <div class="doc-name">${escapeText(name)}</div>
        <div class="doc-year">Tax Year: ${year}</div>
        <span class="doc-badge ${status}">${statusIcon} ${status}</span>
        ${noteHtml}
      </div>
    `;
  }

  function escapeText(str) {
    if (typeof window.escapeHtml === "function") return window.escapeHtml(str);
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  /* ─────────────────────────────────────────────
     FAQ Flow
     ───────────────────────────────────────────── */
  function handleFAQCategories() {
    botReply("Choose a category to browse common questions:", 400);
    setTimeout(() => {
      const options = Object.keys(FAQ_DATA).map(cat => ({
        icon: CATEGORY_ICONS[cat] || "📌",
        label: cat,
        action: () => showFAQList(cat)
      }));
      options.push({ icon: "←", label: "Back to main menu", action: showMainMenu });
      addQuickReplies(options);
    }, 1050);
  }

  function showFAQList(category) {
    addBotMessage(`<b>${CATEGORY_ICONS[category] || ""} ${category}</b> — Pick a question:`);

    const wrapper = document.createElement("div");
    FAQ_DATA[category].forEach(item => {
      const btn = document.createElement("button");
      btn.className = "faq-question";
      btn.textContent = item.q;
      btn.onclick = () => {
        addUserMessage(item.q);
        botReply(item.a, 500);
        setTimeout(() => {
          addQuickReplies([
            { icon: "📌", label: "More " + category + " questions", action: () => showFAQList(category) },
            { icon: "🏠", label: "Back to main menu", action: showMainMenu }
          ]);
        }, 1200);
      };
      wrapper.appendChild(btn);
    });
    messagesEl.appendChild(wrapper);
    scrollToBottom();
  }

  /* ─────────────────────────────────────────────
     Contact Support Flow
     ───────────────────────────────────────────── */
  function handleContact() {
    botReply(
      'You can reach our team anytime! 📧<br><br>' +
      '<b>Email:</b> <a href="mailto:atharvg.aiindia@gmail.com">atharvg.aiindia@gmail.com</a><br><br>' +
      'Or use our <a href="/contact">Contact Form</a> and we\'ll get back to you within 24 hours.',
      500
    );
    setTimeout(addBackButton, 1200);
  }

  /* ─────────────────────────────────────────────
     Initialize Widget
     ───────────────────────────────────────────── */
  function init() {
    injectWidget();

    const fab     = document.getElementById("chatFab");
    const window_ = document.getElementById("chatWindow");
    const close_  = document.getElementById("chatClose");
    messagesEl    = document.getElementById("chatMessages");

    let isOpen    = false;
    let hasOpened = false;

    function toggle() {
      isOpen = !isOpen;
      fab.classList.toggle("open", isOpen);
      window_.classList.toggle("visible", isOpen);
      sessionStorage.setItem("chatbot_open", isOpen ? "1" : "0");

      if (isOpen && !hasOpened) {
        hasOpened = true;
        showMainMenu();
      }
    }

    fab.addEventListener("click", toggle);
    close_.addEventListener("click", toggle);

    // Restore state from session
    if (sessionStorage.getItem("chatbot_open") === "1") {
      toggle();
    }
  }

  /* Start when DOM is ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
