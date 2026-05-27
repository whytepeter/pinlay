// Issue Detail — pin list + screenshot + activity thread

function IssueDetail({ sessionId, back, toggleSidebar }) {
  const { SESSIONS, PINS } = window._DATA;
  const session = SESSIONS.find(s => s.id === sessionId) || SESSIONS[0];
  const [activePin, setActivePin] = React.useState(1);
  const [mobilePinsOpen, setMobilePinsOpen] = React.useState(false);
  const pin = PINS.find(p => p.i === activePin) || PINS[0];

  const navPin = (dir) => {
    const idx = PINS.findIndex(p => p.i === activePin);
    const next = (idx + dir + PINS.length) % PINS.length;
    setActivePin(PINS[next].i);
  };

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'j' || e.key === 'ArrowDown') navPin(1);
      if (e.key === 'k' || e.key === 'ArrowUp')   navPin(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="page-wrap" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        flex: 'none',
        flexWrap: 'wrap',
      }}>
        <MenuButton toggleSidebar={toggleSidebar} />
        <button className="btn ghost" onClick={back}>
          <Icon.ArrowLeft size={13} />
          <span>Issues</span>
        </button>
        <Icon.Chevron size={12} style={{ color: 'var(--text-3)', flex: 'none' }} />
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', flex: 'none' }}>{session.id}</span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Favicon label={session.favicon} hue={session.faviconHue} />
          <span style={{
            fontSize: 13.5, fontWeight: 500, color: 'var(--text-0)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
          }}>{session.title}</span>
        </div>
        <button className="btn hide-narrow"><Icon.Copy size={12} /><span>Copy link</span></button>
        <button className="btn hide-narrow"><Icon.Image size={12} /><span>Export PNG</span></button>
        <button className="btn hide-mobile"><span>View in Linear</span><Icon.ExternalLink size={12} /></button>
        <button className="btn primary">
          <Icon.CursorPin size={12} />
          <span>Open on page</span>
        </button>
      </div>

      {/* Mobile: show pin list toggle */}
      <button
        className="show-mobile-only"
        onClick={() => setMobilePinsOpen(!mobilePinsOpen)}
        style={{
          display: 'none',
          alignItems: 'center', gap: 8,
          padding: '10px 16px',
          background: 'var(--bg-1)',
          borderBottom: '1px solid var(--border)',
          cursor: 'pointer',
          color: 'var(--text-0)',
          fontSize: 13, fontWeight: 500,
          textAlign: 'left',
          width: '100%',
        }}>
        <Icon.List size={13} style={{ color: 'var(--text-2)' }} />
        <span>Pins</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)', padding: '2px 6px', background: 'var(--bg-2)', borderRadius: 3 }}>{PINS.length}</span>
        <span style={{ flex: 1 }} />
        <Icon.ChevronDown size={12} style={{
          color: 'var(--text-3)',
          transform: mobilePinsOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 160ms',
        }} />
      </button>

      {/* Body — two column on desktop, stacked on mobile */}
      <div className="issue-body">
        {/* Left: pin list */}
        <div className="issue-rail" data-mobile-open={mobilePinsOpen ? 'true' : 'false'}>
          <PinList session={session} pins={PINS} active={activePin}
            setActive={(i) => { setActivePin(i); setMobilePinsOpen(false); }} />
        </div>

        {/* Right: pin detail */}
        <PinDetail pin={pin} navPin={navPin} idx={PINS.findIndex(p => p.i === activePin)} total={PINS.length} />
      </div>
    </div>
  );
}

