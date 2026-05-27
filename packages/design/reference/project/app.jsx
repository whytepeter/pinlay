// pinLayer — root app

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "violet",
  "theme": "dark",
  "density": "comfortable",
  "view": "grid",
  "openExtensionPanel": false
}/*EDITMODE-END*/;

// Accent palettes
const ACCENTS = {
  violet:  { base: '#8B5CF6', hover: '#7C3AED', soft: 'rgba(139, 92, 246, 0.12)', glow: 'rgba(139, 92, 246, 0.22)' },
  amber:   { base: '#F59E0B', hover: '#D97706', soft: 'rgba(245, 158, 11, 0.12)', glow: 'rgba(245, 158, 11, 0.22)' },
  emerald: { base: '#10B981', hover: '#059669', soft: 'rgba(16, 185, 129, 0.12)', glow: 'rgba(16, 185, 129, 0.22)' },
  pink:    { base: '#EC4899', hover: '#DB2777', soft: 'rgba(236, 72, 153, 0.12)', glow: 'rgba(236, 72, 153, 0.22)' },
};

function App() {
  const [route, setRoute] = React.useState('dashboard');
  const [activeIssue, setActiveIssue] = React.useState(null);
  const [showEmpty, setShowEmpty] = React.useState(false);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [sidebarMode, setSidebarMode] = React.useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile-closed' : 'full'
  );

  // Respond to viewport size
  React.useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setSidebarMode(prev => {
        if (mobile && (prev === 'full' || prev === 'collapsed')) return 'mobile-closed';
        if (!mobile && (prev === 'mobile-closed' || prev === 'mobile-open')) return 'full';
        return prev;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Push --sidebar-w so .main margin-left tracks
  React.useEffect(() => {
    const w = sidebarMode === 'collapsed' ? '64px' :
              sidebarMode === 'mobile-closed' || sidebarMode === 'mobile-open' ? '0px' :
              '224px';
    document.documentElement.style.setProperty('--sidebar-w', w);
    document.body.setAttribute('data-sidebar', sidebarMode);
  }, [sidebarMode]);

  const toggleSidebar = () => {
    setSidebarMode(prev => {
      if (prev === 'full') return 'collapsed';
      if (prev === 'collapsed') return 'full';
      if (prev === 'mobile-closed') return 'mobile-open';
      if (prev === 'mobile-open') return 'mobile-closed';
      return prev;
    });
  };
  const closeMobileDrawer = () => {
    if (sidebarMode === 'mobile-open') setSidebarMode('mobile-closed');
  };
  const handleNav = (id) => {
    setRoute(id);
    setActiveIssue(null);
    closeMobileDrawer();
  };

  // Apply accent CSS vars to :root
  React.useEffect(() => {
    const a = ACCENTS[t.accent] || ACCENTS.violet;
    const root = document.documentElement;
    root.style.setProperty('--accent', a.base);
    root.style.setProperty('--accent-hover', a.hover);
    root.style.setProperty('--accent-soft', a.soft);
    root.style.setProperty('--accent-glow', a.glow);
    // Status progress tracks accent
    root.style.setProperty('--status-progress', a.base);
  }, [t.accent]);

  // Apply theme
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', t.theme || 'dark');
  }, [t.theme]);

  // Density
  React.useEffect(() => {
    document.documentElement.style.setProperty('--density-pad',
      t.density === 'compact' ? '12px' : t.density === 'roomy' ? '28px' : '20px');
  }, [t.density]);

  const openIssue = (id) => {
    setActiveIssue(id);
    setRoute('issue');
  };
  const back = () => {
    setActiveIssue(null);
    setRoute('dashboard');
  };

  // Keyboard
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'g') {
        const next = (ev) => {
          if (ev.key === 'd') setRoute('dashboard');
          if (ev.key === 'i') setRoute('integrations');
          if (ev.key === 's') setRoute('settings');
          window.removeEventListener('keydown', next);
        };
        window.addEventListener('keydown', next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  let page = null;
  if (route === 'demo') {
    page = <Demo back={() => setRoute('dashboard')} />;
  } else if (route === 'issue' && activeIssue) {
    page = <IssueDetail sessionId={activeIssue} back={back} toggleSidebar={toggleSidebar} sidebarMode={sidebarMode} />;
  } else if (route === 'dashboard') {
    page = <Dashboard goToPinboards={() => setRoute('pinboards')} />;
  } else if (route === 'pinboards') {
    page = <Pinboards
      openIssue={openIssue}
      view={t.view}
      setView={(v) => setTweak('view', v)}
      showEmpty={showEmpty} setShowEmpty={setShowEmpty}
    />;
  } else if (route === 'integrations') {
    page = <Integrations />;
  } else if (route === 'settings') {
    page = <Settings />;
  } else if (route === 'team') {
    page = <ComingSoon title="Team" desc="See activity by teammate, leaderboards, and review queues." icon={Icon.Team} />;
  }

  // Top status bar — appears in dashboard & integrations
  const showStatusBar = route !== 'issue' && route !== 'demo';

  return (
    <React.Fragment>
      <Sidebar
        route={route === 'issue' ? 'pinboards' : route}
        setRoute={handleNav}
        sidebarMode={sidebarMode}
      />
      <SidebarBackdrop visible={sidebarMode === 'mobile-open'} onClick={closeMobileDrawer} />
      <main className="main">
        {showStatusBar && <StatusBar theme={t.theme} setTheme={(v) => setTweak('theme', v)} toggleSidebar={toggleSidebar} sidebarMode={sidebarMode} />}
        {page}
      </main>

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakRadio label="Mode" value={t.theme}
          options={[
            { value: 'dark',  label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
          onChange={v => setTweak('theme', v)}
        />

        <TweakSection label="Accent" />
        <AccentRadio value={t.accent} onChange={v => setTweak('accent', v)} />

        <TweakSection label="Layout" />
        <TweakRadio label="View" value={t.view}
          options={[
            { value: 'grid', label: 'Cards' },
            { value: 'list', label: 'List' },
          ]}
          onChange={v => setTweak('view', v)}
        />
        <TweakRadio label="Density" value={t.density}
          options={[
            { value: 'compact',     label: 'Compact' },
            { value: 'comfortable', label: 'Comfy' },
            { value: 'roomy',       label: 'Roomy' },
          ]}
          onChange={v => setTweak('density', v)}
        />

        <TweakSection label="States" />
        <TweakToggle label="Empty dashboard" value={showEmpty} onChange={setShowEmpty} />
      </TweaksPanel>
    </React.Fragment>
  );
}

// Top thin status bar
function StatusBar({ theme, setTheme, toggleSidebar, sidebarMode }) {
  const isMobile = sidebarMode === 'mobile-closed' || sidebarMode === 'mobile-open';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 12px 0 14px',
      height: 40, flex: 'none',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-0)',
      fontSize: 11.5, color: 'var(--text-3)',
      whiteSpace: 'nowrap',
      position: 'sticky', top: 0, zIndex: 15,
    }}>
      <button
        onClick={toggleSidebar}
        data-tip={sidebarMode === 'collapsed' ? 'Expand sidebar' : sidebarMode === 'mobile-open' ? 'Close menu' : 'Collapse sidebar'}
        style={{
          width: 30, height: 30, borderRadius: 6,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-1)', cursor: 'pointer',
          flex: 'none',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <Hamburger />
      </button>
      <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--status-resolved)' }} />
          <span>All systems normal</span>
        </div>
        <span className="mono">·</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon.Sync size={11} />
          <span>Last sync <span className="mono" style={{ color: 'var(--text-1)' }}>12s ago</span></span>
        </div>
        <span className="mono hide-narrow">·</span>
        <div className="hide-narrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon.CursorPin size={11} />
          <span><span className="mono" style={{ color: 'var(--text-1)' }}>3</span> teammates pinning</span>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div className="hide-narrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Press</span><kbd>G</kbd><span>then</span><kbd>D</kbd><span>/</span><kbd>I</kbd><span>/</span><kbd>S</kbd>
      </div>
      <ThemeToggle theme={theme} setTheme={setTheme} />
      <button className="btn icon sm ghost" data-tip="Notifications"><Icon.Bell size={12} /></button>
    </div>
  );
}

