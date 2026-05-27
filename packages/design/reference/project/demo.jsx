// Demo page — simulates the pinLayer extension active on a real product page.
// Clicking the page in annotate mode drops a pin and opens an inline composer popover.

function Demo({ back }) {
  const [mode, setMode] = React.useState('annotate'); // 'annotate' | 'view' | 'off'
  const [pins, setPins] = React.useState([
    {
      i: 1, x: 22.5, y: 41,  status: 'open',
      severity: 'high', type: 'visual', author: 'ren',
      title: 'Card logos misaligned',
      body: 'Visa/MC/Amex icons sit 2px high relative to the input baseline.',
      ago: '12m ago', anchor: '.payment-icons',
      attachments: [{ kind: 'screenshot', id: 'a1', region: { x: 8, y: 30, w: 28, h: 6 }, markup: [{ kind: 'rect', x: 12, y: 28, w: 60, h: 44, color: 'critical' }] }],
    },
    {
      i: 2, x: 31.5, y: 55, status: 'open',
      severity: 'critical', type: 'broken', author: 'nina',
      title: 'Apple Pay button silently fails',
      body: 'First tap does nothing in Safari 18.3 — second tap works.',
      ago: '6m ago', anchor: 'button.apple-pay',
      attachments: [
        { kind: 'screenshot', id: 'a2', region: { x: 10, y: 50, w: 40, h: 8 }, markup: [{ kind: 'arrow', x1: 70, y1: 20, x2: 35, y2: 50 }, { kind: 'text', x: 60, y: 12, label: '⌘ no event fired' }] },
        { kind: 'clip', id: 'c1', duration: 14 },
      ],
    },
    {
      i: 3, x: 64, y: 68, status: 'in-progress',
      severity: 'medium', type: 'a11y', author: 'idris',
      title: 'Total row contrast 3.6:1',
      body: 'Use --text-1 against summary background for AA compliance.',
      ago: '1h ago', anchor: '.summary .total', attachments: [],
    },
    {
      i: 4, x: 32, y: 84, status: 'open',
      severity: 'high', type: 'a11y', author: 'idris',
      title: 'Submit button lacks aria-disabled state',
      body: 'Screen readers announce it as enabled even while spinning.',
      ago: '34m ago', anchor: 'button[type=submit]', attachments: [],
    },
  ]);
  const [drafting, setDrafting] = React.useState(null); // {i, x, y, ...}
  const [openPin, setOpenPin] = React.useState(null);   // pin object
  const [hoveredEl, setHoveredEl] = React.useState(null); // {label, x, y, w, h}
  const [snipping, setSnipping] = React.useState(false);
  const [recording, setRecording] = React.useState(null); // null | { startedAt, paused, pausedAt, accum }
  const stageRef = React.useRef(null);

  const onStageClick = (e) => {
    if (mode !== 'annotate' || drafting || snipping) return;
    const r = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width)  * 100;
    const y = ((e.clientY - r.top)  / r.height) * 100;
    setOpenPin(null);
    setDrafting({
      i: pins.length + 1, x, y,
      severity: 'medium', type: 'visual',
      title: '', body: '',
      anchor: hoveredEl?.label || 'div.unknown',
      attachments: [],
    });
  };

  const commitDraft = (draft) => {
    setPins([...pins, { ...draft, status: 'open', author: 'ren', ago: 'just now' }]);
    setDrafting(null);
  };
  const cancelDraft = () => { setDrafting(null); setSnipping(false); setRecording(null); };

  const finishSnip = (region, markup) => {
    setSnipping(false);
    setDrafting(d => ({ ...d, attachments: [...(d.attachments || []), { kind: 'screenshot', id: 't' + Date.now(), region, markup: markup || [] }] }));
  };

  const finishRecord = (durationSec) => {
    setRecording(null);
    setDrafting(d => ({ ...d, attachments: [...(d.attachments || []), { kind: 'clip', id: 'c' + Date.now(), duration: durationSec }] }));
  };

  const removeAttachment = (id) => {
    setDrafting(d => ({ ...d, attachments: (d.attachments || []).filter(a => a.id !== id) }));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg-0)',
      display: 'flex', flexDirection: 'column',
      zIndex: 30,
    }}>
      {/* Top chrome — "we have left pinLayer; you're in the product tab" */}
      <DemoTopBar back={back} mode={mode} setMode={setMode} pins={pins} />

      {/* The fake browser stage */}
      <div style={{
        flex: 1, minHeight: 0,
        padding: '14px 24px 24px',
        background: 'var(--bg-0)',
        display: 'flex', justifyContent: 'center',
      }}>
        <div ref={stageRef}
          onClick={onStageClick}
          style={{
            position: 'relative',
            width: '100%', maxWidth: 1280,
            background: '#FAFAF9',
            color: '#1A1A1B',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
            cursor: mode === 'annotate' && !drafting ? 'crosshair' : 'default',
            boxShadow: '0 24px 60px -20px rgba(0,0,0,0.45)',
          }}>
          <FakeBrowserChrome />
          <FakeCheckoutPage
            mode={mode}
            setHoveredEl={setHoveredEl}
          />

          {/* Reticle following cursor in annotate mode (and not while drafting) */}
          {mode === 'annotate' && hoveredEl && !drafting && (
            <HoverReticle el={hoveredEl} />
          )}

          {/* Pin markers */}
          {mode !== 'off' && pins.map(p => (
            <PinMarker key={p.i} p={p}
              active={openPin?.i === p.i}
              onClick={(e) => { e.stopPropagation(); setOpenPin(openPin?.i === p.i ? null : p); setDrafting(null); }}
            />
          ))}

          {/* Existing pin read-popover */}
          {openPin && (
            <PinReadPopover p={openPin} onClose={() => setOpenPin(null)} />
          )}

          {/* Draft composer */}
          {drafting && !snipping && (
            <PinComposer
              draft={drafting} setDraft={setDrafting}
              commit={commitDraft} cancel={cancelDraft}
              onStartSnip={() => setSnipping(true)}
              onStartRecord={() => setRecording({ startedAt: Date.now(), paused: false, pausedAt: null, accum: 0 })}
              recording={recording}
              removeAttachment={removeAttachment}
            />
          )}

          {/* Snip overlay */}
          {snipping && (
            <SnipOverlay stageRef={stageRef} onCapture={finishSnip} onCancel={() => setSnipping(false)} />
          )}

          {/* Recording widget */}
          {recording && (
            <RecordingWidget
              rec={recording} setRec={setRecording}
              onStop={finishRecord}
            />
          )}

          {/* Toolbar overlay */}
          {mode !== 'off' && !snipping && <ExtensionToolbar mode={mode} setMode={setMode} pins={pins} />}
        </div>
      </div>
    </div>
  );
}

