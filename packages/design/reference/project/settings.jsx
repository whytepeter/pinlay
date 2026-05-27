// Settings page

function Settings() {
  const [section, setSection] = React.useState('workspace');
  const sections = [
    { id: 'workspace',     label: 'Workspace',     icon: Icon.Board },
    { id: 'extension',     label: 'Extension',     icon: Icon.CursorPin },
    { id: 'team',          label: 'Team',          icon: Icon.Team },
    { id: 'notifications', label: 'Notifications', icon: Icon.Bell },
    { id: 'security',      label: 'Security',      icon: Icon.Settings },
    { id: 'billing',       label: 'Billing',       icon: Icon.Star },
    { id: 'danger',        label: 'Danger zone',   icon: Icon.Warning, danger: true },
  ];
  const content = ({
    workspace: <WorkspaceSection />,
    extension: <ExtensionSection />,
    team: <TeamSection />,
    notifications: <NotificationsSection />,
    security: <SecuritySection />,
    billing: <BillingSection />,
    danger: <DangerSection />,
  })[section];

  return (
    <div className="page-wrap">
      <PageHeader title="Settings" subtitle="Workspace, team, and billing controls." />

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 90px)' }}>
        {/* Settings sidebar */}
        <nav style={{
          width: 220, flex: 'none',
          padding: '22px 14px',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 1,
        }}>
          {sections.map(s => {
            const active = section === s.id;
            const Ic = s.icon;
            return (
              <button key={s.id} onClick={() => setSection(s.id)} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 6,
                background: active ? 'var(--bg-2)' : 'transparent',
                color: active ? (s.danger ? 'var(--sev-critical)' : 'var(--text-0)') : (s.danger ? 'color-mix(in oklab, var(--sev-critical) 75%, var(--text-2))' : 'var(--text-1)'),
                fontSize: 13, fontWeight: 500,
                textAlign: 'left', cursor: 'pointer',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-1)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <Ic size={14} stroke={active ? 1.8 : 1.5} style={{
                  color: active ? (s.danger ? 'var(--sev-critical)' : 'var(--accent)') : 'inherit',
                }} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Section content */}
        <div style={{ flex: 1, minWidth: 0, padding: '28px 36px 80px', maxWidth: 820 }}>
          {content}
        </div>
      </div>
    </div>
  );
}

// ---------- Form primitives ----------
function FormGroup({ children }) {
  return (
    <div style={{
      padding: '16px 18px', background: 'var(--bg-1)',
      border: '1px solid var(--border)', borderRadius: 10,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>{children}</div>
  );
}

function Field({ label, sub, children, inline }) {
  return (
    <div style={{
      display: inline ? 'grid' : 'flex',
      flexDirection: 'column', gap: 6,
      gridTemplateColumns: inline ? '220px 1fr' : undefined,
      alignItems: inline ? 'center' : 'flex-start',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <label style={{ fontSize: 12.5, color: 'var(--text-0)', fontWeight: 500 }}>{label}</label>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{sub}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function H2({ children, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--text-0)', letterSpacing: '-0.02em' }}>{children}</h2>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-2)' }}>{sub}</p>}
    </div>
  );
}

function Divider() { return <div style={{ height: 1, background: 'var(--border)', margin: '24px 0' }} />; }

function Toggle({ on = false, onChange }) {
  const [v, setV] = React.useState(on);
  return (
    <button onClick={() => { setV(!v); onChange?.(!v); }} style={{
      width: 32, height: 18, borderRadius: 999,
      background: v ? 'var(--accent)' : 'var(--bg-3)',
      border: `1px solid ${v ? 'var(--accent)' : 'var(--border-strong)'}`,
      position: 'relative', cursor: 'pointer',
      transition: 'background 140ms, border-color 140ms',
      padding: 0,
    }}>
      <span style={{
        position: 'absolute', top: 1, left: v ? 15 : 1,
        width: 14, height: 14, borderRadius: 50,
        background: '#fff',
        transition: 'left 160ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

// ---------- Workspace ----------
function WorkspaceSection() {
  return (
    <React.Fragment>
      <H2 sub="Your team's identity in pinLayer.">Workspace</H2>
      <FormGroup>
        <Field label="Workspace name">
          <input className="input" defaultValue="Northwind" style={{ maxWidth: 340 }} />
        </Field>
        <Field label="Workspace URL" sub="Used for shareable links.">
          <div style={{ display: 'flex', alignItems: 'center', maxWidth: 420 }}>
            <span className="mono" style={{
              padding: '0 10px', height: 30, display: 'inline-flex', alignItems: 'center',
              background: 'var(--bg-0)', border: '1px solid var(--border)', borderRight: 'none',
              color: 'var(--text-3)', borderRadius: '6px 0 0 6px', fontSize: 12.5,
            }}>pinlayer.io/</span>
            <input className="input mono" defaultValue="northwind"
              style={{ borderRadius: '0 6px 6px 0', fontSize: 12.5 }} />
          </div>
        </Field>
        <Field label="Logo" sub="Square SVG or PNG. 256×256 recommended.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 8,
              background: 'linear-gradient(135deg, oklch(0.55 0.16 268), oklch(0.40 0.14 290))',
              color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 18,
            }}>NW</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn">Upload</button>
              <button className="btn ghost">Remove</button>
            </div>
          </div>
        </Field>
      </FormGroup>

      <Divider />

      <H2 sub="Where pinLayer's defaults live.">Defaults</H2>
      <FormGroup>
        <Field label="Default pinboard" inline>
          <button className="btn" style={{ width: 240, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'oklch(0.55 0.16 14)' }} />
              Checkout funnel
            </span>
            <Icon.ChevronDown size={11} />
          </button>
        </Field>
        <Field label="Auto-screenshot" inline sub="Capture a screenshot when a pin is created.">
          <Toggle on />
        </Field>
        <Field label="Auto-assign by URL pattern" inline sub="Route pins to the right person automatically.">
          <Toggle on />
        </Field>
        <Field label="Anchor decay window" inline sub="Mark pins as stale if the element is missing for this long.">
          <button className="btn" style={{ width: 160, justifyContent: 'space-between' }}>
            <span>7 days</span><Icon.ChevronDown size={11} />
          </button>
        </Field>
      </FormGroup>
    </React.Fragment>
  );
}

// ---------- Extension ----------
function ExtensionSection() {
  const [revealed, setRevealed] = React.useState(false);
  const token = revealed ? 'pl_live_8h2k0c9wx_72fdaecb1aa547e91d3f' : '••••••••••••••••••••••••••••••••';

  return (
    <React.Fragment>
      <H2 sub="The capture surface that lives in your team's browsers.">Browser extension</H2>

      <FormGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { name: 'Chrome',  ver: '142+', users: 18 },
            { name: 'Firefox', ver: '128+', users: 4 },
            { name: 'Edge',    ver: '129+', users: 2 },
          ].map(b => (
            <div key={b.name} style={{
              padding: 14, borderRadius: 8,
              background: 'var(--bg-0)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)', marginBottom: 2 }}>{b.name}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>v{b.ver}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{b.users} installed</span>
                <button className="btn sm">Install</button>
              </div>
            </div>
          ))}
        </div>
      </FormGroup>

      <Divider />

      <H2 sub="Authorize browsers to submit pins to this workspace.">Connection token</H2>
      <FormGroup>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px',
          background: 'var(--bg-0)',
          border: '1px solid var(--border)', borderRadius: 7,
        }}>
          <Icon.Bolt size={13} style={{ color: 'var(--accent)' }} />
          <span className="mono" style={{ flex: 1, fontSize: 12.5, color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{token}</span>
          <button className="btn sm" onClick={() => setRevealed(!revealed)}>
            <Icon.Eye size={11} />
            <span>{revealed ? 'Hide' : 'Reveal'}</span>
          </button>
          <button className="btn sm"><Icon.Copy size={11} /><span>Copy</span></button>
          <button className="btn sm">Rotate</button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon.Warning size={11} stroke={1.8} />
          Rotating the token will disconnect every active browser tab. Allow ~30s for re-auth.
        </div>
      </FormGroup>

      <Divider />

      <H2 sub="Browsers currently submitting to this workspace.">Active sessions</H2>
      <FormGroup>
        {[
          { dev: 'Ren · MacBook Pro 16"',  ua: 'Chrome 142 · macOS 14.5',     last: '2m ago',  here: true },
          { dev: 'Mara · ThinkPad X1',      ua: 'Firefox 128 · Ubuntu 24.04',  last: '14m ago' },
          { dev: 'Nina · Mac mini',         ua: 'Chrome 142 · macOS 14.5',     last: '1h ago' },
          { dev: 'Sam · Windows desktop',   ua: 'Edge 129 · Windows 11',       last: '3h ago' },
        ].map((s, i, arr) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 0',
            borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border-soft)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-2)',
            }}><Icon.Globe size={13} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--text-0)', fontWeight: 500 }}>
                {s.dev}
                {s.here && (
                  <span style={{ marginLeft: 8, fontSize: 10.5, color: 'var(--status-resolved)' }}>· This device</span>
                )}
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{s.ua}</div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>{s.last}</span>
            <button className="btn sm ghost" style={{ color: 'var(--sev-critical)' }}>Revoke</button>
          </div>
        ))}
      </FormGroup>
    </React.Fragment>
  );
}

