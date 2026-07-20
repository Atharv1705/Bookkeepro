/**
 * Toast notification system — no dependencies, no libraries.
 * Usage:
 *   showToast("Saved successfully")                    // green success
 *   showToast("Something failed", "error")             // red error
 *   showToast("Processing...", "info", 0)              // blue, stays until dismissed
 *   showToast("Check your input", "warning")           // orange warning
 */

(function () {
  // Inject styles once
  if (!document.getElementById("toast-styles")) {
    const style = document.createElement("style");
    style.id = "toast-styles";
    style.textContent = `
      #toast-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 340px;
      }
      .toast {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 13px 16px;
        border-radius: 10px;
        font-family: "Poppins", "Segoe UI", sans-serif;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.4;
        box-shadow: 0 4px 16px rgba(0,0,0,0.13);
        cursor: pointer;
        animation: toast-in 0.3s ease;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .toast.toast-out {
        opacity: 0;
        transform: translateX(20px);
      }
      .toast.success { background:#e6f9ec; color:#1b5e20; border-left:4px solid #2e7d32; }
      .toast.error   { background:#fdecea; color:#b71c1c; border-left:4px solid #c62828; }
      .toast.info    { background:#e3f2fd; color:#0d47a1; border-left:4px solid #1565c0; }
      .toast.warning { background:#fff8e1; color:#e65100; border-left:4px solid #f57f17; }
      .toast-icon  { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
      .toast-msg   { flex: 1; }
      .toast-close { font-size: 16px; cursor: pointer; opacity: 0.5; flex-shrink: 0; margin-top: 1px; }
      .toast-close:hover { opacity: 1; }
      @keyframes toast-in {
        from { opacity: 0; transform: translateX(20px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }

  function getContainer() {
    let c = document.getElementById("toast-container");
    if (!c) {
      c = document.createElement("div");
      c.id = "toast-container";
      document.body.appendChild(c);
    }
    return c;
  }

  const ICONS = {
    success: '<span class="material-symbols-outlined">check_circle</span>',
    error:   '<span class="material-symbols-outlined">cancel</span>',
    info:    '<span class="material-symbols-outlined">info</span>',
    warning: '<span class="material-symbols-outlined">warning</span>',
  };

  /**
   * @param {string}  message  — text to show
   * @param {string}  type     — "success" | "error" | "info" | "warning"
   * @param {number}  duration — ms before auto-dismiss (0 = stay until clicked)
   */
  window.showToast = function (message, type = "success", duration = 3500) {
    const container = getContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    toast.innerHTML = `
      <span class="toast-icon">${ICONS[type] || "💬"}</span>
      <span class="toast-msg">${message}</span>
      <span class="toast-close" title="Dismiss">✕</span>
    `;

    function dismiss() {
      toast.classList.add("toast-out");
      setTimeout(() => toast.remove(), 300);
    }

    toast.addEventListener("click", dismiss);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }

    container.appendChild(toast);
    return toast;
  };
})();
