import { useState } from 'react';
import ExpandableValue from './ExpandableValue';

export default function ExpandableSummaryBlock({ extractedData }) {
  const [expanded, setExpanded] = useState(false);

  const entries = Object.entries(extractedData);
  if (entries.length === 0) {
    return (
      <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
        Blank form / No user data found.
      </div>
    );
  }

  const showToggle = entries.length > 3;
  const entriesToShow = expanded ? entries : entries.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {entriesToShow.map(([key, value]) => (
        <div key={key}>
          {/* Field label — uppercase, bold, navy */}
          <div style={{
            fontSize: '11px',
            color: 'var(--navy)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: '2px',
          }}>
            {key}
          </div>
          {/* Field value — bold navy */}
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>
            <ExpandableValue value={value} isArray={Array.isArray(value)} />
          </div>
        </div>
      ))}

      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--border)',
            color: 'var(--emerald)',
            fontSize: '12px',
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            alignSelf: 'flex-start',
            marginTop: '4px',
          }}
        >
          {expanded ? '− Show Less' : `+ Show ${entries.length - 3} More Fields`}
        </button>
      )}
    </div>
  );
}
