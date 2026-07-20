/**
 * Spinner helpers — no dependencies.
 *
 * Usage:
 *   showSpinner(container)          // replace content with spinner
 *   hideSpinner(container, html)    // restore container with new html
 *   spinnerHtml()                   // returns raw spinner html string (for innerHTML)
 */

(function () {
  if (!document.getElementById("spinner-styles")) {
    const style = document.createElement("style");
    style.id = "spinner-styles";
    style.textContent = `
      .spinner-wrap {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 40px 20px;
      }
      .spinner {
        width: 36px;
        height: 36px;
        border: 3px solid #e0e0e0;
        border-top-color: #0077c8;
        border-radius: 50%;
        animation: _spin 0.7s linear infinite;
        flex-shrink: 0;
      }
      .spinner.spinner-sm {
        width: 20px;
        height: 20px;
        border-width: 2px;
      }
      @keyframes _spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }

  window.spinnerHtml = function (small = false) {
    return `<div class="spinner-wrap"><div class="spinner${small ? " spinner-sm" : ""}"></div></div>`;
  };

  window.showSpinner = function (el) {
    if (!el) return;
    el._savedContent = el.innerHTML;
    el.innerHTML = spinnerHtml();
  };

  window.hideSpinner = function (el, html) {
    if (!el) return;
    el.innerHTML = html !== undefined ? html : (el._savedContent || "");
  };

  window.setButtonLoading = function(btn, isLoading, originalText = "") {
    if (!btn) return;
    if (isLoading) {
      btn.disabled = true;
      btn._savedText = btn.innerHTML;
      btn.innerHTML = `<div class="spinner spinner-sm" style="border-top-color:#fff; border-right-color:rgba(255,255,255,0.3); border-bottom-color:rgba(255,255,255,0.3); border-left-color:rgba(255,255,255,0.3); width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:8px;"></div> ${originalText || 'Processing...'}`;
    } else {
      btn.disabled = false;
      btn.innerHTML = originalText || btn._savedText || "";
    }
  };
})();