function Hamburger() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

// Reusable inline hamburger button — for headers that bypass the StatusBar
function MenuButton({ toggleSidebar }) {
  return (
    <button
      onClick={toggleSidebar}
      data-tip="Toggle sidebar"
      style={{
        width: 30, height: 30, borderRadius: 6,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-1)', cursor: 'pointer',
        flex: 'none',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <Hamburger />
    </button>
  );
}

window.MenuButton = MenuButton;

function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === 'dark';
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      data-tip={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        display: 'inline-flex', padding: 2,
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        height: 24, width: 48,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 140ms',
      }}>
      <span style={{
        position: 'absolute', top: 1, left: isDark ? 1 : 25,
        width: 20, height: 20, borderRadius: 50,
        background: 'var(--bg-3)',
        border: '1px solid var(--border-strong)',
        transition: 'left 220ms cubic-bezier(.4,1.4,.6,1)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: isDark ? 'var(--accent)' : 'var(--sev-medium)',
      }}>
        {isDark ? <Icon.Moon size={11} stroke={1.8} /> : <Icon.Sun size={12} stroke={1.8} />}
      </span>
      <span style={{
        width: 24, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: isDark ? 'var(--text-4)' : 'var(--text-3)', opacity: isDark ? 0 : 0.6,
      }}><Icon.Moon size={10} /></span>
      <span style={{
        width: 24, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: isDark ? 'var(--text-3)' : 'var(--text-4)', opacity: isDark ? 0.6 : 0,
      }}><Icon.Sun size={11} /></span>
    </button>
  );
}

// Coming soon page
function ComingSoon({ title, desc, icon: Ic }) {
  return (
    <div className="page-wrap" style={{ padding: '80px 32px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
      <div style={{
        width: 56, height: 56, margin: '0 auto 16px',
        borderRadius: 14,
        background: 'var(--bg-1)', border: '1px solid var(--border)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)',
      }}>
        <Ic size={26} />
      </div>
      <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 600, color: 'var(--text-0)', letterSpacing: '-0.02em' }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55, textWrap: 'pretty' }}>{desc}</p>
    </div>
  );
}

// Custom accent radio (since we want swatches with labels)
function AccentRadio({ value, onChange }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
      marginBottom: 4,
    }}>
      {Object.entries(ACCENTS).map(([key, a]) => (
        <button key={key} onClick={() => onChange(key)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          padding: '6px 4px',
          borderRadius: 8,
          background: value === key ? 'rgba(0,0,0,0.06)' : 'transparent',
          border: `1px solid ${value === key ? 'rgba(0,0,0,0.12)' : 'transparent'}`,
          cursor: 'pointer',
          transition: 'background 120ms',
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: 6,
            background: a.base,
            boxShadow: value === key
              ? `0 0 0 2px #fff, 0 0 0 3.5px ${a.base}`
              : 'inset 0 0 0 0.5px rgba(0,0,0,0.15)',
          }} />
          <span style={{
            fontSize: 10, color: 'rgba(41,38,27,0.65)',
            textTransform: 'capitalize', fontWeight: value === key ? 600 : 400,
          }}>{key}</span>
        </button>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
