/**
 * auth.js — shared utilities loaded by every protected page.
 *
 * Provides:
 *   authFetch(url, options)               — fetch with Bearer token + auto-redirect on 401
 *   logoutUser()                          — clear storage and redirect to /login
 *   guardAuth(requiredRoles)              — redirect if token missing or role not in list
 *   escapeHtml(str)                       — XSS-safe string for innerHTML insertion
 *   reviewBadge(status)                   — returns safe HTML badge string
 *   buildYearOptions(selectId, def)       — populate a <select> with current year - 3 years
 *   initSessionWarning()                  — toast warning + auto-logout before JWT expiry (#17)
 *   makeLabelsKeyboardAccessible(root)    — make upload labels keyboard-navigable (#18)
 */

(function () {

  /* ── escapeHtml ──────────────────────────────────────────────────────── */
  window.escapeHtml = function (str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  };

  /* ── authFetch ───────────────────────────────────────────────────────── */
  window.authFetch = async function (url, options = {}) {
    const token = localStorage.getItem("token");
    options.headers = {
      ...(options.headers || {}),
      Authorization: "Bearer " + token,
    };
    const res = await fetch(url, options);
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("selected_tax_year");
      window.location.href = "/login";
      return null;
    }
    return res;
  };

  /* ── logoutUser ──────────────────────────────────────────────────────── */
  window.logoutUser = function () {
    const role = localStorage.getItem("role");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("selected_tax_year");
    window.location.href = "/login";
  };

  /* ── guardAuth ───────────────────────────────────────────────────────── */
  window.guardAuth = function (requiredRoles = ["user"]) {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    if (!token || !requiredRoles.includes(role)) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("selected_tax_year");
      window.location.href = "/login";
    }
  };

  /* ── reviewBadge ─────────────────────────────────────────────────────── */
  window.reviewBadge = function (reviewStatus) {
    const map = {
      approved: { bg: "#e6f9ec", color: "#2e7d32", text: `<span class="material-symbols-outlined">check</span> Approved`        },
      rejected: { bg: "#fdecea", color: "#c62828", text: `<span class="material-symbols-outlined">close</span> Rejected`        },
      pending:  { bg: "#fff8e1", color: "#f57f17", text: `<span class="material-symbols-outlined">pending</span> Pending Review` },
    };
    const s = map[reviewStatus] || map.pending;
    return `<span style="
      display:inline-block;padding:2px 8px;border-radius:20px;
      font-size:11px;font-weight:600;
      background:${s.bg};color:${s.color};vertical-align:middle;margin-left:6px;
    ">${s.text}</span>`;
  };

  /* ── buildYearOptions ────────────────────────────────────────────────── */
  window.buildYearOptions = function (selectId, defaultYear) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = "";
    const cur = new Date().getFullYear();
    const def = defaultYear || cur;
    for (let y = cur; y >= cur - 3; y--) {
      const o = document.createElement("option");
      o.value       = y;
      o.textContent = y;
      if (y === def) o.selected = true;
      sel.appendChild(o);
    }
  };

  /* ── initSessionWarning (#17) ────────────────────────────────────────── */
  /**
   * Call once after guardAuth() on every protected page.
   * Shows a persistent warning toast 5 minutes before token expiry,
   * then auto-logs out when the token actually expires.
   */
  window.initSessionWarning = function () {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const payload    = JSON.parse(atob(token.split(".")[1]));
      const expiresIn  = (payload.exp * 1000) - Date.now();

      // Already expired — kick out immediately
      if (expiresIn <= 0) { window.logoutUser(); return; }

      // Warn 5 minutes before expiry
      const warnAt = expiresIn - 5 * 60 * 1000;
      if (warnAt > 0) {
        setTimeout(() => {
          if (window.showToast) {
            showToast("Your session expires in 5 minutes. Save your work.", "warning", 0);
          }
        }, warnAt);
      }

      // Auto-logout at exact expiry
      setTimeout(() => {
        if (window.showToast) showToast("Session expired. Redirecting to login…", "info");
        setTimeout(window.logoutUser, 2000);
      }, expiresIn);

    } catch (e) {
      // Malformed token — let the next API call handle it via 401
    }
  };

  /* ── makeLabelsKeyboardAccessible (#18) ─────────────────────────────── */
  /**
   * Make styled <label> upload buttons keyboard-accessible.
   * Call after rendering any upload labels with tabindex="0".
   * @param {Element} [root=document]  — scope the search to a container
   */
  window.makeLabelsKeyboardAccessible = function (root) {
    const scope = root || document;
    scope.querySelectorAll("label.upload-label[tabindex='0']").forEach(lbl => {
      if (lbl._kbAttached) return;
      lbl._kbAttached = true;
      lbl.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          lbl.click();
        }
      });
    });
  };

})();
