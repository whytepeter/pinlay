// Shared components

const { PEOPLE, ISSUE_TYPES } = window._DATA;

const findPerson = (id) => PEOPLE.find(p => p.id === id) || PEOPLE[0];

// Avatar — colored mono initial, optional size
function Avatar({ person, size = 22, title }) {
  const p = typeof person === 'string' ? findPerson(person) : person;
  const initials = p.name.split(' ').map(s => s[0]).slice(0, 2).join('');
  const bg = `oklch(0.42 0.10 ${p.hue})`;
  const fg = `oklch(0.95 0.04 ${p.hue})`;
  return (
    <span
      className="avatar"
      title={title || p.name}
      style={{
        width: size, height: size, fontSize: Math.max(9, size * 0.42),
        background: `linear-gradient(135deg, ${bg}, oklch(0.32 0.08 ${p.hue}))`,
        color: fg,
      }}
    >{initials}</span>
  );
}

function AvatarStack({ people, size = 22, max = 4 }) {
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      {shown.map((p, i) => (
        <span key={i} style={{ marginLeft: i === 0 ? 0 : -6, position: 'relative', zIndex: shown.length - i }}>
          <Avatar person={p} size={size} />
        </span>
      ))}
      {more > 0 && (
        <span className="avatar mono" style={{
          marginLeft: -6, width: size, height: size, fontSize: size * 0.4,
          background: 'var(--bg-2)', color: 'var(--text-2)',
        }}>+{more}</span>
      )}
    </div>
  );
}

// Severity dot + label
function SeverityDot({ level, size = 8, ring = true }) {
  const colors = {
    critical: 'var(--sev-critical)', high: 'var(--sev-high)',
    medium: 'var(--sev-medium)', low: 'var(--sev-low)',
  };
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: 999,
      background: colors[level],
      boxShadow: ring ? `0 0 0 ${Math.max(2, size * 0.4)}px color-mix(in oklab, ${colors[level]} 18%, transparent)` : 'none',
      flex: 'none',
    }} />
  );
}

function SeverityChip({ level }) {
  const labels = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  return (
    <span className="chip" style={{ paddingLeft: 6 }}>
      <SeverityDot level={level} size={6} ring={false} />
      <span style={{ color: 'var(--text-1)' }}>{labels[level]}</span>
    </span>
  );
}

// Severity distribution heatbar
function SeverityHeatbar({ counts }) {
  const total = counts.critical + counts.high + counts.medium + counts.low;
  if (total === 0) return null;
  const segs = [
    ['critical', 'var(--sev-critical)'],
    ['high', 'var(--sev-high)'],
    ['medium', 'var(--sev-medium)'],
    ['low', 'var(--sev-low)'],
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1,
        display: 'flex', gap: 2, height: 4,
        borderRadius: 4, overflow: 'hidden', background: 'var(--bg-2)',
      }}>
        {segs.map(([k, c]) => counts[k] > 0 && (
          <div key={k}
            data-tip={`${counts[k]} ${k}`}
            style={{ background: c, flexBasis: `${(counts[k]/total)*100}%`, opacity: 0.95 }}
          />
        ))}
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
        {segs.map(([k, c]) => counts[k] > 0 && (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <SeverityDot level={k} size={5} ring={false} />
            <span style={{ color: 'var(--text-1)' }}>{counts[k]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function StatusChip({ status, dotOnly }) {
  const map = {
    open:          { label: 'Open',        color: 'var(--status-open)' },
    'in-progress': { label: 'In progress', color: 'var(--status-progress)' },
    resolved:      { label: 'Resolved',    color: 'var(--status-resolved)' },
  };
  const s = map[status] || map.open;
  if (dotOnly) {
    return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 50, background: s.color }} />;
  }
  return (
    <span className="chip" style={{
      background: 'transparent',
      borderColor: 'color-mix(in oklab, ' + s.color + ' 35%, var(--border))',
    }}>
      <span className="dot" style={{ background: s.color }} />
      <span style={{ color: 'var(--text-1)' }}>{s.label}</span>
    </span>
  );
}

function TypeChip({ type }) {
  const t = ISSUE_TYPES.find(x => x.id === type) || ISSUE_TYPES[0];
  return (
    <span className="chip mono" style={{ background: 'var(--bg-2)', color: 'var(--text-2)', textTransform: 'lowercase' }}>
      {t.short}
    </span>
  );
}

// Pin index pill — monospace, accent
function PinPill({ n, sm }) {
  const s = sm ? { height: 18, fontSize: 10.5, padding: '0 6px' } : { height: 22, fontSize: 11.5, padding: '0 8px' };
  return (
    <span className="mono" style={{
      ...s,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 4,
      background: 'var(--accent-soft)',
      color: 'var(--accent)',
      fontWeight: 600,
      letterSpacing: 0.02,
      border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
    }}>#{String(n).padStart(2, '0')}</span>
  );
}

// Sync chip — integration target with sync count
function SyncChip({ name, count, status = 'ok' }) {
  const color = status === 'ok' ? 'var(--status-resolved)'
              : status === 'pending' ? 'var(--sev-medium)'
              : 'var(--sev-critical)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11.5, color: 'var(--text-2)',
    }}>
      <Icon.Sync size={11} stroke={1.8} style={{ color }} />
      <span className="mono" style={{ color: 'var(--text-1)' }}>→</span>
      <span style={{ color: 'var(--text-1)' }}>{name}</span>
      <span className="mono" style={{ color: 'var(--text-2)' }}>·</span>
      <span className="mono" style={{ color: 'var(--text-1)' }}>{count}</span>
    </span>
  );
}

