import React from 'react';

export default function StatusChip({ status, note }) {
  const s = (status || 'pending').toLowerCase();
  
  let badgeClass = 'badge-yellow';
  if (s === 'approved' || s === 'filed' || s === 'verified') badgeClass = 'badge-green';
  if (s === 'rejected' || s === 'error') badgeClass = 'badge-red';
  if (s === 'sent_for_approval') badgeClass = 'badge-blue';

  const statusText = s.replace(/_/g, ' ').toUpperCase();

  return (
    <div className="status-chip-container">
      <span className={`badge ${badgeClass} `}>{statusText}</span>
      {note && (
        <div className="status-chip-note">
          {s === 'rejected' ? 'Reason: ' : 'Note: '}{note}
        </div>
      )}
    </div>
  );
}