// PIN LIST --------------------------------------------------
function PinList({ session, pins, active, setActive }) {
  return (
    <div style={{
      width: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-0)',
      height: '100%',
    }}>
      {/* Session meta */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11.5, color: 'var(--text-2)', marginBottom: 8,
        }}>
          <Icon.Globe size={12} />
          <span className="mono" style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: 'var(--text-1)', flex: 1,
          }}>{session.url}</span>
          <button className="btn icon sm" data-tip="Open URL"><Icon.ExternalLink size={11} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'var(--text-2)' }}>
          <Avatar person={session.reporter} size={18} />
          <span>{findPerson(session.reporter).name.split(' ')[0]}</span>
          <span className="mono" style={{ color: 'var(--text-3)' }}>·</span>
          <span>{session.ago}</span>
          <span className="mono" style={{ color: 'var(--text-3)' }}>·</span>
          <StatusChip status={session.status} />
        </div>
      </div>

      {/* Filter row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        fontSize: 11.5, color: 'var(--text-2)',
        whiteSpace: 'nowrap',
      }}>
        <span className="mono" style={{
          fontSize: 11, color: 'var(--text-1)', padding: '2px 6px',
          background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 3,
        }}>{pins.length} pins</span>
        <span style={{ color: 'var(--text-3)' }}>·</span>
        <span>Sort</span>
        <button style={{ color: 'var(--text-0)', fontSize: 11.5, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Severity
          <Icon.ChevronDown size={10} />
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn icon sm" data-tip="Filter"><Icon.Filter size={11} /></button>
      </div>

      {/* Pin items */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {pins.map(p => {
          const isActive = p.i === active;
          return (
            <button key={p.i} onClick={() => setActive(p.i)} style={{
              width: '100%',
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '11px 14px 11px 14px',
              background: isActive ? 'var(--bg-2)' : 'transparent',
              borderBottom: '1px solid var(--border-soft)',
              borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer', textAlign: 'left',
              transition: 'background 120ms',
              position: 'relative',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-1)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
              <PinPill n={p.i} sm />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, color: 'var(--text-0)', lineHeight: 1.35,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  marginBottom: 6, fontWeight: 450,
                }}>{p.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <SeverityDot level={p.severity} size={6} ring={false} />
                  <TypeChip type={p.type} />
                  {p.stale && (
                    <span data-tip="Anchor element not found on current DOM" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: 10.5, color: 'var(--status-stale)',
                    }}>
                      <Icon.Warning size={10} stroke={2} />
                      stale
                    </span>
                  )}
                  <span style={{ flex: 1 }} />
                  <Avatar person={p.assignee} size={16} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
        <button className="btn" style={{ width: '100%' }}>
          <Icon.Plus size={12} />
          <span>Add comment to session</span>
        </button>
      </div>
    </div>
  );
}

// PIN DETAIL ------------------------------------------------
function PinDetail({ pin, navPin, idx, total }) {
  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: 'var(--bg-0)' }}>
      {/* Pin header */}
      <div style={{
        padding: '18px 28px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 5,
        background: 'color-mix(in oklab, var(--bg-0) 92%, transparent)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <PinPill n={pin.i} />
          <SeverityChip level={pin.severity} />
          <TypeChip type={pin.type} />
          {pin.stale && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11.5, color: 'var(--status-stale)',
              padding: '3px 7px', borderRadius: 4,
              background: 'color-mix(in oklab, var(--status-stale) 12%, transparent)',
              border: '1px solid color-mix(in oklab, var(--status-stale) 30%, transparent)',
            }}>
              <Icon.Warning size={11} stroke={2} />
              Anchor stale
            </span>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-3)' }}>
            <button className="btn icon sm" data-tip="Previous (K)" onClick={() => navPin(-1)}><Icon.ArrowLeft size={11} /></button>
            <span className="mono" style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{idx + 1} / {total}</span>
            <button className="btn icon sm" data-tip="Next (J)" onClick={() => navPin(1)}><Icon.ArrowRight size={11} /></button>
          </div>
          <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
          <button className="btn">
            <Avatar person={pin.assignee} size={16} />
            <span>{findPerson(pin.assignee).name.split(' ')[0]}</span>
            <Icon.ChevronDown size={11} />
          </button>
          <button className="btn">
            <StatusChip status={pin.status} />
            <Icon.ChevronDown size={11} />
          </button>
          <button className="btn primary sm">
            <Icon.Check size={11} stroke={2.5} />
            <span>Resolve</span>
          </button>
        </div>
        <h2 style={{
          margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em',
          color: 'var(--text-0)', textWrap: 'pretty', lineHeight: 1.3,
        }}>{pin.title}</h2>
      </div>

      <div style={{ padding: '20px 28px 80px', maxWidth: 820 }}>
        {/* Comment body */}
        <div style={{
          fontSize: 14, color: 'var(--text-1)', lineHeight: 1.65,
          textWrap: 'pretty', marginBottom: 24,
        }}>{pin.body}</div>

        {/* Screenshot with markup */}
        <ScreenshotMockup pin={pin} />

        {/* Anchor */}
        <AnchorBlock anchor={pin.anchor} stale={pin.stale} />

        {/* Activity */}
        <ActivityThread />

        {/* Reply box */}
        <ReplyBox />
      </div>
    </div>
  );
}

