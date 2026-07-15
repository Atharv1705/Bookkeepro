/**
 * Password strength indicator.
 * Call initPasswordStrength("inputId") to attach to a password field.
 * A bar + label appear below the field automatically.
 */

(function () {
  if (!document.getElementById("pw-strength-styles")) {
    const style = document.createElement("style");
    style.id = "pw-strength-styles";
    style.textContent = `
      .pw-strength-bar-wrap {
        height: 4px;
        background: #e0e0e0;
        border-radius: 2px;
        margin-top: -8px;
        margin-bottom: 10px;
        overflow: hidden;
      }
      .pw-strength-bar {
        height: 100%;
        border-radius: 2px;
        transition: width 0.3s ease, background 0.3s ease;
        width: 0;
      }
      .pw-strength-label {
        font-size: 12px;
        margin-bottom: 10px;
        margin-top: -6px;
        font-weight: 500;
      }
      .pw-weak   { background: #c62828; }
      .pw-medium { background: #f57f17; }
      .pw-strong { background: #2e7d32; }
    `;
    document.head.appendChild(style);
  }

  function checkStrength(pw) {
    if (!pw || pw.length < 8) return { level: "weak",   pct: 25,  label: "Too short (min 8 chars)",  cls: "pw-weak"   };
    const hasUpper  = /[A-Z]/.test(pw);
    const hasNum    = /[0-9]/.test(pw);
    const hasSymbol = /[^A-Za-z0-9]/.test(pw);
    const long      = pw.length >= 12;

    const score = [hasUpper, hasNum, hasSymbol, long].filter(Boolean).length;

    if (score <= 1) return { level: "weak",   pct: 33,  label: "Weak — add uppercase & numbers", cls: "pw-weak"   };
    if (score === 2) return { level: "medium", pct: 66,  label: "Medium — getting better",       cls: "pw-medium" };
    return              { level: "strong", pct: 100, label: `Strong password <span class="material-symbols-outlined">check</span>`,               cls: "pw-strong" };
  }

  window.initPasswordStrength = function (inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Create bar + label
    const barWrap = document.createElement("div");
    barWrap.className = "pw-strength-bar-wrap";
    const bar = document.createElement("div");
    bar.className = "pw-strength-bar";
    barWrap.appendChild(bar);

    const label = document.createElement("div");
    label.className = "pw-strength-label";
    label.style.color = "#888";

    // Insert after input's parent wrapper (handles both plain input and wrapped input)
    const after = input.closest("div") || input;
    after.after(label);
    after.after(barWrap);

    input.addEventListener("input", () => {
      const val = input.value;
      if (!val) {
        bar.style.width = "0";
        bar.className = "pw-strength-bar";
        label.textContent = "";
        return;
      }
      const { pct, label: lbl, cls } = checkStrength(val);
      bar.style.width = pct + "%";
      bar.className = "pw-strength-bar " + cls;
      label.textContent = lbl;
      label.style.color = cls === "pw-weak" ? "#c62828" : cls === "pw-medium" ? "#f57f17" : "#2e7d32";
    });
  };
})();
