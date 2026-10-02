import React from "react";
import "./ConfirmModal.css";

function ConfirmModal({ isOpen, title, message, confirmText, cancelText, onConfirm, onCancel, isDestructive }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal-content" onClick={e => e.stopPropagation()}>
        {title && <h3 className="confirm-modal-title">{title}</h3>}
        {message && (
          <p className="confirm-modal-message">
            {message.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </p>
        )}
        <div className="confirm-modal-actions">
          <button className="confirm-modal-cancel" onClick={onCancel}>
            {cancelText || "Cancel"}
          </button>
          <button 
            className={`confirm-modal-confirm ${isDestructive ? 'destructive' : 'primary'}`} 
            onClick={onConfirm}
          >
            {confirmText || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