// ── Top demo bar ─────────────────────────────────────────────────────────
function DemoTopBar({ back, mode, setMode, pins }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 20px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-0)',
      flex: 'none', whiteSpace: 'nowrap',
    }}>
      <button className="btn ghost" onClick={back}>
        <Icon.ArrowLeft size={13} />
        <span>Back</span>
      </button>
      <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon.CursorPin size={14} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)', letterSpacing: '-0.01em' }}>Live demo</span>
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>· extension active on Northwind</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-2)' }}>
        <span className="mono" style={{ color: 'var(--text-1)' }}>{pins.length}</span>
        <span>pins</span>
        <span style={{ color: 'var(--text-3)' }}>·</span>
        <span className="mono" style={{ color: 'var(--text-1)' }}>PL-0143</span>
      </div>
      <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--text-3)' }}>
        <kbd>Click</kbd>
        <span>any element to drop a pin</span>
      </div>
    </div>
  );
}

// ── Fake browser chrome ──────────────────────────────────────────────────
function FakeBrowserChrome() {
  return (
    <div style={{
      height: 38, display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 14px',
      background: '#E9E8E4',
      borderBottom: '1px solid #D5D4D0',
      color: '#5A5A55',
    }}>
      <span style={{ width: 10, height: 10, borderRadius: 50, background: '#F76A60' }} />
      <span style={{ width: 10, height: 10, borderRadius: 50, background: '#F6BB45' }} />
      <span style={{ width: 10, height: 10, borderRadius: 50, background: '#62C955' }} />
      <div style={{
        flex: 1, height: 24,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 12px', margin: '0 14px',
        background: '#FBFAF7', borderRadius: 5,
        border: '1px solid #D5D4D0',
        fontFamily: 'var(--font-mono)', fontSize: 11.5,
        color: '#222',
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ color: '#388E3C', flex: 'none' }}>
          <path d="M5 11V8a7 7 0 0 1 14 0v3" /><rect x="3" y="11" width="18" height="11" rx="2" />
        </svg>
        app.northwind.io/checkout/payment
      </div>
      <div style={{
        fontSize: 10.5, color: '#5A5A55',
        padding: '3px 8px', borderRadius: 4,
        background: 'rgba(139, 92, 246, 0.10)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        color: '#6D45D0', display: 'flex', alignItems: 'center', gap: 5,
        fontWeight: 500,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: 50, background: '#7C3AED' }} />
        pinLayer active
      </div>
    </div>
  );
}