// SCREENSHOT MOCK -------------------------------------------
function ScreenshotMockup({ pin }) {
  return (
    <figure style={{ margin: '0 0 24px', position: 'relative' }}>
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: '#0E0E12',
        aspectRatio: '16 / 9',
      }}>
        {/* fake browser chrome */}
        <div style={{
          height: 28, display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 10px',
          background: 'var(--bg-2)', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 50, background: '#3a3a40' }} />
          <span style={{ width: 8, height: 8, borderRadius: 50, background: '#3a3a40' }} />
          <span style={{ width: 8, height: 8, borderRadius: 50, background: '#3a3a40' }} />
          <span className="mono" style={{
            marginLeft: 12, fontSize: 10.5, color: 'var(--text-3)',
            padding: '2px 8px', background: 'var(--bg-0)',
            border: '1px solid var(--border)', borderRadius: 4,
          }}>app.northwind.io/checkout/payment</span>
        </div>

        {/* fake page content */}
        <div style={{
          padding: 28, height: 'calc(100% - 28px)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28,
          background: 'linear-gradient(180deg, #0E0E12, #08080C)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ height: 12, width: '60%', background: 'var(--bg-3)', borderRadius: 3 }} />
            <div style={{ height: 8, width: '40%', background: 'var(--bg-2)', borderRadius: 3 }} />
            <div style={{ height: 38, background: 'var(--bg-2)', borderRadius: 6, marginTop: 6 }} />
            <div style={{ height: 38, background: 'var(--bg-2)', borderRadius: 6 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ height: 38, background: 'var(--bg-2)', borderRadius: 6 }} />
              <div style={{ height: 38, background: 'var(--bg-2)', borderRadius: 6, position: 'relative' }}>
                {/* This is the pinned element */}
                <span style={{ position: 'absolute', inset: 0, border: '1.5px dashed var(--accent)', borderRadius: 6, pointerEvents: 'none' }} />
              </div>
            </div>
            <div style={{ height: 12 }} />
            <div style={{
              height: 40,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
              borderRadius: 6, opacity: 0.95,
            }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              padding: 16, background: 'var(--bg-1)',
              border: '1px solid var(--border)', borderRadius: 8,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ height: 10, width: '40%', background: 'var(--bg-3)', borderRadius: 3 }} />
              {[1,2,3,4].map(i => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ height: 8, width: '50%', background: 'var(--bg-2)', borderRadius: 3 }} />
                  <div style={{ height: 8, width: '20%', background: 'var(--bg-2)', borderRadius: 3 }} />
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ height: 10, width: '30%', background: 'var(--bg-3)', borderRadius: 3 }} />
                <div style={{ height: 10, width: '25%', background: 'var(--bg-3)', borderRadius: 3 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Pin marker overlaid */}
        <div style={{
          position: 'absolute', top: '54%', left: '22%',
          animation: 'pulse-glow 1.6s ease-in-out infinite',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 4px 4px 4px',
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 999,
            boxShadow: '0 6px 16px -4px var(--accent-glow), 0 0 0 3px rgba(139,92,246,0.18)',
          }}>
            <span className="mono" style={{
              width: 18, height: 18, borderRadius: 50,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.25)', fontSize: 10.5, fontWeight: 700,
            }}>#{String(pin.i).padStart(2,'0')}</span>
          </div>
        </div>
      </div>

      <figcaption style={{
        marginTop: 8,
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 11.5, color: 'var(--text-3)',
      }}>
        <Icon.Image size={11} />
        <span>Captured at 1440 × 900 · Chrome 142 / macOS · Click to enlarge</span>
        <span style={{ flex: 1 }} />
        <button className="btn icon sm" data-tip="Download"><Icon.ExternalLink size={11} /></button>
      </figcaption>
    </figure>
  );
}

