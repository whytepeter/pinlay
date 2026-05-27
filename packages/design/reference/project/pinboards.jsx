// Pinboards — sessions feed (card grid + compact list + new session modal).
// This is the day-to-day triage surface — every annotation session, grouped by page.

function Pinboards({ openIssue, view, setView, showEmpty, setShowEmpty }) {
  const { SESSIONS } = window._DATA;
  const [tab, setTab] = React.useState('all');
  const [sevFilter, setSevFilter] = React.useState('Any');
  const [typeFilter, setTypeFilter] = React.useState('Any');
  const [assignee, setAssignee] = React.useState('Anyone');
  const [sort, setSort] = React.useState('Newest');
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState(new Set());
  const [showNewModal, setShowNewModal] = React.useState(false);

  const sessions = showEmpty ? [] : SESSIONS;

  const filtered = sessions.filter(s => {
    if (tab !== 'all' && s.status !== tab) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.url.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tabCounts = {
    all: sessions.length,
    open: sessions.filter(s => s.status === 'open').length,
    'in-progress': sessions.filter(s => s.status === 'in-progress').length,
    resolved: sessions.filter(s => s.status === 'resolved').length,
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div className="page-wrap">
      <PageHeader
        title="Pinboards"
        badge={`${tabCounts.open} open`}
        subtitle="Every annotation session, grouped by page."
        right={
          <React.Fragment>
            <button className="btn ghost" data-tip="Toggle empty state" onClick={() => setShowEmpty(!showEmpty)}>
              <Icon.Eye size={13} />
              <span style={{ fontSize: 12 }}>{showEmpty ? 'Show data' : 'Empty state'}</span>
            </button>
            <button className="btn">
              <Icon.Sync size={13} />
              <span>Sync now</span>
            </button>
            <button className="btn primary" onClick={() => setShowNewModal(true)}>
              <Icon.Plus size={13} stroke={2} />
              <span>New session</span>
              <kbd style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', marginLeft: 4 }}>N</kbd>
            </button>
          </React.Fragment>
        }
      />

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 32px',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all',         label: 'All',         count: tabCounts.all },
            { value: 'open',        label: 'Open',        count: tabCounts.open },
            { value: 'in-progress', label: 'In progress', count: tabCounts['in-progress'] },
            { value: 'resolved',    label: 'Resolved',    count: tabCounts.resolved },
          ]}
        />
        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
        <FilterDropdown label="Severity" value={sevFilter} />
        <FilterDropdown label="Type"     value={typeFilter} />
        <FilterDropdown label="Assignee" value={assignee} />
        <div style={{ flex: 1 }} />
        <SearchInput placeholder="Filter by title or URL…" value={search} onChange={setSearch} kbd="/" />
        <FilterDropdown label="Sort" value={sort} />
        <div style={{
          display: 'inline-flex', padding: 2,
          background: 'var(--bg-1)', border: '1px solid var(--border)',
          borderRadius: 7,
        }}>
          {[
            { id: 'grid', I: Icon.Grid, tip: 'Card grid' },
            { id: 'list', I: Icon.List, tip: 'Compact list' },
          ].map(o => (
            <button key={o.id} data-tip={o.tip} onClick={() => setView(o.id)} style={{
              width: 26, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 5,
              background: view === o.id ? 'var(--bg-3)' : 'transparent',
              color: view === o.id ? 'var(--text-0)' : 'var(--text-2)',
              boxShadow: view === o.id ? '0 0 0 1px var(--border-strong)' : 'none',
            }}><o.I size={13} /></button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 32px 80px', minHeight: 600 }}>
        {filtered.length === 0
          ? <EmptyState />
          : view === 'grid'
            ? <CardGrid sessions={filtered} selected={selected} toggle={toggleSelect} openIssue={openIssue} />
            : <CompactList sessions={filtered} selected={selected} toggle={toggleSelect} openIssue={openIssue} />
        }
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <BulkBar count={selected.size} clear={() => setSelected(new Set())} />
      )}

      {/* New session modal */}
      {showNewModal && <NewSessionModal close={() => setShowNewModal(false)} />}
    </div>
  );
}

