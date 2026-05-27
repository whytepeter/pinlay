// Sidebar nav — full / collapsed / mobile-drawer

function Sidebar({ route, setRoute, sidebarMode }) {
  const navItems = [
    { id: 'dashboard',    label: 'Dashboard',    icon: Icon.Home,    count: 142 },
    { id: 'pinboards',    label: 'Pinboards',    icon: Icon.Board,   count: 8 },
    { id: 'integrations', label: 'Integrations', icon: Icon.Plug,    count: null, pulse: true },
    { id: 'settings',     label: 'Settings',     icon: Icon.Settings,count: null },
  ];

  const collapsed = sidebarMode === 'collapsed';
  // mobile-closed → off-canvas; mobile-open → drawer over content
  const mobile = sidebarMode === 'mobile-open' || sidebarMode === 'mobile-closed';
  const hidden = sidebarMode === 'mobile-closed';

  // In collapsed mode: just brand + nav + user. In full mode: everything.
  return (
    <aside
      className="app-sidebar"
      data-collapsed={collapsed ? 'true' : 'false'}
      data-mobile={mobile ? 'true' : 'false'}
      style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: collapsed ? 64 : 224,
        background: 'var(--bg-0)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: collapsed ? '14px 8px' : '14px 12px',
        zIndex: 30,
        transform: hidden ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 220ms cubic-bezier(.4,.2,.2,1), width 200ms ease, padding 200ms ease',
        boxShadow: sidebarMode === 'mobile-open' ? '0 0 60px rgba(0,0,0,0.5)' : 'none',
      }}>

      {/* Brand */}
      <div style={{
        padding: '4px 6px 16px',
        display: 'flex', alignItems: 'center',
        gap: 8,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <Icon.Brand size={22} />
        {!collapsed && (
          <React.Fragment>
            <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text-0)' }}>pinLayer</span>
            <span className="mono" style={{
              marginLeft: 'auto',
              fontSize: 9.5, color: 'var(--text-3)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>v2.1</span>
          </React.Fragment>
        )}
      </div>

      {/* Workspace switcher — full only */}
      {!collapsed && (
        <button style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px',
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          borderRadius: 7,
          marginBottom: 14,
          cursor: 'pointer',
          transition: 'background 120ms, border-color 120ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-1)'}>
          <span style={{
            width: 22, height: 22, borderRadius: 5,
            background: 'linear-gradient(135deg, oklch(0.55 0.16 268), oklch(0.40 0.14 290))',
            color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
          }}>NW</span>
          <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-0)', fontWeight: 500, lineHeight: 1.1 }}>Northwind</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>Team · 24 members</div>
          </div>
          <Icon.ChevronDown size={12} style={{ color: 'var(--text-3)' }} />
        </button>
      )}

      {/* Collapsed: workspace mark only */}
      {collapsed && (
        <div data-tip="Northwind workspace" style={{
          marginBottom: 14,
          alignSelf: 'center',
          width: 32, height: 32, borderRadius: 7,
          background: 'linear-gradient(135deg, oklch(0.55 0.16 268), oklch(0.40 0.14 290))',
          color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>NW</div>
      )}

      {/* Search — full only */}
      {!collapsed && (
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Icon.Search size={12} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-3)', pointerEvents: 'none',
          }} />
          <input className="input"
            placeholder="Search pins, sessions…"
            style={{ paddingLeft: 28, paddingRight: 32, height: 28, fontSize: 12 }}
          />
          <kbd style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          }}>⌘K</kbd>
        </div>
      )}
      {collapsed && (
        <button data-tip="Search · ⌘K" style={{
          alignSelf: 'center', marginBottom: 14,
          width: 32, height: 32, borderRadius: 7,
          background: 'var(--bg-1)', border: '1px solid var(--border)',
          color: 'var(--text-2)', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon.Search size={13} /></button>
      )}

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {navItems.map(item => {
          const active = route === item.id;
          const Ic = item.icon;
          return (
            <button key={item.id}
              onClick={() => setRoute(item.id)}
              data-tip={collapsed ? item.label : null}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: collapsed ? '8px 0' : '7px 10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 6,
                background: active ? 'var(--bg-2)' : 'transparent',
                color: active ? 'var(--text-0)' : 'var(--text-1)',
                fontSize: 13, fontWeight: 500,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 120ms, color 120ms',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-1)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              {active && (
                <span style={{
                  position: 'absolute', left: collapsed ? -8 : -12, top: 8, bottom: 8, width: 2,
                  background: 'var(--accent)', borderRadius: '0 2px 2px 0',
                }} />
              )}
              <Ic size={collapsed ? 17 : 15} stroke={active ? 1.8 : 1.5} style={{
                color: active ? 'var(--accent)' : 'var(--text-2)',
                flex: 'none',
              }} />
              {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              {!collapsed && item.count != null && (
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{item.count}</span>
              )}
              {!collapsed && item.pulse && (
                <span style={{
                  width: 6, height: 6, borderRadius: 50,
                  background: 'var(--accent)',
                  boxShadow: '0 0 0 3px var(--accent-soft)',
                }} />
              )}
              {collapsed && item.pulse && (
                <span style={{
                  position: 'absolute', top: 7, right: 9,
                  width: 5, height: 5, borderRadius: 50,
                  background: 'var(--accent)',
                  boxShadow: '0 0 0 2px var(--bg-0)',
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Pinboards quick-access — full only */}
      {!collapsed && (
        <div style={{ marginTop: 22 }}>
          <div style={{
            padding: '4px 10px 8px',
            fontSize: 10, fontWeight: 600,
            color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>Pinboards</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[
              { label: 'Checkout funnel', count: 38, hue: 14 },
              { label: 'Marketing site',  count: 22, hue: 268 },
              { label: 'Mobile web',      count: 17, hue: 198 },
              { label: 'Internal tools',  count: 9,  hue: 158 },
            ].map((b, i) => (
              <button key={i} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '6px 10px', borderRadius: 6,
                background: 'transparent', color: 'var(--text-1)',
                fontSize: 12.5, textAlign: 'left', cursor: 'pointer',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: `oklch(0.55 0.16 ${b.hue})`,
                  flex: 'none',
                }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{b.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Extension CTA */}
      {!collapsed ? (
        <div style={{
          padding: 12,
          background: 'linear-gradient(180deg, var(--bg-1), var(--bg-0))',
          border: '1px solid var(--border)',
          borderRadius: 8,
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Icon.CursorPin size={13} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-0)' }}>Extension</span>
            <span style={{
              marginLeft: 'auto',
              fontSize: 10, color: 'var(--status-resolved)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 50, background: 'var(--status-resolved)' }} />
              Connected
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, lineHeight: 1.4 }}>
            1 active tab · Chrome 142
          </div>
          <button className="btn sm" onClick={() => setRoute('demo')} style={{
            width: '100%',
            background: 'var(--bg-2)',
            fontSize: 11.5,
          }}>
            Open extension
            <Icon.ArrowRight size={11} style={{ color: 'var(--text-3)' }} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setRoute('demo')}
          data-tip="Open extension"
          style={{
            alignSelf: 'center', marginBottom: 10,
            width: 36, height: 36, borderRadius: 9,
            background: 'var(--accent-soft)', color: 'var(--accent)',
            border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon.CursorPin size={15} /></button>
      )}

      {/* User row */}
      <button
        data-tip={collapsed ? 'Ren Kawamura' : null}
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: collapsed ? '4px 0' : '7px 8px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'background 120ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <Avatar person="ren" size={collapsed ? 28 : 24} />
        {!collapsed && (
          <React.Fragment>
            <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text-0)', fontWeight: 500, lineHeight: 1.1 }}>Ren Kawamura</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 1 }}>ren@northwind.io</div>
            </div>
            <Icon.More size={13} style={{ color: 'var(--text-3)' }} />
          </React.Fragment>
        )}
      </button>
    </aside>
  );
}

// Mobile backdrop when sidebar drawer is open
function SidebarBackdrop({ visible, onClick }) {
  if (!visible) return null;
  return (
    <div onClick={onClick} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(2px)',
      zIndex: 25,
      animation: 'fade-up 200ms ease-out',
    }} />
  );
}

window.Sidebar = Sidebar;
window.SidebarBackdrop = SidebarBackdrop;