// ── Fake checkout page content ───────────────────────────────────────────
function FakeCheckoutPage({ mode, setHoveredEl }) {
  const isAnnotate = mode === 'annotate';
  const Hovered = ({ label, children, style }) => (
    <div
      onMouseEnter={isAnnotate ? (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const stage = e.currentTarget.closest('[data-stage]');
        const s = stage?.getBoundingClientRect() || { left: 0, top: 0, width: 1, height: 1 };
        setHoveredEl({
          label,
          x: ((r.left - s.left) / s.width) * 100,
          y: ((r.top  - s.top)  / s.height) * 100,
          w: (r.width  / s.width)  * 100,
          h: (r.height / s.height) * 100,
        });
      } : undefined}
      onMouseLeave={isAnnotate ? () => setHoveredEl(null) : undefined}
      style={style}
    >{children}</div>
  );
  return (
    <div data-stage style={{
      padding: '36px 56px 56px',
      display: 'grid', gridTemplateColumns: '1fr 380px', gap: 40,
      fontFamily: 'var(--font-sans)',
      color: '#1A1A1B',
      minHeight: 700,
    }}>
      {/* LEFT — form */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: 'linear-gradient(135deg, oklch(0.55 0.16 268), oklch(0.40 0.14 290))', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>NW</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1B', letterSpacing: '-0.01em' }}>Northwind</span>
        </div>
        <h1 style={{ margin: '12px 0 4px', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: '#1A1A1B' }}>Payment</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: '#666', marginBottom: 28 }}>
          Step 3 of 3 · Your payment is encrypted and never leaves your browser.
        </p>

        <Hovered label='.payment-icons' style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18,
          height: 30, paddingLeft: 2,
        }}>
          {['VISA','MC','AMEX','APAY'].map(b => (
            <span key={b} style={{
              height: 22, padding: '0 8px', borderRadius: 4,
              background: '#fff', border: '1px solid #E2E1DC',
              display: 'inline-flex', alignItems: 'center',
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
              color: '#555',
              fontFamily: 'var(--font-mono)',
            }}>{b}</span>
          ))}
        </Hovered>

        <Field label="Cardholder name">
          <FakeInput value="Ren Kawamura" setHoveredEl={setHoveredEl} label='input[name="card-name"]' mode={mode} />
        </Field>
        <Field label="Card number">
          <FakeInput value="4242 4242 4242 4242" setHoveredEl={setHoveredEl} label='input[name="card-number"]' mode={mode} mono />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <Field label="Expiry">
            <FakeInput value="08 / 28" setHoveredEl={setHoveredEl} label='input[name="exp"]' mode={mode} mono />
          </Field>
          <Field label="CVV">
            <FakeInput value="•••" setHoveredEl={setHoveredEl} label='input[name="cvv"]' mode={mode} mono />
          </Field>
        </div>

        <Hovered label='button.apple-pay' style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
        }}>
          <button style={{
            flex: 1, height: 44, borderRadius: 8, border: 'none',
            background: '#0E0E0E', color: '#fff',
            fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: 'default',
          }}>
            <span style={{ fontSize: 16 }}></span>
            <span>Pay</span>
          </button>
          <button style={{
            flex: 1, height: 44, borderRadius: 8, border: '1px solid #1A1A1B',
            background: '#1A1A1B', color: '#fff',
            fontSize: 13, fontWeight: 600,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>G</span> Pay
          </button>
        </Hovered>

        <Hovered label='.coupon-row' style={{
          display: 'flex', gap: 8, marginBottom: 22, alignItems: 'center',
        }}>
          <input value="WELCOME10" readOnly style={{
            flex: 1, height: 38, padding: '0 12px',
            borderRadius: 7, border: '1px solid #E2E1DC',
            background: '#fff', fontFamily: 'var(--font-mono)',
            fontSize: 13, color: '#1A1A1B',
          }} />
          <button style={{
            height: 38, padding: '0 16px', borderRadius: 7,
            border: '1px solid #E2E1DC', background: '#fff',
            fontSize: 13, fontWeight: 500, color: '#1A1A1B',
          }}>Apply</button>
        </Hovered>

        <Hovered label='button[type="submit"]' style={{}}>
          <button style={{
            width: '100%', height: 52, borderRadius: 9, border: 'none',
            background: 'linear-gradient(180deg, #8B5CF6, #7C3AED)',
            color: '#fff', fontSize: 15, fontWeight: 600,
            letterSpacing: '-0.01em',
            boxShadow: '0 6px 18px -4px rgba(139,92,246,0.45)',
            cursor: 'default',
          }}>Place order — $128.40</button>
        </Hovered>

        <p style={{ margin: '14px 0 0', fontSize: 11.5, color: '#888', textAlign: 'center' }}>
          By placing your order you agree to our <span style={{ textDecoration: 'underline' }}>Terms</span> and <span style={{ textDecoration: 'underline' }}>Refund Policy</span>.
        </p>
      </div>

      {/* RIGHT — order summary */}
      <Hovered label='.summary' style={{}}>
        <div style={{
          padding: 22, borderRadius: 10,
          background: '#FFFFFF', border: '1px solid #E5E4DE',
          boxShadow: '0 1px 0 #FCFBF8 inset',
        }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#1A1A1B', letterSpacing: '-0.01em' }}>Order summary</h2>
          {[
            ['Aurora Linen Throw',    '$58.00', 'Sand · 50×60'],
            ['Hawthorne Tumbler ×2',  '$48.00', 'Smoked oak'],
            ['Mira Reading Lamp',     '$22.40', 'Brass · warm 2700K'],
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 6,
                background: `linear-gradient(135deg, oklch(0.86 0.04 ${30 + i * 60}), oklch(0.72 0.06 ${30 + i * 60}))`,
                flex: 'none', border: '1px solid #E5E4DE',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#1A1A1B', fontWeight: 500 }}>{row[0]}</div>
                <div style={{ fontSize: 11.5, color: '#888', marginTop: 2 }}>{row[2]}</div>
              </div>
              <div style={{ fontSize: 13, color: '#1A1A1B', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{row[1]}</div>
            </div>
          ))}
          <div style={{ height: 1, background: '#EBEAE4', margin: '14px 0' }} />
          {[
            ['Subtotal', '$128.40'],
            ['Shipping', 'Free'],
            ['Tax',      '$0.00'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12.5, color: '#666' }}>
              <span>{k}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#1A1A1B' }}>{v}</span>
            </div>
          ))}
          <div style={{ height: 1, background: '#EBEAE4', margin: '12px 0' }} />
          <Hovered label='.summary .total' style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1B' }}>Total</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1B', fontFamily: 'var(--font-mono)' }}>$128.40</span>
          </Hovered>
        </div>

        <div style={{
          marginTop: 14, padding: 14,
          background: 'transparent', border: '1px dashed #D5D4D0',
          borderRadius: 8, fontSize: 11.5, color: '#666',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flex: 'none', marginTop: 1 }}>
            <circle cx="12" cy="12" r="9"/><path d="M12 8v5l3 2"/>
          </svg>
          <span>Orders placed before 3 PM PT ship same day.</span>
        </div>
      </Hovered>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
    </div>
  );
}

function FakeInput({ value, mono, mode, setHoveredEl, label }) {
  const isAnnotate = mode === 'annotate';
  return (
    <input value={value} readOnly
      onMouseEnter={isAnnotate ? (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const stage = e.currentTarget.closest('[data-stage]');
        const s = stage.getBoundingClientRect();
        setHoveredEl({
          label,
          x: ((r.left - s.left) / s.width) * 100,
          y: ((r.top  - s.top)  / s.height) * 100,
          w: (r.width  / s.width)  * 100,
          h: (r.height / s.height) * 100,
        });
      } : undefined}
      onMouseLeave={isAnnotate ? () => setHoveredEl(null) : undefined}
      style={{
        width: '100%', height: 38, padding: '0 12px',
        borderRadius: 7, border: '1px solid #E2E1DC',
        background: '#FFFFFF',
        fontSize: 13, color: '#1A1A1B',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        outline: 'none',
        boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
      }}
    />
  );
}

