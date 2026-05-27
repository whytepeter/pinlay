// Integrations Hub

function Integrations() {
  const { INTEGRATIONS } = window._DATA;
  const [tab, setTab] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [active, setActive] = React.useState(null);  // open config drawer for id

  const categories = ['Issue Tracker', 'Messaging', 'Design', 'Documentation', 'Developer'];
  const filtered = INTEGRATIONS.filter(i => {
    if (tab === 'connected' && !i.connected) return false;
    if (tab === 'available' && i.connected) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const connectedCount = INTEGRATIONS.filter(i => i.connected).length;

  return (
    <div className="page-wrap">
      <PageHeader
        title="Integrations"
        badge={`${connectedCount} connected`}
        subtitle="Route pins to the tools your team already lives in."
        right={
          <React.Fragment>
            <button className="btn"><Icon.Code size={12} /><span>API & webhooks</span></button>
            <button className="btn primary"><Icon.Plus size={12} stroke={2} /><span>Browse all</span></button>
          </React.Fragment>
        }
      />

      {/* Hero strip — flow visualization */}
      <div style={{ padding: '24px 32px 0' }}>
        <div className="card" style={{
          padding: '22px 26px',
          background: 'linear-gradient(180deg, var(--bg-1) 0%, var(--bg-0) 100%)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none',
            background: 'radial-gradient(circle at 80% 50%, var(--accent-glow), transparent 50%)',
          }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 28 }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 11, color: 'var(--accent)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
              }}>Routing</div>
              <h2 style={{
                margin: '0 0 6px', fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em',
                color: 'var(--text-0)',
              }}>Every pin lands where work happens.</h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', maxWidth: 460, lineHeight: 1.55 }}>
                When a teammate drops a pin, pinLayer routes it by page, label, or severity. Two-way sync keeps status mirrored across every tool.
              </p>
            </div>
            <FlowDiagram />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '20px 32px 12px',
      }}>
        <Segmented
          value={tab} onChange={setTab}
          options={[
            { value: 'all',       label: 'All',       count: INTEGRATIONS.length },
            { value: 'connected', label: 'Connected', count: connectedCount },
            { value: 'available', label: 'Available', count: INTEGRATIONS.length - connectedCount },
          ]}
        />
        <div style={{ flex: 1 }} />
        <SearchInput placeholder="Search integrations…" value={search} onChange={setSearch} />
      </div>

      {/* Sections by category */}
      <div style={{ padding: '0 32px 80px' }}>
        {categories.map(cat => {
          const items = filtered.filter(i => i.cat === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat} style={{ marginBottom: 36 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                margin: '20px 0 14px',
              }}>
                <h3 style={{
                  margin: 0, fontSize: 12, fontWeight: 600,
                  color: 'var(--text-2)', textTransform: 'uppercase',
                  letterSpacing: '0.1em', whiteSpace: 'nowrap',
                }}>{cat}</h3>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{items.length}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 12,
              }}>
                {items.map((it, i) => (
                  <IntegrationCard key={it.id} item={it} onConfigure={() => setActive(it.id)} delay={i * 20} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {active && (
        <ConfigDrawer
          integration={INTEGRATIONS.find(i => i.id === active)}
          close={() => setActive(null)}
        />
      )}
    </div>
  );
}

// Integration card --------------------------------------------
function IntegrationCard({ item, onConfigure, delay }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div className="card fade-up"
      onClick={onConfigure}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: 16, cursor: 'pointer',
        background: hover ? 'var(--bg-elev)' : 'var(--bg-1)',
        borderColor: hover ? 'var(--border-strong)' : 'var(--border)',
        transition: 'all 140ms',
        transform: hover ? 'translateY(-1px)' : 'none',
        animationDelay: `${delay}ms`,
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <BrandGlyph item={item} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 14, fontWeight: 600, color: 'var(--text-0)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              flex: '0 1 auto', minWidth: 0,
            }}>{item.name}</span>
            {item.connected && (
              <span data-tip="Connected" style={{
                width: 5, height: 5, borderRadius: 50, background: 'var(--status-resolved)',
                boxShadow: '0 0 0 2px color-mix(in oklab, var(--status-resolved) 30%, transparent)',
                flex: 'none',
              }} />
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{item.cat}</div>
        </div>
      </div>
      <div style={{
        fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5,
        textWrap: 'pretty', marginBottom: 14, minHeight: 38,
      }}>{item.desc}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingTop: 12, borderTop: '1px solid var(--border-soft)',
      }}>
        {item.connected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-2)', flex: 1, minWidth: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--status-resolved)' }} />
            <span className="mono" style={{
              color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{item.account}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-3)', flex: 1, whiteSpace: 'nowrap' }}>
            <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--text-4)', flex: 'none' }} />
            <span>Not connected</span>
          </div>
        )}
        <button className={`btn sm ${!item.connected ? 'primary' : ''}`}
          onClick={(e) => { e.stopPropagation(); onConfigure(); }}
          style={!item.connected ? {} : {}}>
          {item.connected ? 'Configure' : 'Connect'}
          {!item.connected && <Icon.ArrowRight size={11} />}
        </button>
      </div>
    </div>
  );
}

