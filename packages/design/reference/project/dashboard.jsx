// Dashboard — overview surface: stats + heatmap of where pins are landing.
// Designed for scan-and-go. The cards feed lives on Pinboards.

function Dashboard({ goToPinboards }) {
  const { SESSIONS } = window._DATA;
  const [range, setRange] = React.useState('30d');

  const totals = SESSIONS.reduce((a, s) => {
    a.pins += s.pins;
    a.critical += s.counts.critical;
    a.high     += s.counts.high;
    a.medium   += s.counts.medium;
    a.low      += s.counts.low;
    if (s.status === 'open')        a.open++;
    if (s.status === 'in-progress') a.progress++;
    if (s.status === 'resolved')    a.resolved++;
    return a;
  }, { pins: 0, critical: 0, high: 0, medium: 0, low: 0, open: 0, progress: 0, resolved: 0 });

  return (
    <div className="page-wrap">
      <PageHeader
        title="Overview"
        subtitle="Where the team is pinning, and what needs attention."
        right={
          <React.Fragment>
            <Segmented
              value={range} onChange={setRange}
              options={[
                { value: '7d',  label: '7 days' },
                { value: '30d', label: '30 days' },
                { value: '90d', label: '90 days' },
              ]}
            />
            <button className="btn"><Icon.ExternalLink size={11} /><span>Export</span></button>
          </React.Fragment>
        }
      />

      <div style={{ padding: '24px 32px 80px', maxWidth: 1200, margin: '0 auto' }}>
        {/* KPI strip */}
        <div className="grid-cols-4" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
          marginBottom: 14,
        }}>
          <Kpi label="Total pins"      value={totals.pins}                         delta="+24"   sub="vs. previous 30d" />
          <Kpi label="Open"            value={totals.open + totals.progress}        delta="-3"    sub="open + in progress" accent />
          <Kpi label="Critical"        value={totals.critical}                      sub="needs attention now" sev={totals.critical > 0 ? 'critical' : null} />
          <Kpi label="Avg time to fix" value="1.4d"                                 delta="-0.3d" sub="median across resolved" />
        </div>

        {/* Activity area chart */}
        <SectionCard
          title="Pin activity"
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
              <LegendDot color="var(--accent)" label="Created" />
              <LegendDot color="var(--status-resolved)" label="Resolved" />
              <span className="mono" style={{ color: 'var(--text-3)' }}>last 30 days</span>
            </div>
          }
        >
          <ActivityChart />
        </SectionCard>

        {/* Heatmap — where pins land */}
        <SectionCard
          title="Pin hotspots"
          hint="Bigger and brighter dots = more pins."
          right={
            <button className="btn sm ghost" onClick={goToPinboards}>
              <span>Open Pinboards</span><Icon.ArrowRight size={11} />
            </button>
          }
        >
          <PinHotspots />
        </SectionCard>

        {/* Bottom split */}
        <div className="grid-cols-2-stack" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>
          <SectionCard title="Top pages by pin volume" hint="last 30 days">
            <TopPagesList />
          </SectionCard>
          <SectionCard title="Team contributions" hint="last 30 days">
            <TeamLeaderboard />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ── KPI ───────────────────────────────────────────────────────────────────