// ── Hover reticle (rectangle around the currently-hovered element) ───────
function HoverReticle({ el }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${el.x}%`, top: `${el.y}%`,
      width: `${el.w}%`, height: `${el.h}%`,
      border: '1.5px dashed var(--accent)',
      borderRadius: 4,
      background: 'color-mix(in oklab, var(--accent) 6%, transparent)',
      pointerEvents: 'none',
      transition: 'all 80ms ease-out',
      boxShadow: '0 0 0 1px color-mix(in oklab, var(--accent) 25%, transparent)',
    }}>
      <span className="mono" style={{
        position: 'absolute', left: 0, top: -22,
        height: 18, padding: '0 6px', borderRadius: 3,
        background: 'var(--accent)', color: '#fff',
        fontSize: 10, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center',
        whiteSpace: 'nowrap',
      }}>{el.label}</span>
    </div>
  );
}

// ── Pin marker ───────────────────────────────────────────────────────────
function PinMarker({ p, onClick, active }) {
  const sevColor = ({
    critical: 'var(--sev-critical)', high: 'var(--sev-high)',
    medium: 'var(--sev-medium)',     low:  'var(--sev-low)',
  })[p.severity];
  return (
    <button onClick={onClick} style={{
      position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
      transform: 'translate(-50%, -100%)',
      cursor: 'pointer', zIndex: active ? 30 : 10,
      padding: 0,
      filter: active ? 'drop-shadow(0 0 0 transparent)' : 'none',
    }}>
      <div style={{
        position: 'relative',
        height: 28, padding: '0 4px 0 4px',
        background: 'var(--accent)',
        borderRadius: 999,
        boxShadow: active
          ? `0 8px 20px -4px var(--accent-glow), 0 0 0 4px color-mix(in oklab, var(--accent) 20%, transparent)`
          : '0 6px 14px -4px rgba(0,0,0,0.4), 0 0 0 2px #fff inset',
        border: '1.5px solid #fff',
        display: 'inline-flex', alignItems: 'center', gap: 5,
        color: '#fff',
        transition: 'box-shadow 160ms',
      }}>
        <span className="mono" style={{
          width: 20, height: 20, borderRadius: 50,
          background: 'rgba(0,0,0,0.22)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
        }}>#{String(p.i).padStart(2, '0')}</span>
        <span style={{
          width: 7, height: 7, borderRadius: 50,
          background: sevColor,
          marginRight: 3,
          boxShadow: '0 0 0 2px rgba(255,255,255,0.4)',
        }} />
      </div>
      {/* tail */}
      <div style={{
        position: 'absolute', left: '50%', bottom: -5, transform: 'translateX(-50%) rotate(45deg)',
        width: 8, height: 8, background: 'var(--accent)',
        border: '1.5px solid #fff', borderTop: 0, borderLeft: 0,
      }} />
    </button>
  );
}

// ── Composer popover for new pin ─────────────────────────────────────────
function PinComposer({ draft, setDraft, commit, cancel, onStartSnip, onStartRecord, recording, removeAttachment }) {
  const inputRef = React.useRef(null);
  React.useEffect(() => { inputRef.current?.focus(); }, []);

  // Position popover to stay inside the stage
  const popoverStyle = popoverPosition(draft.x, draft.y);

  const types = [
    { id: 'visual',  label: 'Visual' },
    { id: 'layout',  label: 'Layout' },
    { id: 'copy',    label: 'Copy' },
    { id: 'broken',  label: 'Broken' },
    { id: 'a11y',    label: 'A11y' },
    { id: 'perf',    label: 'Perf' },
  ];
  const severities = [
    { id: 'critical', color: 'var(--sev-critical)' },
    { id: 'high',     color: 'var(--sev-high)' },
    { id: 'medium',   color: 'var(--sev-medium)' },
    { id: 'low',      color: 'var(--sev-low)' },
  ];

  const attachments = draft.attachments || [];

  return (
    <React.Fragment>
      <DraftMarker x={draft.x} y={draft.y} i={draft.i} />
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', ...popoverStyle,
        width: 340,
        background: 'var(--bg-1)', color: 'var(--text-0)',
        border: '1px solid var(--border-strong)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-pop)',
        zIndex: 40,
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
      }}>
        {/* Head */}
        <div style={{
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid var(--border)',
          background: 'color-mix(in oklab, var(--accent) 6%, var(--bg-1))',
        }}>
          <PinPill n={draft.i} sm />
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {draft.anchor}
          </span>
          <button onClick={cancel} className="btn icon sm ghost"><Icon.X size={11} /></button>
        </div>

        {/* Severity row */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Severity</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {severities.map(s => {
              const active = draft.severity === s.id;
              return (
                <button key={s.id}
                  onClick={() => setDraft({ ...draft, severity: s.id })}
                  style={{
                    flex: 1, height: 28, borderRadius: 6,
                    background: active ? 'color-mix(in oklab, ' + s.color + ' 14%, var(--bg-2))' : 'var(--bg-2)',
                    border: `1px solid ${active ? s.color : 'var(--border)'}`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    color: 'var(--text-1)', fontSize: 11.5,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 120ms',
                  }}>
                  <span style={{ width: 7, height: 7, borderRadius: 50, background: s.color }} />
                  {s.id}
                </button>
              );
            })}
          </div>
        </div>

        {/* Type row */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {types.map(t => {
              const active = draft.type === t.id;
              return (
                <button key={t.id}
                  onClick={() => setDraft({ ...draft, type: t.id })}
                  className="mono"
                  style={{
                    height: 22, padding: '0 8px', borderRadius: 4,
                    background: active ? 'var(--accent-soft)' : 'var(--bg-2)',
                    border: `1px solid ${active ? 'color-mix(in oklab, var(--accent) 50%, transparent)' : 'var(--border)'}`,
                    color: active ? 'var(--accent)' : 'var(--text-2)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}>{t.label}</button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input ref={inputRef}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="One-line title…"
            style={{
              height: 30, padding: '0 10px',
              background: 'var(--bg-0)', border: '1px solid var(--border)',
              color: 'var(--text-0)', fontSize: 13, fontWeight: 500,
              borderRadius: 6, outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder="Add detail, paste a Figma link, mention a teammate…"
            style={{
              minHeight: 50, padding: '8px 10px', resize: 'none',
              background: 'var(--bg-0)', border: '1px solid var(--border)',
              color: 'var(--text-0)', fontSize: 13,
              borderRadius: 6, outline: 'none', lineHeight: 1.5,
              fontFamily: 'inherit',
            }}
          />

          {/* Attachments */}
          {attachments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {attachments.map(a => (
                <AttachmentTile
                  key={a.id}
                  att={a}
                  editable
                  onRemove={() => removeAttachment(a.id)}
                  onMarkup={(markup) => setDraft({
                    ...draft,
                    attachments: draft.attachments.map(x => x.id === a.id ? { ...x, markup } : x),
                  })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 10px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-0)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <button className="btn icon sm" data-tip="Capture screenshot" onClick={onStartSnip}>
            <Icon.Camera size={12} />
          </button>
          <button
            className="btn icon sm"
            data-tip={recording ? 'Recording…' : 'Record clip'}
            onClick={onStartRecord}
            disabled={!!recording}
            style={{
              color: recording ? 'var(--sev-critical)' : undefined,
              opacity: recording ? 0.85 : 1,
            }}>
            <Icon.Video size={12} />
          </button>
          <button className="btn icon sm" data-tip="Assign">
            <Avatar person="nina" size={14} />
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
            → <span className="mono" style={{ color: 'var(--text-2)' }}>Linear</span>
          </span>
          <button className="btn sm ghost" onClick={cancel} style={{ height: 26, padding: '0 8px' }}>Cancel</button>
          <button
            className="btn primary sm"
            disabled={!draft.title}
            onClick={() => commit(draft)}
            style={{
              height: 26, padding: '0 10px',
              opacity: draft.title ? 1 : 0.5,
              cursor: draft.title ? 'pointer' : 'not-allowed',
            }}>
            <Icon.Send size={10} />
            <span>Submit</span>
            <kbd style={{
              background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.85)', marginLeft: 2,
            }}>⌘↵</kbd>
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

function DraftMarker({ x, y, i }) {
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      transform: 'translate(-50%, -100%)',
      zIndex: 35, pointerEvents: 'none',
    }}>
      <div style={{
        height: 26, padding: '0 8px',
        background: 'var(--accent)',
        borderRadius: 999,
        boxShadow: '0 0 0 2px #fff inset, 0 6px 20px -4px var(--accent-glow), 0 0 0 4px color-mix(in oklab, var(--accent) 18%, transparent)',
        display: 'inline-flex', alignItems: 'center', gap: 5,
        color: '#fff',
      }}>
        <span className="mono" style={{
          fontSize: 11, fontWeight: 700,
          padding: '0 5px', height: 18, borderRadius: 50,
          background: 'rgba(0,0,0,0.22)',
          display: 'inline-flex', alignItems: 'center',
        }}>#{String(i).padStart(2, '0')}</span>
        <span style={{ fontSize: 11.5, opacity: 0.9, fontWeight: 500 }}>New</span>
      </div>
    </div>
  );
}

// Read-only popover for existing pins
function PinReadPopover({ p, onClose }) {
  const popoverStyle = popoverPosition(p.x, p.y);
  return (
    <div onClick={e => e.stopPropagation()} style={{
      position: 'absolute', ...popoverStyle,
      width: 300,
      background: 'var(--bg-1)', color: 'var(--text-0)',
      border: '1px solid var(--border-strong)',
      borderRadius: 12,
      boxShadow: 'var(--shadow-pop)',
      zIndex: 40,
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Head */}
      <div style={{
        padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid var(--border)',
      }}>
        <PinPill n={p.i} sm />
        <SeverityDot level={p.severity} size={6} ring={false} />
        <TypeChip type={p.type} />
        <div style={{ flex: 1 }} />
        <StatusChip status={p.status} />
        <button onClick={onClose} className="btn icon sm ghost"><Icon.X size={11} /></button>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)', lineHeight: 1.3, marginBottom: 6, letterSpacing: '-0.01em' }}>
          {p.title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 10 }}>
          {p.body}
        </div>
        {p.attachments?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {p.attachments.map(a => <AttachmentTile key={a.id} att={a} />)}
          </div>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11.5, color: 'var(--text-3)',
        }}>
          <Avatar person={p.author} size={16} />
          <span style={{ color: 'var(--text-1)' }}>{findPerson(p.author).name.split(' ')[0]}</span>
          <span>·</span>
          <span>{p.ago}</span>
        </div>
      </div>
      <div style={{
        padding: '8px 10px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-0)',
        display: 'flex', gap: 6, alignItems: 'center',
      }}>
        <button className="btn sm ghost" style={{ height: 24, padding: '0 8px' }}>
          <Icon.Activity size={11} /><span>Activity</span>
        </button>
        <button className="btn sm ghost" style={{ height: 24, padding: '0 8px' }}>Reply</button>
        <div style={{ flex: 1 }} />
        <button className="btn sm" style={{ height: 24, padding: '0 8px' }}>
          <Icon.Check size={11} stroke={2.5} /><span>Resolve</span>
        </button>
      </div>
    </div>
  );
}

// Where to place the popover so it stays inside the stage
function popoverPosition(x, y) {
  const onRight = x < 60;
  const onTop   = y > 50;
  return {
    left:   onRight ? `calc(${x}% + 22px)` : 'auto',
    right:  onRight ? 'auto'                : `calc(${100 - x}% + 22px)`,
    top:    onTop   ? 'auto'                : `calc(${y}% - 12px)`,
    bottom: onTop   ? `calc(${100 - y}% + 12px)` : 'auto',
  };
}

// ── Floating extension toolbar ───────────────────────────────────────────
function ExtensionToolbar({ mode, setMode, pins }) {
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 25,
      display: 'flex', alignItems: 'center', gap: 4,
      padding: 5,
      background: 'rgba(14, 14, 18, 0.94)',
      backdropFilter: 'blur(16px) saturate(140%)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      boxShadow: '0 24px 60px -16px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.4)',
      color: '#F2F2F4',
    }} onClick={(e) => e.stopPropagation()}>
      <div style={{
        height: 32, padding: '0 10px 0 10px',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        borderRight: '1px solid rgba(255,255,255,0.08)',
        marginRight: 4,
      }}>
        <Icon.Brand size={18} />
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em' }}>pinLayer</span>
      </div>
      <ToolbarBtn active={mode === 'annotate'} onClick={() => setMode('annotate')}>
        <Icon.CursorPin size={12} />
        <span>Annotate</span>
        <kbd style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>A</kbd>
      </ToolbarBtn>
      <ToolbarBtn active={mode === 'view'} onClick={() => setMode('view')}>
        <Icon.Eye size={12} />
        <span>View {pins.length}</span>
        <kbd style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>V</kbd>
      </ToolbarBtn>
      <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
      <button onClick={() => setMode('off')} style={{
        height: 32, padding: '0 10px',
        color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500,
        background: 'transparent', borderRadius: 7, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        <Icon.X size={11} />
        <span>Close</span>
      </button>
    </div>
  );
}

function ToolbarBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      height: 32, padding: '0 12px',
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? '#fff' : 'rgba(255,255,255,0.78)',
      fontSize: 12, fontWeight: 500,
      borderRadius: 7,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      cursor: 'pointer',
      transition: 'background 140ms',
      boxShadow: active ? '0 1px 0 rgba(255,255,255,0.15) inset' : 'none',
      whiteSpace: 'nowrap',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      {children}
    </button>
  );
}

// ── Screenshot snip overlay ──────────────────────────────────────────────
function SnipOverlay({ stageRef, onCapture, onCancel }) {
  const [start, setStart] = React.useState(null);
  const [end, setEnd] = React.useState(null);
  const [pendingRegion, setPendingRegion] = React.useState(null); // region awaiting save
  const [markup, setMarkup] = React.useState([]);
  const [tool, setTool] = React.useState('rect'); // rect | arrow | text | blur
  const overlayRef = React.useRef(null);

  const toPct = (e) => {
    const r = overlayRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width)  * 100,
      y: ((e.clientY - r.top)  / r.height) * 100,
    };
  };

  // Drag selection phase
  const onDown = (e) => {
    if (pendingRegion) return; // markup phase
    e.stopPropagation();
    setStart(toPct(e));
    setEnd(toPct(e));
  };
  const onMove = (e) => {
    if (pendingRegion || !start) return;
    setEnd(toPct(e));
  };
  const onUp = (e) => {
    if (pendingRegion || !start || !end) return;
    e.stopPropagation();
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    if (w < 2 || h < 2) { setStart(null); setEnd(null); return; }
    setPendingRegion({ x, y, w, h });
  };

  // Markup phase — draw a shape inside the captured region
  const [drawStart, setDrawStart] = React.useState(null);
  const onMarkupDown = (e) => {
    e.stopPropagation();
    setDrawStart(toPct(e));
  };
  const onMarkupMove = (e) => {
    if (!drawStart) return;
    // could show preview; keeping minimal
  };
  const onMarkupUp = (e) => {
    if (!drawStart) return;
    const a = drawStart;
    const b = toPct(e);
    setDrawStart(null);
    // Convert page-space coords to region-local 0–100%
    const r = pendingRegion;
    const toLocal = (p) => ({
      x: ((p.x - r.x) / r.w) * 100,
      y: ((p.y - r.y) / r.h) * 100,
    });
    const la = toLocal(a);
    const lb = toLocal(b);
    if (tool === 'rect' || tool === 'blur') {
      const x = Math.min(la.x, lb.x);
      const y = Math.min(la.y, lb.y);
      const w = Math.abs(lb.x - la.x);
      const h = Math.abs(lb.y - la.y);
      if (w < 3 || h < 3) return;
      setMarkup([...markup, { kind: tool, x, y, w, h, id: Date.now() }]);
    } else if (tool === 'arrow') {
      setMarkup([...markup, { kind: 'arrow', x1: la.x, y1: la.y, x2: lb.x, y2: lb.y, id: Date.now() }]);
    } else if (tool === 'text') {
      setMarkup([...markup, { kind: 'text', x: la.x, y: la.y, label: 'Comment…', id: Date.now() }]);
    }
  };

  const undo = () => setMarkup(markup.slice(0, -1));
  const save = () => onCapture(pendingRegion, markup);

  const dragRect = start && end ? {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  } : null;

  const region = pendingRegion || dragRect;
  const px = (n) => `${n}%`;

  return (
    <div ref={overlayRef}
      onMouseDown={pendingRegion ? onMarkupDown : onDown}
      onMouseMove={pendingRegion ? onMarkupMove : onMove}
      onMouseUp={pendingRegion ? onMarkupUp : onUp}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', inset: 0, zIndex: 60,
        cursor: pendingRegion ? 'crosshair' : 'crosshair',
        userSelect: 'none',
      }}>
      {/* Dim the page outside the selection */}
      {region ? (
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <defs>
            <mask id="snipMask">
              <rect width="100%" height="100%" fill="white" />
              <rect x={px(region.x)} y={px(region.y)} width={px(region.w)} height={px(region.h)} fill="black" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(8, 8, 12, 0.55)" mask="url(#snipMask)" />
          <rect x={px(region.x)} y={px(region.y)} width={px(region.w)} height={px(region.h)}
            fill="none" stroke="var(--accent)" strokeWidth="1.5"
            strokeDasharray={pendingRegion ? '0' : '6 4'} />
        </svg>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8, 8, 12, 0.18)', pointerEvents: 'none' }} />
      )}

      {/* Hint banner — only before selection */}
      {!region && (
        <div style={{
          position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 14px',
          background: 'var(--bg-1)',
          color: 'var(--text-0)',
          fontSize: 12, fontWeight: 500,
          border: '1px solid var(--border-strong)',
          borderRadius: 999,
          boxShadow: 'var(--shadow-pop)',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          pointerEvents: 'none',
        }}>
          <Icon.Camera size={13} stroke={1.8} style={{ color: 'var(--accent)' }} />
          <span>Drag to capture a region</span>
          <kbd>Esc</kbd>
        </div>
      )}

      {/* Live size badge while dragging */}
      {dragRect && !pendingRegion && (
        <div style={{
          position: 'absolute',
          left: px(dragRect.x + dragRect.w),
          top: px(dragRect.y + dragRect.h),
          transform: 'translate(8px, 8px)',
          padding: '3px 7px', borderRadius: 4,
          background: 'var(--accent)', color: '#fff',
          fontSize: 10.5, fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          pointerEvents: 'none',
          boxShadow: '0 4px 12px -2px rgba(0,0,0,0.4)',
        }}>{Math.round(dragRect.w * 12)} × {Math.round(dragRect.h * 8)}</div>
      )}

      {/* Markup rendered inside the region */}
      {pendingRegion && (
        <div style={{
          position: 'absolute',
          left: px(pendingRegion.x), top: px(pendingRegion.y),
          width: px(pendingRegion.w), height: px(pendingRegion.h),
          pointerEvents: 'none',
        }}>
          <MarkupLayer markup={markup} />
        </div>
      )}

      {/* Markup toolbar — appears after region is set */}
      {pendingRegion && (
        <div style={{
          position: 'absolute',
          left: '50%', transform: 'translateX(-50%)',
          top: Math.min(95, pendingRegion.y + pendingRegion.h + 1.5) + '%',
          marginTop: 8,
          display: 'flex', alignItems: 'center', gap: 4,
          padding: 5,
          background: 'var(--bg-1)',
          border: '1px solid var(--border-strong)',
          borderRadius: 10,
          boxShadow: 'var(--shadow-pop)',
          zIndex: 1,
        }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
          {[
            { id: 'rect',  I: Icon.Rectangle, tip: 'Rectangle' },
            { id: 'arrow', I: Icon.Arrow,     tip: 'Arrow' },
            { id: 'text',  I: Icon.TextT,     tip: 'Text' },
            { id: 'blur',  I: Icon.Blur,      tip: 'Blur' },
          ].map(t => (
            <button key={t.id} data-tip={t.tip} onClick={() => setTool(t.id)} style={{
              width: 28, height: 28, borderRadius: 6,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: tool === t.id ? 'var(--accent-soft)' : 'transparent',
              color: tool === t.id ? 'var(--accent)' : 'var(--text-1)',
              border: tool === t.id ? '1px solid color-mix(in oklab, var(--accent) 30%, transparent)' : '1px solid transparent',
              cursor: 'pointer',
            }}><t.I size={13} /></button>
          ))}
          <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />
          <button data-tip="Undo" onClick={undo} disabled={!markup.length} style={{
            width: 28, height: 28, borderRadius: 6, cursor: markup.length ? 'pointer' : 'not-allowed',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-2)', opacity: markup.length ? 1 : 0.4,
          }}><Icon.Undo size={13} /></button>
          <button onClick={onCancel} style={{
            height: 28, padding: '0 10px',
            fontSize: 12, color: 'var(--text-2)', cursor: 'pointer',
            borderRadius: 6,
          }}>Cancel</button>
          <button onClick={save} className="btn primary sm" style={{ height: 28 }}>
            <Icon.Check size={11} stroke={2.5} />
            <span>Attach</span>
          </button>
        </div>
      )}
    </div>
  );
}

// SVG layer that renders markup shapes inside a frame (0–100% coords)
function MarkupLayer({ markup }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#EF4444" />
        </marker>
      </defs>
      {markup.map(m => {
        if (m.kind === 'rect') {
          return <rect key={m.id} x={m.x} y={m.y} width={m.w} height={m.h}
            fill="rgba(239, 68, 68, 0.10)" stroke="#EF4444" strokeWidth="0.6"
            vectorEffect="non-scaling-stroke" />;
        }
        if (m.kind === 'blur') {
          return <rect key={m.id} x={m.x} y={m.y} width={m.w} height={m.h}
            fill="rgba(20, 20, 25, 0.85)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.4"
            vectorEffect="non-scaling-stroke" />;
        }
        if (m.kind === 'arrow') {
          return <line key={m.id} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2}
            stroke="#EF4444" strokeWidth="0.8" strokeLinecap="round"
            markerEnd="url(#ah)" vectorEffect="non-scaling-stroke" />;
        }
        if (m.kind === 'text') {
          return (
            <g key={m.id}>
              <rect x={m.x - 0.5} y={m.y - 4} width={Math.max(20, (m.label?.length || 0) * 1.4)} height="6"
                fill="#EF4444" rx="1" vectorEffect="non-scaling-stroke" />
              <text x={m.x + 1} y={m.y + 0.5} fill="#fff" style={{ font: '600 4px var(--font-sans, sans-serif)' }}>
                {m.label}
              </text>
            </g>
          );
        }
        return null;
      })}
    </svg>
  );
}

// ── Recording widget — floating pill, real timer ─────────────────────────
function RecordingWidget({ rec, setRec, onStop }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (rec.paused) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [rec.paused, rec.startedAt]);

  const elapsedMs = rec.paused
    ? rec.accum
    : rec.accum + (now - rec.startedAt);
  const sec = Math.floor(elapsedMs / 1000);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');

  const pause = () => {
    if (rec.paused) {
      setRec({ ...rec, paused: false, startedAt: Date.now() });
    } else {
      setRec({ ...rec, paused: true, accum: rec.accum + (Date.now() - rec.startedAt) });
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
      zIndex: 70,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '5px 5px 5px 12px',
      background: 'rgba(14, 14, 18, 0.96)',
      border: '1px solid rgba(255, 90, 90, 0.4)',
      borderRadius: 999,
      boxShadow: '0 12px 30px -8px rgba(0,0,0,0.45), 0 0 0 4px rgba(239, 68, 68, 0.10)',
      color: '#F2F2F4',
      fontFamily: 'var(--font-sans)',
    }}>
      <span style={{
        width: 9, height: 9, borderRadius: 50,
        background: rec.paused ? '#888' : 'var(--sev-critical)',
        boxShadow: rec.paused ? 'none' : '0 0 0 0 rgba(239, 68, 68, 0.7)',
        animation: rec.paused ? 'none' : 'recpulse 1.2s ease-in-out infinite',
      }} />
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', opacity: 0.85 }}>
        {rec.paused ? 'PAUSED' : 'REC'}
      </span>
      <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', marginLeft: 4 }}>
        {mm}:{ss}
      </span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '0 6px' }}>·</span>
      <button data-tip={rec.paused ? 'Resume' : 'Pause'} onClick={pause} style={{
        width: 26, height: 26, borderRadius: 50,
        background: 'rgba(255,255,255,0.06)',
        color: '#fff', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {rec.paused ? <Icon.Play size={11} /> : <Icon.Pause size={11} />}
      </button>
      <button data-tip="Stop" onClick={() => onStop(Math.max(1, sec))} style={{
        width: 26, height: 26, borderRadius: 50,
        background: 'var(--sev-critical)',
        color: '#fff', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon.Stop size={10} />
      </button>

      <style>{`
        @keyframes recpulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.65); }
          50%      { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}

