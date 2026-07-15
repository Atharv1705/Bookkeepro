/**
 * confirm-modal.js — non-blocking replacement for window.confirm().
 *
 * Usage:
 *   const ok = await confirmModal("Delete this document?");
 *   if (!ok) return;
 *
 * Optional second argument for the confirm button label:
 *   await confirmModal("Remove user?", "Delete")
 */

(function () {
  /* Inject styles once */
  if (!document.getElementById("confirm-modal-styles")) {
    const style = document.createElement("style");
    style.id = "confirm-modal-styles";
    style.textContent = `
      .cm-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.35);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: cm-fade-in 0.15s ease;
      }
      .cm-box {
        background: #fff;
        border-radius: 14px;
        padding: 28px 32px;
        max-width: 380px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        text-align: center;
        animation: cm-slide-in 0.15s ease;
      }
      .cm-icon {
        font-size: 36px;
        margin-bottom: 12px;
      }
      .cm-message {
        font-family: "Poppins", "Segoe UI", sans-serif;
        font-size: 15px;
        color: #333;
        line-height: 1.5;
        margin-bottom: 22px;
        white-space: pre-line;
      }
      .cm-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      .cm-btn {
        padding: 10px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: opacity 0.15s;
      }
      .cm-btn:hover { opacity: 0.85; }
      .cm-btn-cancel  { background: #f0f0f0; color: #555; }
      .cm-btn-confirm { background: #ff4d4d; color: #fff; }
      @keyframes cm-fade-in  { from { opacity:0 } to { opacity:1 } }
      @keyframes cm-slide-in { from { transform:scale(0.92) } to { transform:scale(1) } }
    `;
    document.head.appendChild(style);
  }

  /**
   * @param {string} message      — text shown in the modal
   * @param {string} [confirmLabel="Confirm"]  — label for the confirm button
   * @returns {Promise<boolean>}
   */
  window.confirmModal = function (message, confirmLabel = "Confirm") {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "cm-backdrop";

      backdrop.innerHTML = `
        <div class="cm-box" role="dialog" aria-modal="true">
          <div class="cm-icon"><span class="material-symbols-outlined">warning</span></div>
          <div class="cm-message">${escapeHtml ? escapeHtml(message) : message}</div>
          <div class="cm-actions">
            <button class="cm-btn cm-btn-cancel"  id="cm-cancel">Cancel</button>
            <button class="cm-btn cm-btn-confirm" id="cm-confirm">${confirmLabel}</button>
          </div>
        </div>
      `;

      function cleanup(result) {
        backdrop.remove();
        resolve(result);
      }

      backdrop.querySelector("#cm-cancel").addEventListener("click",  () => cleanup(false));
      backdrop.querySelector("#cm-confirm").addEventListener("click", () => cleanup(true));

      /* Close on backdrop click */
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) cleanup(false);
      });

      /* Close on Escape */
      function onKeyDown(e) {
        if (e.key === "Escape") { document.removeEventListener("keydown", onKeyDown); cleanup(false); }
      }
      document.addEventListener("keydown", onKeyDown);

      document.body.appendChild(backdrop);
      /* Focus the cancel button by default (safer UX) */
      backdrop.querySelector("#cm-cancel").focus();
    });
  };
})();