// ---------- Team ----------
function TeamSection() {
  const members = [
    { p: 'ren',  role: 'Admin',  last: '2m ago',  pins: 142 },
    { p: 'mara', role: 'Member', last: '14m ago', pins: 98 },
    { p: 'idris',role: 'Admin',  last: '1h ago',  pins: 76 },
    { p: 'nina', role: 'Member', last: '20m ago', pins: 64 },
    { p: 'sam',  role: 'Member', last: '3h ago',  pins: 41 },
    { p: 'tova', role: 'Viewer', last: '2d ago',  pins: 8  },
  ];
  return (
    <React.Fragment>
      <H2 sub="Manage who can drop, view, and triage pins.">Team</H2>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px', marginBottom: 12,
        background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 8,
      }}>
        <Icon.Plus size={12} stroke={2} style={{ color: 'var(--accent)' }} />
        <input className="input" placeholder="Invite by email — comma-separated for multiple"
          style={{ border: 'none', background: 'transparent', flex: 1, padding: 0 }} />
        <button className="btn sm" style={{ width: 160, justifyContent: 'space-between' }}>
          <span>Member</span><Icon.ChevronDown size={11} />
        </button>
        <button className="btn primary sm">Send invite</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 100px 90px 100px 36px',
          gap: 14, padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-1)',
          fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          <div>Member</div><div>Role</div><div>Pins</div><div>Last active</div><div />
        </div>
        {members.map((m, i, arr) => {
          const p = findPerson(m.p);
          return (
            <div key={m.p} style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 90px 100px 36px',
              gap: 14, padding: '12px 16px',
              borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border-soft)',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar person={p} size={26} />
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-0)', fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.handle}@northwind.io</div>
                </div>
              </div>
              <button className="btn sm" style={{ width: 84, justifyContent: 'space-between' }}>
                <span>{m.role}</span><Icon.ChevronDown size={10} />
              </button>
              <span className="mono" style={{ fontSize: 12, color: 'var(--text-1)' }}>{m.pins}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>{m.last}</span>
              <button className="btn icon sm ghost"><Icon.More size={13} /></button>
            </div>
          );
        })}
      </div>
    </React.Fragment>
  );
}