// ── Attachment tile (screenshot / clip) ──────────────────────────────────
function AttachmentTile({ att, editable, onRemove, onMarkup }) {
  if (att.kind === 'screenshot') return <ScreenshotTile att={att} editable={editable} onRemove={onRemove} />;
  if (att.kind === 'clip')        return <ClipTile att={att} editable={editable} onRemove={onRemove} />;
  return null;
}

function ScreenshotTile({ att, editable, onRemove }) {
  // Show a 56px tall preview with the markup layered
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: 6, borderRadius: 8,
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
    }}>
      <div style={{
        position: 'relative',
        width: 84, height: 56,
        flex: 'none',
        borderRadius: 5, overflow: 'hidden',
        background: '#FAFAF9',
        border: '1px solid var(--border-strong)',
      }}>
        {/* Mini page wireframe inside thumbnail */}
        <div style={{
          position: 'absolute', inset: 0, padding: 6,
          display: 'flex', flexDirection: 'column', gap: 3,
        }}>
          <div style={{ height: 4, width: '40%', background: '#D5D4D0', borderRadius: 2 }} />
          <div style={{ height: 3, width: '60%', background: '#E5E4DE', borderRadius: 2 }} />
          <div style={{ height: 7, marginTop: 3, background: '#E5E4DE', borderRadius: 2 }} />
          <div style={{ height: 7, background: '#E5E4DE', borderRadius: 2 }} />
          <div style={{ height: 10, marginTop: 3, background: 'linear-gradient(135deg, oklch(0.75 0.10 268), oklch(0.65 0.12 290))', borderRadius: 3 }} />
        </div>
        {/* Markup overlay */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <MarkupLayer markup={att.markup || []} />
        </div>
        {/* Indicator */}
        <div style={{
          position: 'absolute', top: 3, left: 3,
          padding: '1px 4px', borderRadius: 3,
          background: 'rgba(8, 8, 12, 0.65)',
          color: '#fff', fontSize: 8.5,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
        }}>PNG</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-0)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
          <Icon.Camera size={11} stroke={1.8} style={{ color: 'var(--accent)', flex: 'none' }} />
          <span>Screenshot</span>
          {att.markup?.length > 0 && (
            <span className="mono" style={{
              fontSize: 9.5, padding: '1px 5px', borderRadius: 3,
              background: 'var(--accent-soft)', color: 'var(--accent)',
              border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
              flex: 'none',
            }}>+{att.markup.length}</span>
          )}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {Math.round(att.region.w * 12)}×{Math.round(att.region.h * 8)} · 84 KB
        </div>
      </div>
      {editable && (
        <button data-tip="Remove" onClick={onRemove} className="btn icon sm ghost" style={{ color: 'var(--text-3)', flex: 'none' }}>
          <Icon.Trash size={11} />
        </button>
      )}
    </div>
  );
}