function Kpi({ label, value, sub, delta, sev, accent }) {
  const valueColor = sev ? severityColor(sev) : accent ? 'var(--accent)' : 'var(--text-0)';
  // For Total pins / Critical: a positive delta is bad. For Open / Time-to-fix: negative is good.
  const positiveIsBad = label === 'Total pins' || label === 'Critical';
  const isNegative = String(delta || '').startsWith('-');
  const isPositive = String(delta || '').startsWith('+');
  const goodDelta = positiveIsBad ? isNegative : isPositive || isNegative;
  return (
    <div style={{
      padding: 18, borderRadius: 12,
      background: 'var(--bg-1)', border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{label}</div>
        {delta && (
          <span className="mono" style={{
            fontSize: 11, fontWeight: 500,
            padding: '2px 6px', borderRadius: 4,
            color: goodDelta ? 'var(--status-resolved)' : 'var(--sev-high)',
            background: `color-mix(in oklab, ${goodDelta ? 'var(--status-resolved)' : 'var(--sev-high)'} 10%, transparent)`,
          }}>{delta}</span>
        )}
      </div>
      <div className="mono" style={{
        fontSize: 32, fontWeight: 600, color: valueColor,
        letterSpacing: '-0.02em', lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────
function SectionCard({ title, hint, right, children }) {
  return (
    <div style={{
      padding: '16px 18px 18px',
      background: 'var(--bg-1)', border: '1px solid var(--border)',
      borderRadius: 12, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-0)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{title}</h3>
        {hint && <span style={{ fontSize: 11.5, color: 'var(--text-3)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hint}</span>}
        <div style={{ flex: 1 }} />
        {right}
      </div>
      {children}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: 50, background: color }} />
      {label}
    </span>
  );
}

// ── Activity area chart ──────────────────────────────────────────────────
function ActivityChart() {
  const created  = [3,5,4,6,8,6,9,11,7,5,8,12,14,10,13,16,12,9,11,15,13,18,16,14,11,17,19,14,12,16];
  const resolved = [1,2,3,2,4,5,3,5,6,4,5,7,9,7,8,10,9,8,7,9,11,12,10,11,9,12,14,13,11,13];
  const len = created.length;
  const max = Math.max(...created) * 1.1;

  const toX = i => (i / (len - 1)) * 100;
  const toY = v => 100 - (v / max) * 100;

  const areaPath = (data) =>
    `M0,100 ` + data.map((v, i) => `L${toX(i).toFixed(2)},${toY(v).toFixed(2)}`).join(' ') + ' L100,100 Z';
  const linePath = (data) =>
    data.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(2)},${toY(v).toFixed(2)}`).join(' ');

  const [hover, setHover] = React.useState(null);
  const svgRef = React.useRef(null);
  const onMove = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const i = Math.round((x / 100) * (len - 1));
    setHover({ i: Math.max(0, Math.min(len - 1, i)) });
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef}
        viewBox="0 0 100 100" preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ width: '100%', height: 180, display: 'block' }}>
        <defs>
          <linearGradient id="ac-accent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ac-resolved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--status-resolved)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--status-resolved)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--border-soft)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={areaPath(created)}  fill="url(#ac-accent)" />
        <path d={areaPath(resolved)} fill="url(#ac-resolved)" />
        <path d={linePath(created)}  fill="none" stroke="var(--accent)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <path d={linePath(resolved)} fill="none" stroke="var(--status-resolved)" strokeWidth="1.2" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {hover && (
          <React.Fragment>
            <line x1={toX(hover.i)} y1="0" x2={toX(hover.i)} y2="100" stroke="var(--border-strong)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
            <circle cx={toX(hover.i)} cy={toY(created[hover.i])}  r="2.5" fill="var(--accent)" stroke="var(--bg-1)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            <circle cx={toX(hover.i)} cy={toY(resolved[hover.i])} r="2.5" fill="var(--status-resolved)" stroke="var(--bg-1)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </React.Fragment>
        )}
      </svg>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10.5, color: 'var(--text-3)',
        fontFamily: 'var(--font-mono)', marginTop: 6,
      }}>
        {['Apr 25', 'May 1', 'May 8', 'May 15', 'May 22'].map(d => <span key={d}>{d}</span>)}
      </div>
      {hover && (
        <div style={{
          position: 'absolute',
          left: `min(calc(100% - 168px), max(8px, calc(${toX(hover.i)}% - 80px)))`,
          top: -8,
          width: 160, padding: '8px 10px',
          background: 'var(--bg-elev)',
          border: '1px solid var(--border-strong)', borderRadius: 8,
          boxShadow: 'var(--shadow-pop)',
          pointerEvents: 'none', fontSize: 11.5,
          zIndex: 5,
        }}>
          <div className="mono" style={{ color: 'var(--text-2)', marginBottom: 4 }}>May {hover.i + 1}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--accent)' }} />
              Created
            </span>
            <span className="mono" style={{ color: 'var(--text-0)' }}>{created[hover.i]}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--status-resolved)' }} />
              Resolved
            </span>
            <span className="mono" style={{ color: 'var(--text-0)' }}>{resolved[hover.i]}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pin hotspots — scatter chart (page × day × volume × severity) ───────
const SCATTER_PAGES = [
  { id: 'pay',   label: 'Payment',   url: 'app.northwind.io/checkout/payment',  hue: 14 },
  { id: 'dash',  label: 'Dashboard', url: 'app.northwind.io/dashboard',         hue: 198 },
  { id: 'ship',  label: 'Shipping',  url: 'app.northwind.io/checkout/shipping', hue: 38 },
  { id: 'cart',  label: 'Cart',      url: 'app.northwind.io/cart',              hue: 268 },
  { id: 'price', label: 'Pricing',   url: 'northwind.io/pricing',               hue: 158 },
  { id: 'sec',   label: 'Security',  url: 'app.northwind.io/settings/security', hue: 332 },
];

// Deterministic-ish "synthetic" pin events for the last 30 days
const SCATTER_DOTS = (() => {
  // [pageIndex, day(0-29), count, sev]
  const seed = [
    [0, 1, 2, 'medium'], [0, 3, 4, 'high'], [0, 7, 3, 'medium'], [0, 11, 5, 'high'], [0, 14, 6, 'critical'], [0, 17, 4, 'high'], [0, 22, 7, 'critical'], [0, 25, 5, 'high'], [0, 28, 8, 'critical'],
    [1, 0, 2, 'medium'], [1, 4, 3, 'medium'], [1, 9, 1, 'low'], [1, 13, 4, 'high'], [1, 18, 3, 'medium'], [1, 21, 5, 'high'], [1, 24, 2, 'medium'], [1, 29, 4, 'high'],
    [2, 2, 1, 'low'], [2, 5, 3, 'medium'], [2, 8, 2, 'medium'], [2, 12, 4, 'high'], [2, 16, 2, 'medium'], [2, 19, 3, 'high'], [2, 23, 5, 'high'], [2, 27, 2, 'medium'],
    [3, 1, 1, 'low'], [3, 6, 2, 'medium'], [3, 10, 1, 'low'], [3, 15, 3, 'high'], [3, 20, 2, 'medium'], [3, 24, 1, 'low'], [3, 28, 4, 'high'],
    [4, 3, 2, 'low'], [4, 8, 1, 'low'], [4, 13, 2, 'medium'], [4, 17, 1, 'low'], [4, 22, 3, 'medium'], [4, 26, 2, 'low'],
    [5, 4, 1, 'low'], [5, 11, 3, 'critical'], [5, 19, 1, 'medium'], [5, 26, 1, 'low'],
  ];
  return seed.map(([p, d, c, s]) => ({ page: p, day: d, count: c, sev: s }));
})();

function PinHotspots() {
  const [hover, setHover] = React.useState(null); // { dot } | null
  const [selectedPage, setSelectedPage] = React.useState(null);

  const days = 30;
  const pages = SCATTER_PAGES;
  const filteredDots = selectedPage != null
    ? SCATTER_DOTS.filter(d => d.page === selectedPage)
    : SCATTER_DOTS;

  // Layout — using a grid with row per page, ticks on x for days
  // Render as SVG for crisp circles, with padding for axis labels

  // Sizing
  const pad = { l: 96, r: 16, t: 8, b: 30 };
  const rowH = 38;
  const innerH = pages.length * rowH;
  const innerW = 800; // SVG viewBox width inside padding
  const W = pad.l + innerW + pad.r;
  const H = pad.t + innerH + pad.b;

  const dayX = (day) => (day / (days - 1)) * innerW;
  const pageY = (i) => i * rowH + rowH / 2;
  const dotR = (count) => 4 + Math.min(count, 10) * 1.4;

  const dayLabels = [1, 8, 15, 22, 29];

  return (
    <React.Fragment>
      <div style={{
        position: 'relative',
        background: 'var(--bg-0)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 12,
        overflow: 'hidden',
      }}>
        {/* Chart */}
        <div style={{ position: 'relative', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', minWidth: 600, height: H, display: 'block' }}>
            {/* Row backgrounds */}
            {pages.map((p, i) => (
              <g key={p.id}>
                <rect x={pad.l - 88} y={pad.t + i * rowH}
                  width={innerW + 88 + pad.r}
                  height={rowH}
                  fill={i % 2 === 0 ? 'transparent' : 'var(--bg-1)'}
                  opacity={i % 2 === 0 ? 0 : 0.5}
                />
                {/* Page label */}
                <foreignObject x={pad.l - 90} y={pad.t + i * rowH + (rowH - 22) / 2}
                  width="86" height="22">
                  <button
                    onClick={() => setSelectedPage(selectedPage === i ? null : i)}
                    style={{
                      width: '100%', height: '100%',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '0 6px',
                      background: selectedPage === i ? 'var(--bg-2)' : 'transparent',
                      borderRadius: 5,
                      cursor: 'pointer',
                      color: 'var(--text-1)',
                      transition: 'background 120ms',
                    }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: 2,
                      background: `oklch(0.58 0.16 ${p.hue})`,
                      flex: 'none',
                    }} />
                    <span style={{
                      fontSize: 12, color: 'var(--text-0)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{p.label}</span>
                  </button>
                </foreignObject>
              </g>
            ))}

            {/* X grid */}
            {dayLabels.map(d => (
              <line key={d}
                x1={pad.l + dayX(d - 1)} y1={pad.t}
                x2={pad.l + dayX(d - 1)} y2={pad.t + innerH}
                stroke="var(--border-soft)" strokeWidth="1" strokeDasharray="2 4"
              />
            ))}

            {/* Y separator under last row */}
            <line x1={pad.l} y1={pad.t + innerH + 0.5}
              x2={pad.l + innerW} y2={pad.t + innerH + 0.5}
              stroke="var(--border)" strokeWidth="1" />

            {/* Dots */}
            {SCATTER_DOTS.map((d, i) => {
              const dimmed = selectedPage != null && d.page !== selectedPage;
              const c = severityColor(d.sev);
              const cx = pad.l + dayX(d.day);
              const cy = pad.t + pageY(d.page);
              const r  = dotR(d.count);
              const isHover = hover && hover.i === i;
              return (
                <g key={i}
                  style={{ cursor: 'pointer', transition: 'opacity 120ms' }}
                  opacity={dimmed ? 0.18 : 1}
                  onMouseEnter={() => setHover({ i, d, cx, cy, r })}
                  onMouseLeave={() => setHover(null)}>
                  {/* halo */}
                  <circle cx={cx} cy={cy} r={r + 5} fill={c} opacity={isHover ? 0.25 : 0.12} />
                  <circle cx={cx} cy={cy} r={r}
                    fill={c}
                    stroke={isHover ? '#fff' : 'var(--bg-0)'}
                    strokeWidth={isHover ? 1.5 : 1}
                  />
                </g>
              );
            })}

            {/* X axis ticks/labels */}
            {dayLabels.map(d => (
              <text key={d}
                x={pad.l + dayX(d - 1)}
                y={pad.t + innerH + 18}
                textAnchor="middle"
                fontSize="10.5"
                fontFamily="var(--font-mono)"
                fill="var(--text-3)">May {d}</text>
            ))}
          </svg>
        </div>

        {/* Tooltip */}
        {hover && (
          <ScatterTooltip hover={hover} pages={pages} />
        )}

        {/* Legend */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          marginTop: 10, paddingTop: 12,
          borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-2)',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>Severity</span>
            {[
              ['critical', 'Critical'],
              ['high',     'High'],
              ['medium',   'Medium'],
              ['low',      'Low'],
            ].map(([k, l]) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 50, background: severityColor(k) }} />
                {l}
              </span>
            ))}
          </div>
          <span style={{ color: 'var(--border-strong)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>Size</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="22" height="14" viewBox="0 0 22 14">
                <circle cx="4"  cy="7" r="3"   fill="var(--text-3)" opacity="0.7" />
                <circle cx="11" cy="7" r="4.5" fill="var(--text-3)" opacity="0.7" />
                <circle cx="19" cy="7" r="6.5" fill="var(--text-3)" opacity="0.7" />
              </svg>
              pin count
            </span>
          </div>
          {selectedPage != null && (
            <React.Fragment>
              <span style={{ color: 'var(--border-strong)' }}>|</span>
              <button onClick={() => setSelectedPage(null)} className="btn sm ghost" style={{ height: 22, padding: '0 8px', fontSize: 11 }}>
                <Icon.X size={10} /><span>Clear filter</span>
              </button>
            </React.Fragment>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

function ScatterTooltip({ hover, pages }) {
  const { d, cx, cy, r } = hover;
  const page = pages[d.page];
  // Position via percent within the chart container; use absolute
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(cx / 832) * 100}% - 90px)`,
      top: cy - 8,
      transform: 'translateY(-100%)',
      width: 180, padding: '8px 10px',
      background: 'var(--bg-elev)',
      border: '1px solid var(--border-strong)',
      borderRadius: 8,
      boxShadow: 'var(--shadow-pop)',
      pointerEvents: 'none',
      fontSize: 11.5,
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ width: 7, height: 7, borderRadius: 2, background: `oklch(0.58 0.16 ${page.hue})`, flex: 'none' }} />
        <span style={{ fontSize: 12, color: 'var(--text-0)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.label}</span>
        <span className="mono" style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>May {d.day + 1}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-2)' }}>
          <span style={{ width: 6, height: 6, borderRadius: 50, background: severityColor(d.sev) }} />
          <span style={{ textTransform: 'capitalize' }}>{d.sev}</span>
        </span>
        <span className="mono" style={{ color: 'var(--text-0)', fontWeight: 500 }}>{d.count} pins</span>
      </div>
    </div>
  );
}

// ── Top pages list ───────────────────────────────────────────────────────
function TopPagesList() {
  const items = [
    { url: 'app.northwind.io/checkout/payment',  hue: 14,  pins: 28, c: { critical: 3, high: 8, medium: 12, low: 5 } },
    { url: 'app.northwind.io/dashboard',         hue: 198, pins: 17, c: { critical: 0, high: 4, medium: 8,  low: 5 } },
    { url: 'app.northwind.io/checkout/shipping', hue: 38,  pins: 14, c: { critical: 0, high: 3, medium: 7,  low: 4 } },
    { url: 'app.northwind.io/cart',              hue: 268, pins: 11, c: { critical: 0, high: 2, medium: 6,  low: 3 } },
    { url: 'northwind.io/pricing',               hue: 158, pins: 9,  c: { critical: 0, high: 1, medium: 5,  low: 3 } },
    { url: 'app.northwind.io/settings/security', hue: 332, pins: 6,  c: { critical: 1, high: 0, medium: 4,  low: 1 } },
  ];
  const max = items[0].pins;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 8, height: 8, borderRadius: 2,
            background: `oklch(0.55 0.16 ${p.hue})`, flex: 'none',
          }} />
          <span className="mono" style={{
            fontSize: 11.5, color: 'var(--text-1)',
            flex: '0 0 220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{p.url}</span>
          <div style={{ flex: 1, height: 6, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(p.pins / max) * 100}%`,
              display: 'flex', gap: 1,
            }}>
              {['critical', 'high', 'medium', 'low'].map(k => p.c[k] > 0 && (
                <div key={k} style={{ background: severityColor(k), flex: p.c[k] }} />
              ))}
            </div>
          </div>
          <span className="mono" style={{
            fontSize: 12, color: 'var(--text-0)', fontWeight: 500,
            width: 28, textAlign: 'right',
          }}>{p.pins}</span>
        </div>
      ))}
    </div>
  );
}

// ── Team leaderboard ──────────────────────────────────────────────────────
function TeamLeaderboard() {
  const data = [
    { id: 'ren',   created: 38, resolved: 14 },
    { id: 'mara',  created: 27, resolved: 22 },
    { id: 'idris', created: 21, resolved: 9  },
    { id: 'nina',  created: 14, resolved: 18 },
    { id: 'sam',   created: 12, resolved: 6  },
    { id: 'tova',  created: 6,  resolved: 3  },
  ];
  const max = Math.max(...data.flatMap(d => [d.created, d.resolved]));
  return (
    <React.Fragment>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map(d => {
          const p = findPerson(d.id);
          return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar person={p} size={20} />
              <span style={{ fontSize: 12.5, color: 'var(--text-0)', flex: '0 0 70px', whiteSpace: 'nowrap' }}>{p.name.split(' ')[0]}</span>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ flex: 1, height: 5, background: 'var(--bg-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(d.created / max) * 100}%`, background: 'var(--accent)' }} />
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-1)', width: 18, textAlign: 'right' }}>{d.created}</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ flex: 1, height: 5, background: 'var(--bg-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(d.resolved / max) * 100}%`, background: 'var(--status-resolved)' }} />
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-1)', width: 18, textAlign: 'right' }}>{d.resolved}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{
        display: 'flex', gap: 10, marginTop: 10,
        paddingTop: 8, borderTop: '1px solid var(--border-soft)',
        fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        <span style={{ flex: '0 0 100px' }}></span>
        <span style={{ flex: 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--accent)' }} />Created
        </span>
        <span style={{ flex: 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--status-resolved)' }} />Resolved
        </span>
      </div>
    </React.Fragment>
  );
}

window.Dashboard = Dashboard;
