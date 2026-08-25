import { useState } from 'react';
import ExpandableValue from './ExpandableValue';

const CONFIDENCE_STYLES = {
  high:    { icon: '🟢', color: 'var(--success)',  bg: 'var(--success-bg)' },
  medium:  { icon: '🟡', color: 'var(--warn)',     bg: 'var(--warn-bg)'    },
  low:     { icon: '🟠', color: '#d97706',         bg: '#fff7ed'           },
  unknown: { icon: '⚪', color: 'var(--muted)',    bg: 'var(--paper)'      },
};

export default function ExpandableSummaryBlock({ extractedData, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Separate _meta from the actual data fields
  const { _meta, ...dataFields } = extractedData || {};
  const entries = Object.entries(dataFields);

  if (entries.length === 0 && !isEditing) {
    return (
      <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
        Blank form / No user data found.
      </div>
    );
  }

  const handleEditClick = () => {
    setEditValue(JSON.stringify(extractedData || {}, null, 2));
    setSaveError("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError("");
  };

  const handleSave = async () => {
    setSaveError("");
    let parsed = null;
    try {
      parsed = JSON.parse(editValue);
    } catch (err) { console.error(err);
      setSaveError("Invalid JSON format");
      return;
    }

    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(parsed);
        setIsEditing(false);
      } catch (err) { console.error(err);
        setSaveError("Failed to save changes");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleExport = () => {
    // Convert extracted data into a 2-column CSV (Field, Value)
    const { _meta, ...dataFields } = extractedData || {};
    
    const escapeCsv = (str) => {
      const s = String(str);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvRows = ['Field,Value'];
    Object.entries(dataFields).forEach(([key, val]) => {
      let valStr = val;
      if (Array.isArray(val)) {
        valStr = val.join('; ');
      } else if (typeof val === 'object' && val !== null) {
        valStr = JSON.stringify(val);
      }
      csvRows.push(`${escapeCsv(key)},${escapeCsv(valStr)}`);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extracted_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const showToggle = entries.length > 3;
  const entriesToShow = expanded ? entries : entries.slice(0, 3);
  const confidenceStyle = CONFIDENCE_STYLES[_meta?.tier] || CONFIDENCE_STYLES.unknown;

  if (isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--navy)' }}>Edit Extracted Data (JSON)</div>
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          style={{
            width: '100%',
            height: '200px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: '#fff',
            resize: 'vertical'
          }}
        />
        {saveError && <div style={{ fontSize: '12px', color: 'var(--error)' }}>{saveError}</div>}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSave} disabled={isSaving} className="btn btn-primary btn-sm" style={{borderRadius: 'var(--radius-sm)'}}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button onClick={handleCancelEdit} disabled={isSaving} className="btn btn-secondary btn-sm" style={{borderRadius: 'var(--radius-sm)'}}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Top action bar: Confidence tier + Edit/Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {_meta ? (
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
              cursor: 'help',
              letterSpacing: '0.3px',
            }}
          >
            {confidenceStyle.icon} {_meta.label}
          </div>
        ) : <div />}

        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={handleExport} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px' }} title="Export CSV">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span> Export CSV
          </button>
          <button onClick={handleEditClick} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px', fontWeight: 600 }} title="Edit Summary">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span> Edit
          </button>
        </div>
      </div>

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
