import { useState } from 'react';
import ExpandableValue from './ExpandableValue';

const CONFIDENCE_STYLES = {
  high:    { icon: '🟢', color: 'var(--success)',  bg: 'var(--success-bg)' },
  medium:  { icon: '🟡', color: 'var(--warn)',     bg: 'var(--warn-bg)'    },
  low:     { icon: '🟠', color: '#d97706',         bg: '#fff7ed'           },
  unknown: { icon: '⚪', color: 'var(--muted)',    bg: 'var(--paper)'      },
};

export default function ExpandableSummaryBlock({ extractedData }) {
  const [expanded, setExpanded] = useState(false);

  // Separate _meta from the actual data fields
  const { _meta, ...dataFields } = extractedData || {};
  const entries = Object.entries(dataFields);

  if (entries.length === 0) {
    return (
      <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
        Blank form / No user data found.
      </div>
    );
  }

  const showToggle = entries.length > 3;
  const entriesToShow = expanded ? entries : entries.slice(0, 3);
  const confidenceStyle = CONFIDENCE_STYLES[_meta?.tier] || CONFIDENCE_STYLES.unknown;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Confidence tier badge */}
      {_meta && (
        <div
          title={_meta.description}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '10px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: confidenceStyle.color,
            background: confidenceStyle.bg,
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            alignSelf: 'flex-start',
            cursor: 'help',
            letterSpacing: '0.3px',
          }}
        >
          {confidenceStyle.icon} {_meta.label}
        </div>
      )}

      {/* Field rows */}
      {entriesToShow.map(([key, value]) => (
        <div key={key}>
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