// Site favicon block
function Favicon({ label, hue = 268, size = 14 }) {
  return (
    <span className="mono" style={{
      width: size, height: size, flex: 'none',
      borderRadius: 3,
      background: `linear-gradient(135deg, oklch(0.55 0.18 ${hue}), oklch(0.32 0.14 ${hue}))`,
      color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(7, size * 0.5), fontWeight: 700,
    }}>{label}</span>
  );
}

// Severity left-border accent (for cards / rows)
function topSeverity(counts) {
  for (const k of ['critical', 'high', 'medium', 'low']) {
    if (counts[k] > 0) return k;
  }
  return 'low';
}

function severityColor(level) {
  return ({
    critical: 'var(--sev-critical)',
    high: 'var(--sev-high)',
    medium: 'var(--sev-medium)',
    low: 'var(--sev-low)',
  })[level];
}

// Toolbar segmented filter
function Segmented({ options, value, onChange }) {
  return (
    <div style={{
      display: 'inline-flex',
      padding: 2,
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 7,
      height: 30,
    }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            height: 24, padding: '0 10px',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            borderRadius: 5,
            background: active ? 'var(--bg-3)' : 'transparent',
            color: active ? 'var(--text-0)' : 'var(--text-2)',
            fontSize: 12.5, fontWeight: 500,
            boxShadow: active ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 0 0 1px var(--border-strong)' : 'none',
            transition: 'background 120ms ease, color 120ms ease',
            whiteSpace: 'nowrap',
          }}>
            {opt.label}
            {opt.count != null && (
              <span className="mono" style={{
                fontSize: 10.5,
                color: active ? 'var(--text-2)' : 'var(--text-3)',
              }}>{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Generic dropdown trigger (visual only)
function FilterDropdown({ label, value, onClick }) {
  return (
    <button className="btn" onClick={onClick} style={{ gap: 6 }}>
      <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>{label}:</span>
      <span style={{ color: 'var(--text-0)' }}>{value}</span>
      <Icon.ChevronDown size={12} />
    </button>
  );
}

// Search input
function SearchInput({ placeholder, value, onChange, kbd }) {
  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
      <Icon.Search size={13} style={{
        position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
        color: 'var(--text-3)', pointerEvents: 'none',
      }} />
      <input className="input"
        placeholder={placeholder}
        value={value} onChange={e => onChange?.(e.target.value)}
        style={{ paddingLeft: 28, paddingRight: kbd ? 36 : 10 }}
      />
      {kbd && (
        <kbd style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        }}>{kbd}</kbd>
      )}
    </div>
  );
}

// Page header (used across all top-level pages)
function PageHeader({ title, badge, subtitle, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '24px 32px 18px',
      borderBottom: '1px solid var(--border)',
      gap: 16,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{
            margin: 0, fontSize: 20, fontWeight: 600,
            letterSpacing: '-0.02em', color: 'var(--text-0)',
          }}>{title}</h1>
          {badge && (
            <span className="mono" style={{
              fontSize: 11, color: 'var(--text-2)',
              padding: '2px 7px', borderRadius: 4,
              background: 'var(--bg-1)', border: '1px solid var(--border)',
              whiteSpace: 'nowrap',
            }}>{badge}</span>
          )}
        </div>
        {subtitle && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>
    </div>
  );
}

Object.assign(window, {
  Avatar, AvatarStack, SeverityDot, SeverityChip, SeverityHeatbar,
  StatusChip, TypeChip, PinPill, SyncChip, Favicon,
  topSeverity, severityColor, findPerson,
  Segmented, FilterDropdown, SearchInput, PageHeader,
});
