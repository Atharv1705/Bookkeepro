import { useState } from 'react';

export default function ExpandableValue({ value, isArray }) {
  const [expanded, setExpanded] = useState(false);

  if (isArray) {
    if (!value || value.length === 0) return <span>—</span>;
    
    const showToggle = value.length > 3;
    const itemsToShow = expanded ? value : value.slice(0, 3);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <ul style={{ margin: '4px 0 0 16px', padding: 0, fontWeight: 600, color: 'var(--navy)' }}>
          {itemsToShow.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '4px', lineHeight: '1.4' }}>{item}</li>
          ))}
        </ul>
        {showToggle && (
          <button 
            type="button" 
            onClick={() => setExpanded(!expanded)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--primary)', 
              fontSize: '12px', 
              fontWeight: 600, 
              padding: '4px 0', 
              marginTop: '4px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignSelf: 'flex-start',
              gap: '4px'
            }}
          >
            {expanded ? 'Show Less' : `+ ${value.length - 3} More`}
          </button>
        )}
      </div>
    );
  }

  const text = value !== null && value !== undefined ? String(value) : "—";
  const maxLength = 400;
  const isLong = text.length > maxLength;

  if (!isLong) {
    return <span style={{ color: 'var(--navy)', fontWeight: 600, lineHeight: '1.4', display: 'block', marginTop: '2px' }}>{text}</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: '2px', width: '100%' }}>
      <span style={{ color: 'var(--navy)', fontWeight: 600, lineHeight: '1.4' }}>
        {expanded ? text : `${text.slice(0, maxLength)}...`}
      </span>
      <button 
        type="button" 
        onClick={() => setExpanded(!expanded)}
        style={{ 
          background: 'none', 
          border: 'none', 
          color: 'var(--primary)', 
          fontSize: '12px', 
          fontWeight: 600, 
          padding: '4px 0', 
          cursor: 'pointer',
          marginTop: '2px'
        }}
      >
        {expanded ? 'Read Less' : 'Read More'}
      </button>
    </div>
  );
}