// ---------- Notifications ----------
function NotificationsSection() {
  const events = [
    { e: 'A new session is created',           email: true,  slack: true },
    { e: 'A pin is assigned to you',           email: true,  slack: true },
    { e: 'You are mentioned in a comment',     email: true,  slack: true },
    { e: 'Status of a pin you own changes',    email: false, slack: true },
    { e: 'A critical pin lands in your team',  email: true,  slack: true },
    { e: 'An integration sync fails',          email: false, slack: true },
    { e: 'Weekly triage digest',               email: true,  slack: false },
  ];
  return (
    <React.Fragment>
      <H2 sub="Choose what reaches your inbox and your Slack.">Notifications</H2>
      <FormGroup>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 80px 80px',
          gap: 12, padding: '6px 4px',
          fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          <div>Event</div>
          <div style={{ textAlign: 'center' }}>Email</div>
          <div style={{ textAlign: 'center' }}>Slack</div>
        </div>
        {events.map((row, i, arr) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 80px',
            gap: 12, padding: '10px 4px',
            borderTop: '1px solid var(--border-soft)',
            alignItems: 'center', fontSize: 13, color: 'var(--text-1)',
          }}>
            <div>{row.e}</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><Toggle on={row.email} /></div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><Toggle on={row.slack} /></div>
          </div>
        ))}
      </FormGroup>
    </React.Fragment>
  );
}

