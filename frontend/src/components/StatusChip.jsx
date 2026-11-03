import React from 'react';

export default function StatusChip({ status, note }) {
  const s = (status || 'pending').toLowerCase();
  
  let pillClass = 'artha-status-pending';
  let iconName = 'schedule';

  if (s === 'approved' || s === 'filed' || s === 'verified') {
    pillClass = 'artha-status-approved';
    iconName = s === 'filed' ? 'inventory_2' : 'check_circle';
  } else if (s === 'rejected' || s === 'error') {
    pillClass = 'artha-status-rejected';
    iconName = 'cancel';
  } else if (s === 'sent_for_approval') {
    pillClass = 'artha-status-sent';
    iconName = 'hourglass_top';
  }

  const statusText = s.replace(/_/g, ' ').toUpperCase();

  return (
    <div className="status-chip-container">
      <span className={`artha-status-pill ${pillClass}`}>
        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{iconName}</span>
        {statusText}
      </span>
      {note && (
        <div className="status-chip-note" style={{ fontSize: '11.5px', marginTop: '2px', color: s === 'rejected' ? '#DC2626' : '#425466' }}>
          {s === 'rejected' ? 'Reason: ' : 'Note: '}{note}
        </div>
      )}
    </div>
  );
}