// CARD GRID -------------------------------------------------
function CardGrid({ sessions, selected, toggle, openIssue }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      gap: 14,
    }}>
      {sessions.map((s, i) => (
        <SessionCard key={s.id} s={s} isSelected={selected.has(s.id)} toggle={toggle} openIssue={openIssue} delay={i * 25} />
      ))}
    </div>
  );
}

function SessionCard({ s, isSelected, toggle, openIssue, delay }) {
  const [hover, setHover] = React.useState(false);
  const top = topSeverity(s.counts);
  const topColor = severityColor(top);
  const reporter = findPerson(s.reporter);
  const peopleSet = [reporter, findPerson('nina'), findPerson('idris')];

  return (
    <div
      className="card fade-up"
      onClick={() => openIssue(s.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        padding: 0,
        cursor: 'pointer',
        overflow: 'hidden',
        animationDelay: `${delay}ms`,
        background: hover ? 'var(--bg-elev)' : 'var(--bg-1)',
        borderColor: hover ? 'var(--border-strong)' : 'var(--border)',
        transition: 'background 140ms, border-color 140ms, transform 140ms',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      {/* Left severity bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: topColor,
      }} />

      <div style={{ padding: '14px 16px 0 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Checkbox (visible on hover/selected) */}
        <button
          onClick={(e) => { e.stopPropagation(); toggle(s.id); }}
          style={{
            width: 16, height: 16, borderRadius: 4,
            border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-strong)'}`,
            background: isSelected ? 'var(--accent)' : 'transparent',
            opacity: hover || isSelected ? 1 : 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 140ms, background 140ms',
            flex: 'none',
          }}
        >
          {isSelected && <Icon.Check size={11} stroke={2.5} style={{ color: '#fff' }} />}
        </button>
        <Favicon label={s.favicon} hue={s.faviconHue} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)', flex: 'none', whiteSpace: 'nowrap' }}>{s.id}</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {s.url}
          </span>
        </div>
        <StatusChip status={s.status} />
      </div>
      <div style={{ padding: '10px 16px 0 18px' }}>
        <h3 style={{
          margin: '0 0 4px',
          fontSize: 14.5,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: 'var(--text-0)',
          lineHeight: 1.35,
          textWrap: 'pretty',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{s.title}</h3>
      </div>

      <div style={{ padding: '12px 16px 0 18px' }}>
        <SeverityHeatbar counts={s.counts} />
      </div>

      <div style={{
        padding: '14px 16px',
        marginTop: 14,
        borderTop: '1px solid var(--border)',
        background: 'color-mix(in oklab, var(--bg-0) 30%, transparent)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Avatar person={reporter} size={20} />
        <div style={{ fontSize: 12, color: 'var(--text-1)', flex: 1, minWidth: 0 }}>
          <span style={{ color: 'var(--text-0)' }}>{reporter.name.split(' ')[0]}</span>
          <span style={{ color: 'var(--text-3)' }}> · {s.ago}</span>
        </div>
        <span className="mono" style={{
          fontSize: 11, padding: '3px 7px',
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          color: 'var(--text-1)', borderRadius: 4,
          fontWeight: 500, whiteSpace: 'nowrap', flex: 'none',
        }}>{s.pins} pins</span>
        <SyncChip name={s.integration.name} count={s.integration.synced} status={s.integration.status} />
      </div>
    </div>
  );
}

// COMPACT LIST ----------------------------------------------
function CompactList({ sessions, selected, toggle, openIssue }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '24px 90px 1fr 100px 90px 100px 80px 100px 80px 30px',
        gap: 14, padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-1)',
        fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        <div />
        <div>ID</div>
        <div>Title</div>
        <div>URL</div>
        <div>Pins</div>
        <div>Severity</div>
        <div>Reporter</div>
        <div>Synced</div>
        <div>Status</div>
        <div />
      </div>
      {sessions.map((s, idx) => {
        const top = topSeverity(s.counts);
        const reporter = findPerson(s.reporter);
        return (
          <div key={s.id}
            onClick={() => openIssue(s.id)}
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 90px 1fr 100px 90px 100px 80px 100px 80px 30px',
              gap: 14, padding: '12px 16px',
              borderBottom: idx === sessions.length - 1 ? 'none' : '1px solid var(--border-soft)',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background 120ms',
              position: 'relative',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elev)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{
              position: 'absolute', left: 0, top: 6, bottom: 6, width: 2,
              background: severityColor(top), borderRadius: '0 2px 2px 0',
            }} />
            <button
              onClick={(e) => { e.stopPropagation(); toggle(s.id); }}
              style={{
                width: 16, height: 16, borderRadius: 4,
                border: `1px solid ${selected.has(s.id) ? 'var(--accent)' : 'var(--border-strong)'}`,
                background: selected.has(s.id) ? 'var(--accent)' : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{selected.has(s.id) && <Icon.Check size={11} stroke={2.5} style={{ color: '#fff' }} />}</button>
            <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{s.id}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Favicon label={s.favicon} hue={s.faviconHue} size={12} />
              <span style={{
                fontSize: 13, color: 'var(--text-0)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{s.title}</span>
            </div>
            <span className="mono" style={{
              fontSize: 11, color: 'var(--text-2)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{s.url}</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-1)' }}>{s.pins}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <SeverityDot level={top} size={7} ring={false} />
              <span style={{ fontSize: 12, color: 'var(--text-1)', textTransform: 'capitalize' }}>{top}</span>
            </div>
            <Avatar person={reporter} size={20} />
            <SyncChip name={s.integration.name} count={s.integration.synced} status={s.integration.status} />
            <StatusChip status={s.status} />
            <Icon.Chevron size={13} style={{ color: 'var(--text-3)' }} />
          </div>
        );
      })}
    </div>
  );
}

// EMPTY STATE -----------------------------------------------
function EmptyState() {
  return (
    <div style={{
      maxWidth: 520, margin: '60px auto', textAlign: 'center',
      padding: '40px 20px',
    }}>
      <div style={{
        width: 96, height: 96, margin: '0 auto 24px',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at center, var(--accent-glow), transparent 70%)',
          filter: 'blur(8px)',
        }} />
        <svg viewBox="0 0 96 96" width="96" height="96" style={{ position: 'relative' }}>
          <defs>
            <linearGradient id="es-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.9" />
              <stop offset="1" stopColor="var(--accent-hover)" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <circle cx="48" cy="44" r="28" fill="none" stroke="url(#es-g)" strokeWidth="1.4" strokeDasharray="3 4" />
          <circle cx="48" cy="44" r="40" fill="none" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="2 6" />
          <path d="M48 22 C36 22 28 30 28 41 c0 13 14 24 19 27 .6.3 1.4.3 2 0 5-3 19-14 19-27 0-11-8-19-20-19z"
                fill="none" stroke="url(#es-g)" strokeWidth="1.6" />
          <circle cx="48" cy="40" r="6" fill="none" stroke="var(--accent)" strokeWidth="1.6" />
          <circle cx="48" cy="40" r="1.8" fill="var(--accent)" />
        </svg>
      </div>
      <h2 style={{
        margin: '0 0 8px',
        fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em',
        color: 'var(--text-0)',
      }}>No annotation sessions yet</h2>
      <p style={{
        margin: '0 0 24px',
        fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55,
        textWrap: 'pretty',
      }}>Install the browser extension, open any URL on your product, and start dropping pins. Sessions sync here in real time.</p>
      <div style={{ display: 'inline-flex', gap: 8 }}>
        <button className="btn primary">
          <Icon.CursorPin size={13} />
          <span>Install extension</span>
        </button>
        <button className="btn">
          <Icon.ExternalLink size={12} />
          <span>Watch 90-sec demo</span>
        </button>
      </div>

      <div style={{
        marginTop: 36, paddingTop: 28,
        borderTop: '1px solid var(--border)',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24,
        textAlign: 'left',
      }}>
        {[
          { n: '01', t: 'Install', d: 'Add the extension to Chrome, Firefox or Edge in under 30 seconds.' },
          { n: '02', t: 'Annotate', d: 'Pin any element. Add a comment, severity and screenshot.' },
          { n: '03', t: 'Ship', d: 'Pins auto-sync to your issue tracker, grouped by page.' },
        ].map(s => (
          <div key={s.n}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 6 }}>{s.n}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-0)', marginBottom: 4 }}>{s.t}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{s.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// BULK BAR --------------------------------------------------
function BulkBar({ count, clear }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(calc(-50% + var(--sidebar-w) / 2))',
      display: 'flex', alignItems: 'center', gap: 4,
      padding: 6, paddingLeft: 14,
      background: 'var(--bg-1)',
      border: '1px solid var(--border-strong)',
      borderRadius: 10,
      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02) inset',
      animation: 'fade-up 200ms ease-out',
      zIndex: 40,
    }}>
      <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-2)' }}>
        <span style={{ color: 'var(--accent)' }}>{count}</span> selected
      </span>
      <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 8px' }} />
      <button className="btn sm ghost"><Icon.Team size={12} /><span>Assign</span></button>
      <button className="btn sm ghost"><Icon.Sync size={12} /><span>Change status</span></button>
      <button className="btn sm ghost"><Icon.Plug size={12} /><span>Send to…</span></button>
      <button className="btn sm ghost"><Icon.ExternalLink size={12} /><span>Export</span></button>
      <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
      <button className="btn sm ghost" style={{ color: 'var(--sev-critical)' }}><span>Delete</span></button>
      <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
      <button className="btn icon sm" onClick={clear}><Icon.X size={12} /></button>
    </div>
  );
}