// ---------- Security ----------
function SecuritySection() {
  return (
    <React.Fragment>
      <H2 sub="Authentication, audit and SSO.">Security</H2>
      <FormGroup>
        <Field label="Enforce SSO" inline sub="Require SAML 2.0 sign-in for all members.">
          <Toggle on />
        </Field>
        <Field label="Require 2FA" inline sub="All members must enroll a TOTP authenticator.">
          <Toggle on />
        </Field>
        <Field label="Session length" inline sub="How long a sign-in lasts before re-auth.">
          <button className="btn" style={{ width: 160, justifyContent: 'space-between' }}>
            <span>30 days</span><Icon.ChevronDown size={11} />
          </button>
        </Field>
        <Field label="Allowed email domains" inline>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span className="chip mono">northwind.io</span>
            <span className="chip mono">northwind-labs.com</span>
            <button className="btn sm ghost"><Icon.Plus size={11} />Add domain</button>
          </div>
        </Field>
      </FormGroup>
      <Divider />
      <H2 sub="Every state change is logged immutably.">Audit log</H2>
      <FormGroup>
        <div style={{ fontSize: 12.5, color: 'var(--text-1)', lineHeight: 1.6 }}>
          312 events in the last 30 days · last entry 8m ago
        </div>
        <button className="btn" style={{ alignSelf: 'flex-start' }}>
          <Icon.ExternalLink size={11} />
          <span>Open audit log</span>
        </button>
      </FormGroup>
    </React.Fragment>
  );
}

// ---------- Billing ----------
function BillingSection() {
  return (
    <React.Fragment>
      <H2 sub="Pricing scales with active sessions per month.">Billing</H2>
      <div className="card" style={{ padding: 18, marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, right: 0, padding: '4px 10px',
          background: 'var(--accent-soft)', color: 'var(--accent)',
          fontSize: 11, fontWeight: 600,
          borderBottomLeftRadius: 8,
        }}>Current plan</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-0)', letterSpacing: '-0.02em' }}>Team</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, marginBottom: 16 }}>
          $24 per active member / month · billed annually
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            ['Active members',    '24 / 50'],
            ['Sessions this cycle','142'],
            ['Renews',             'Aug 12, 2026'],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{k}</div>
              <div className="mono" style={{ fontSize: 16, color: 'var(--text-0)', fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn">Manage seats</button>
        <button className="btn">Update payment method</button>
        <button className="btn ghost">View invoices</button>
      </div>
    </React.Fragment>
  );
}

// ---------- Danger ----------
function DangerSection() {
  const [val, setVal] = React.useState('');
  return (
    <React.Fragment>
      <H2 sub="Irreversible actions. Read carefully.">Danger zone</H2>
      <div style={{
        padding: 18, borderRadius: 10,
        background: 'color-mix(in oklab, var(--sev-critical) 5%, var(--bg-1))',
        border: '1px solid color-mix(in oklab, var(--sev-critical) 30%, var(--border))',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Icon.Warning size={18} stroke={1.8} style={{ color: 'var(--sev-critical)', flex: 'none', marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-0)' }}>Delete workspace</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.55, marginBottom: 14 }}>
              This permanently deletes Northwind, all sessions, pins, integrations, and audit logs.
              <br />Type <span className="mono" style={{ color: 'var(--text-0)' }}>delete northwind</span> to confirm.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input mono" placeholder="delete northwind" value={val} onChange={e => setVal(e.target.value)} style={{ maxWidth: 260 }} />
              <button disabled={val !== 'delete northwind'} className="btn" style={{
                background: val === 'delete northwind' ? 'var(--sev-critical)' : 'var(--bg-2)',
                color: val === 'delete northwind' ? '#fff' : 'var(--text-3)',
                border: 0,
                opacity: val === 'delete northwind' ? 1 : 0.6,
                cursor: val === 'delete northwind' ? 'pointer' : 'not-allowed',
              }}>I understand, delete workspace</button>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

window.Settings = Settings;