// Brand glyph (we render our own monogram, not real logos)
function BrandGlyph({ item, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, flex: 'none',
      borderRadius: 9,
      background: `linear-gradient(135deg, oklch(0.45 0.16 ${item.hue}), oklch(0.30 0.14 ${item.hue}))`,
      color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: item.glyph.length > 1 ? 14 : 17,
      fontWeight: 700,
      letterSpacing: '-0.02em',
      fontFamily: 'var(--font-mono)',
      border: '1px solid color-mix(in oklab, oklch(0.6 0.16 ' + item.hue + ') 40%, transparent)',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 12px -4px oklch(0.35 0.16 ${item.hue} / 0.4)`,
    }}>{item.glyph}</div>
  );
}

// Flow diagram on hero
function FlowDiagram() {
  const targets = [
    { glyph: 'L', hue: 252, label: 'Linear' },
    { glyph: 'J', hue: 215, label: 'Jira' },
    { glyph: 'SL', hue: 290, label: 'Slack' },
    { glyph: 'F', hue: 332, label: 'Figma' },
  ];
  return (
    <div style={{
      width: 340, height: 140,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'relative',
    }}>
      {/* pinLayer source */}
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px -8px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)',
        flex: 'none',
      }}>
        <Icon.Brand size={28} />
      </div>

      {/* lines */}
      <svg viewBox="0 0 200 140" style={{
        position: 'absolute', left: 56, top: 0, width: 224, height: 140,
        pointerEvents: 'none',
      }}>
        <defs>
          <linearGradient id="line-g" x1="0" y1="0.5" x2="1" y2="0.5">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.6" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {[14, 56, 98, 140].map((y, i) => (
          <path key={i} d={`M0 70 C 80 70, 120 ${y}, 200 ${y}`} stroke="url(#line-g)" strokeWidth="1" fill="none" />
        ))}
      </svg>

      {/* targets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, zIndex: 1 }}>
        {targets.map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 10px 4px 4px',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 999,
          }}>
            <BrandGlyph item={t} size={22} />
            <span style={{ fontSize: 11, color: 'var(--text-1)' }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// CONFIG DRAWER ----------------------------------------------
function ConfigDrawer({ integration, close }) {
  if (!integration) return null;
  const [enabled, setEnabled] = React.useState(integration.connected);
  return (
    <div onClick={close} style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      animation: 'fade-up 160ms ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 480,
        background: 'var(--bg-0)', borderLeft: '1px solid var(--border-strong)',
        boxShadow: '-40px 0 80px -20px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Drawer header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <BrandGlyph item={integration} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-0)', letterSpacing: '-0.01em' }}>{integration.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{integration.cat}</div>
          </div>
          <button className="btn icon sm" onClick={close}><Icon.X size={12} /></button>
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 80px' }}>
          {/* Account status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', marginBottom: 18,
            background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 8,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: 50,
              background: enabled ? 'var(--status-resolved)' : 'var(--text-4)',
              boxShadow: enabled ? '0 0 0 3px color-mix(in oklab, var(--status-resolved) 25%, transparent)' : 'none',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-0)', fontWeight: 500 }}>
                {enabled ? 'Connected' : 'Not connected'}
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                {integration.account || 'Authorize to start syncing'}
              </div>
            </div>
            <button className="btn sm" onClick={() => setEnabled(!enabled)}>
              {enabled ? 'Reauthorize' : 'Connect'}
            </button>
          </div>

          {/* Mappings */}
          <Section title="Field mappings" sub="Translate pinLayer fields into the target tool.">
            <FieldRow label="When a pin lands">
              <Pill>Create issue in</Pill>
              <Pill accent>NW-WEB / Engineering</Pill>
            </FieldRow>
            <FieldRow label="Severity → Priority">
              <SevMapRow />
            </FieldRow>
            <FieldRow label="Issue type → Label">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['visual','layout','copy','broken','a11y','perf'].map(t => (
                  <span key={t} className="chip mono" style={{ background: 'var(--bg-2)', color: 'var(--text-1)' }}>{t}</span>
                ))}
              </div>
            </FieldRow>
            <FieldRow label="Sync direction">
              <Segmented value="bi" onChange={()=>{}} options={[
                { value: 'out', label: 'pinLayer →' },
                { value: 'bi',  label: 'Both ways' },
              ]} />
            </FieldRow>
          </Section>

          {/* Activity */}
          <Section title="Sync activity" sub="Last 7 days of routing events.">
            <div style={{
              border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
              background: 'var(--bg-1)',
            }}>
              {[
                ['2026-05-24 09:42','PL-0142-1','created in Linear','ok'],
                ['2026-05-24 06:11','PL-0141-3','status mirror Open → In Progress','ok'],
                ['2026-05-23 23:04','PL-0140-2','comment relayed from Linear','ok'],
                ['2026-05-23 18:30','PL-0139-1','created in Linear','ok'],
                ['2026-05-22 11:15','PL-0136-2','failed: rate limited','failed'],
              ].map(([t, id, msg, st], i, arr) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '150px 90px 1fr 70px',
                  alignItems: 'center', gap: 10,
                  padding: '8px 12px',
                  borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border-soft)',
                  fontSize: 12,
                }}>
                  <span className="mono" style={{ color: 'var(--text-3)' }}>{t}</span>
                  <span className="mono" style={{ color: 'var(--text-1)' }}>{id}</span>
                  <span style={{ color: 'var(--text-2)' }}>{msg}</span>
                  <span className="mono" style={{
                    color: st === 'ok' ? 'var(--status-resolved)' : 'var(--sev-critical)',
                    textAlign: 'right',
                  }}>{st}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Danger" sub="">
            <button style={{
              fontSize: 12.5, color: 'var(--sev-critical)',
              padding: '8px 12px', borderRadius: 6,
              background: 'color-mix(in oklab, var(--sev-critical) 8%, transparent)',
              border: '1px solid color-mix(in oklab, var(--sev-critical) 30%, transparent)',
              fontWeight: 500,
            }}>Disconnect {integration.name}</button>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, sub, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</h4>
        {sub && <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{sub}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px',
      background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 7,
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 140, flex: 'none' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}

function Pill({ children, accent }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      height: 24, padding: '0 8px', borderRadius: 5,
      fontSize: 11.5,
      background: accent ? 'var(--accent-soft)' : 'var(--bg-2)',
      color: accent ? 'var(--accent)' : 'var(--text-1)',
      border: `1px solid ${accent ? 'color-mix(in oklab, var(--accent) 30%, transparent)' : 'var(--border)'}`,
      fontWeight: 500,
    }}>{children}</span>
  );
}

function SevMapRow() {
  const pairs = [
    ['critical', 'Urgent'],
    ['high', 'High'],
    ['medium', 'Medium'],
    ['low', 'Low'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      {pairs.map(([sev, prio]) => (
        <div key={sev} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12,
        }}>
          <SeverityDot level={sev} size={6} ring={false} />
          <span style={{ color: 'var(--text-1)', textTransform: 'capitalize', minWidth: 70 }}>{sev}</span>
          <Icon.ArrowRight size={11} style={{ color: 'var(--text-3)' }} />
          <span className="mono" style={{ color: 'var(--text-0)' }}>{prio}</span>
        </div>
      ))}
    </div>
  );
}

window.Integrations = Integrations;