// NEW SESSION MODAL -----------------------------------------
function NewSessionModal({ close }) {
  const [url, setUrl] = React.useState('https://app.northwind.io/');
  return (
    <div onClick={close} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50,
      animation: 'fade-up 160ms ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 520, background: 'var(--bg-1)',
        border: '1px solid var(--border-strong)',
        borderRadius: 12,
        boxShadow: '0 40px 80px -10px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon.CursorPin size={15} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-0)', letterSpacing: '-0.01em' }}>
              Start a new session
            </h3>
            <button className="btn icon sm" style={{ marginLeft: 'auto' }} onClick={close}>
              <Icon.X size={12} />
            </button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
            We'll deep-link the extension to this URL and activate annotation mode.
          </p>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Page URL
            </label>
            <div style={{ position: 'relative' }}>
              <Icon.Globe size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input className="input" style={{ paddingLeft: 30, height: 34, fontSize: 13 }}
                value={url} onChange={e => setUrl(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Pinboard
              </label>
              <button className="btn" style={{ width: '100%', justifyContent: 'space-between', height: 34 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'oklch(0.55 0.16 14)' }} />
                  Checkout funnel
                </span>
                <Icon.ChevronDown size={12} />
              </button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Default integration
              </label>
              <button className="btn" style={{ width: '100%', justifyContent: 'space-between', height: 34 }}>
                <span>Linear · NW-WEB</span>
                <Icon.ChevronDown size={12} />
              </button>
            </div>
          </div>
          <div style={{
            padding: '10px 12px', background: 'var(--bg-0)',
            border: '1px solid var(--border)', borderRadius: 7,
            fontSize: 12, color: 'var(--text-2)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <Icon.Bolt size={13} style={{ color: 'var(--accent)', flex: 'none', marginTop: 1 }} />
            <span style={{ lineHeight: 1.5 }}>
              Heads-up — the extension will switch focus to a new tab. Keep this page open to watch pins land here in real time.
            </span>
          </div>
        </div>
        <div style={{
          padding: 14, display: 'flex', gap: 8, justifyContent: 'flex-end',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-0)',
        }}>
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn primary" onClick={close}>
            <Icon.CursorPin size={12} />
            <span>Launch session</span>
          </button>
        </div>
      </div>
    </div>
  );
}

window.Pinboards = Pinboards;