function ClipTile({ att, editable, onRemove }) {
  const mm = String(Math.floor(att.duration / 60)).padStart(1, '0');
  const ss = String(att.duration % 60).padStart(2, '0');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: 6, borderRadius: 8,
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
    }}>
      <div style={{
        position: 'relative',
        width: 84, height: 56,
        flex: 'none',
        borderRadius: 5, overflow: 'hidden',
        background: '#0E0E12',
        border: '1px solid var(--border-strong)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(circle at 25% 30%, rgba(139, 92, 246, 0.35), transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(99, 102, 241, 0.30), transparent 55%),
            linear-gradient(180deg, #0E0E16, #08080C)
          `,
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            width: 26, height: 26, borderRadius: 50,
            background: 'rgba(255,255,255,0.95)', color: '#0E0E12',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 14px -2px rgba(0,0,0,0.4)',
            paddingLeft: 3,
          }}><Icon.Play size={11} stroke={2} /></span>
        </div>
        <div className="mono" style={{
          position: 'absolute', bottom: 3, right: 3,
          padding: '1px 5px', borderRadius: 3,
          background: 'rgba(8, 8, 12, 0.7)',
          color: '#fff', fontSize: 9.5,
        }}>{mm}:{ss}</div>
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: 2, background: 'rgba(255,255,255,0.1)',
        }}>
          <div style={{ height: '100%', width: '0%', background: 'var(--accent)' }} />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-0)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
          <Icon.Video size={11} stroke={1.8} style={{ color: 'var(--accent)', flex: 'none' }} />
          <span>Screen clip</span>
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {mm}:{ss} · 1080p · webm
        </div>
      </div>
      {editable && (
        <button data-tip="Remove" onClick={onRemove} className="btn icon sm ghost" style={{ color: 'var(--text-3)', flex: 'none' }}>
          <Icon.Trash size={11} />
        </button>
      )}
    </div>
  );
}

window.Demo = Demo;
