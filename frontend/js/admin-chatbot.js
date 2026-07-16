/**
 * admin-chatbot.js — BookKeepPro Admin Chatbot Widget
 *
 * Provides:
 *   - Admin status overview (fetches from /api/chatbot/admin-status)
 *   - Admin FAQs
 *
 * Requires: auth.js (for authFetch)
 */

(function () {
  "use strict";

  /* ─────────────────────────────────────────────
     Admin FAQ Knowledge Base
     ───────────────────────────────────────────── */
  const FAQ_DATA = {
    "Document Review": [
      {
        q: "How do I review a document?",
        a: "From the <a href='/admin-dashboard'>Admin Dashboard</a>, click on any user. You'll see their uploaded documents. Click <b>Approve</b> or <b>Reject</b> and leave a note if needed."
      },
      {
        q: "What happens when I reject a document?",
        a: "The document's status changes to <b>Rejected</b> and the user is notified. They will see your review note and can upload a corrected version to replace it."
      },
      {
        q: "How do I upload admin documents for a user?",
        a: "Go to the user's detail page and scroll down to <b>Admin Documents</b>. You can upload tax returns, reports, and other finalized forms there. These will be visible to the user."
      }
    ],
    "User Management": [
      {
        q: "How do I see user details?",
        a: "Simply click on any user in the <b>Admin Dashboard</b> table. This will take you to their detailed view where you can see their info and all their documents."
      },
      {
        q: "Can I add another admin?",
        a: "Currently, Super Admins can only be created via the backend script `create_super_admin.py` for security reasons."
      }
    ],
    "Notifications": [
      {
        q: "How are users notified?",
        a: "Users receive automated emails when they sign up, when their documents are ready for review, and when you approve or reject their documents."
      }
    ]
  };

  const CATEGORY_ICONS = {
    "Document Review": "📑",
    "User Management": "👥",
    "Notifications": "🔔"
  };

  /* ─────────────────────────────────────────────
     Inject HTML
     ───────────────────────────────────────────── */
  function injectWidget() {
    const widget = document.createElement("div");
    widget.id = "chatbot-widget";
    widget.innerHTML = `
      <button class="chatbot-fab" id="chatFab" aria-label="Open admin assistant" style="background: linear-gradient(135deg, var(--navy) 0%, var(--blue) 100%);">
        <span class="fab-icon">🤖</span>
        <span class="notif-dot"></span>
      </button>
      <div class="chatbot-window" id="chatWindow">
        <div class="chatbot-header" style="background: linear-gradient(135deg, var(--navy) 0%, #005fa3 100%);">
          <div class="bot-avatar">🤖</div>
          <div class="bot-info">
            <h4>Admin Assistant</h4>
            <span>System Insights & Help</span>
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
    div.style.background = "linear-gradient(135deg, var(--navy), var(--blue))";
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
    botReply("Hello Admin! 🛠️ How can I assist you today?", 400);
    setTimeout(() => {
      addQuickReplies([
        { icon: "📊", label: "System Overview", action: handleSystemOverview },
        { icon: "❓", label: "Admin FAQs",      action: handleFAQCategories }
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
     System Overview Flow
     ───────────────────────────────────────────── */
  async function handleSystemOverview() {
    const token = localStorage.getItem("token");
    if (!token) {
      botReply('You need to be logged in to view stats.', 500);
      setTimeout(addBackButton, 1200);
      return;
    }

    showTyping();

    try {
      const res = await window.authFetch("/api/chatbot/admin-status");
      if (!res || !res.ok) {
        hideTyping();
        addBotMessage("Sorry, I couldn't fetch the system status right now.");
        addBackButton();
        return;
      }

      const data = await res.json();
      hideTyping();

      addBotMessage(`Here is the current system overview:`);

      const summaryHtml = `
        <div class="status-summary" style="grid-template-columns: repeat(2, 1fr);">
          <div class="summary-item" style="grid-column: span 2;">
            <span class="count">${data.total_users}</span>
            <span class="label">Total Users</span>
          </div>
          <div class="summary-item pending">
            <span class="count">${data.pending_personal}</span>
            <span class="label">Pending Personal</span>
          </div>
          <div class="summary-item pending">
            <span class="count">${data.pending_business}</span>
            <span class="label">Pending Business</span>
          </div>
        </div>
      `;
      addBotMessage(summaryHtml);

      if (data.total_pending > 0) {
        setTimeout(() => {
          addBotMessage(`You have a total of <b>${data.total_pending} documents</b> waiting for review!`);
        }, 400);
      } else {
        setTimeout(() => {
          addBotMessage("All caught up! 🎉 There are no pending documents to review right now.");
        }, 400);
      }

      setTimeout(addBackButton, 800);

    } catch (err) {
      hideTyping();
      addBotMessage("Oops! Something went wrong while fetching stats.");
      addBackButton();
    }
  }

  /* ─────────────────────────────────────────────
     FAQ Flow
     ───────────────────────────────────────────── */
  function handleFAQCategories() {
    botReply("Choose a category to view admin guides:", 400);
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
    addBotMessage(`<b>${CATEGORY_ICONS[category] || ""} ${category}</b> — Select a guide:`);

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
      sessionStorage.setItem("admin_chatbot_open", isOpen ? "1" : "0");

      if (isOpen && !hasOpened) {
        hasOpened = true;
        showMainMenu();
      }
    }

    fab.addEventListener("click", toggle);
    close_.addEventListener("click", toggle);

    // Restore state from session
    if (sessionStorage.getItem("admin_chatbot_open") === "1") {
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