// ANCHOR BLOCK ----------------------------------------------
function AnchorBlock({ anchor, stale }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{
      marginBottom: 24,
      border: '1px solid var(--border)',
      borderRadius: 8,
      background: 'var(--bg-1)',
      overflow: 'hidden',
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer', textAlign: 'left',
        background: 'transparent',
      }}>
        <Icon.CursorPin size={13} style={{ color: stale ? 'var(--status-stale)' : 'var(--accent)' }} />
        <span style={{ fontSize: 12.5, color: 'var(--text-1)', fontWeight: 500 }}>Anchor</span>
        <span className="mono" style={{
          fontSize: 11.5, color: 'var(--text-2)',
          padding: '2px 6px', background: 'var(--bg-0)',
          border: '1px solid var(--border)', borderRadius: 3,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{anchor}</span>
        {stale ? (
          <span style={{ fontSize: 11.5, color: 'var(--status-stale)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon.Warning size={11} stroke={2} />
            Element not found
          </span>
        ) : (
          <span style={{ fontSize: 11.5, color: 'var(--status-resolved)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon.Check size={11} stroke={2.5} />
            Resolves
          </span>
        )}
        <Icon.ChevronDown size={12} style={{ color: 'var(--text-3)', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 160ms' }} />
      </button>
      {open && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '12px 14px', display: 'grid',
          gridTemplateColumns: '120px 1fr', gap: '8px 14px',
          fontSize: 12,
        }}>
          {[
            ['Tag',           'BUTTON'],
            ['CSS selector',  anchor],
            ['XPath',         '//*[@id="checkout-form"]/section[3]/div[2]/button'],
            ['Text fingerprint', '"Pay with Apple Pay"'],
            ['Bounding box',  '{x:642, y:584, w:228, h:48}'],
            ['Captured',      '2026-05-24 09:42 PDT'],
          ].map(([k, v]) => (
            <React.Fragment key={k}>
              <div style={{ color: 'var(--text-3)' }}>{k}</div>
              <div className="mono" style={{ color: 'var(--text-1)', wordBreak: 'break-all' }}>{v}</div>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ACTIVITY THREAD -------------------------------------------
function ActivityThread() {
  const items = [
    { t: '2h ago',  who: 'ren',   kind: 'pinned',  text: 'pinned this element and submitted the session.' },
    { t: '2h ago',  who: null,    kind: 'sync',    text: 'created PL-0142-1 in Linear · NW-WEB · "Urgent"' },
    { t: '1h ago',  who: 'nina',  kind: 'assign',  text: 'assigned this to themselves' },
    { t: '52m ago', who: 'nina',  kind: 'comment', text: 'Confirmed in Safari 18.3. Likely a race with the Apple Pay sheet init — the click handler attaches before the SDK boots.' },
    { t: '20m ago', who: 'idris', kind: 'comment', text: 'Bumping to Critical. Blocks our checkout LTV experiment.' },
    { t: '12m ago', who: 'nina',  kind: 'status',  text: 'changed status from Open → In progress' },
  ];
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 14, paddingBottom: 8,
        borderBottom: '1px solid var(--border)',
      }}>
        <Icon.Activity size={13} style={{ color: 'var(--text-2)' }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-0)' }}>Activity</span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{items.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 11, top: 6, bottom: 6, width: 1, background: 'var(--border)' }} />
        {items.map((a, i) => (
          <ActivityItem key={i} a={a} />
        ))}
      </div>
    </div>
  );
}

function ActivityItem({ a }) {
  const isComment = a.kind === 'comment';
  return (
    <div style={{ display: 'flex', gap: 12, position: 'relative' }}>
      <div style={{ flex: 'none', width: 24, display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
        {a.who ? (
          <Avatar person={a.who} size={22} />
        ) : (
          <div style={{
            width: 22, height: 22, borderRadius: 50,
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon.Sync size={11} stroke={1.8} style={{ color: 'var(--accent)' }} /></div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {isComment ? (
          <div style={{
            padding: '10px 12px', background: 'var(--bg-1)',
            border: '1px solid var(--border)', borderRadius: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-0)', fontWeight: 500 }}>
                {findPerson(a.who).name.split(' ')[0]}
              </span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{a.t}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.55 }}>{a.text}</div>
          </div>
        ) : (
          <div style={{ paddingTop: 4, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--text-0)', fontWeight: 500 }}>
              {a.who ? findPerson(a.who).name.split(' ')[0] : 'pinLayer'}
            </span>{' '}
            <span>{a.text}</span>
            <span className="mono" style={{ marginLeft: 8, color: 'var(--text-3)' }}>{a.t}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// REPLY BOX -------------------------------------------------
function ReplyBox() {
  const [v, setV] = React.useState('');
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 10,
      background: 'var(--bg-1)',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', gap: 10, padding: 12 }}>
        <Avatar person="ren" size={22} />
        <textarea
          value={v} onChange={e => setV(e.target.value)}
          placeholder="Reply, mention @teammates, or paste a Linear link…"
          style={{
            flex: 1, resize: 'none', minHeight: 48,
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-0)', fontSize: 13.5,
            lineHeight: 1.55, padding: 0,
          }}
        />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 12px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-0)',
      }}>
        <button className="btn icon sm" data-tip="Attach"><Icon.Image size={12} /></button>
        <button className="btn icon sm" data-tip="Mention"><Icon.Team size={12} /></button>
        <button className="btn icon sm" data-tip="Code"><Icon.Code size={12} /></button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Markdown supported · <kbd>⌘</kbd> <kbd>↵</kbd> to send</span>
        <button className={`btn ${v ? 'primary' : ''} sm`} disabled={!v} style={{ opacity: v ? 1 : 0.5 }}>
          <Icon.Send size={11} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}

window.IssueDetail = IssueDetail;
