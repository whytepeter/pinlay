// Hand-rolled lucide-style icons (1.5px stroke), uniform 16px viewBox
const _I = ({ children, size = 16, stroke = 1.5, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
    strokeLinejoin="round" {...rest}>{children}</svg>
);

const Icon = {
  // The pinLayer mark: a precision pin (target + drop)
  Brand: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="pl-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-hover)" />
        </linearGradient>
      </defs>
      <path d="M14 3.5 C8.7 3.5 4.5 7.7 4.5 13 c0 6.8 7.6 11.4 9 11.9 .2.07.4.07.6 0 1.4-.5 9-5.1 9-11.9 0-5.3-4.2-9.5-9.1-9.5z" fill="url(#pl-g)" stroke="none"/>
      <circle cx="14" cy="13" r="3.4" fill="#0A0A0B"/>
      <circle cx="14" cy="13" r="1.2" fill="var(--accent)"/>
    </svg>
  ),
  Pin: (p) => <_I {...p}><path d="M12 2 C8 2 5 5 5 9 c0 5.5 7 12 7 12 s7-6.5 7-12 c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></_I>,
  Layers: (p) => <_I {...p}><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 14l9 5 9-5"/><path d="M3 19l9 5 9-5"/></_I>,
  Home: (p) => <_I {...p}><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/></_I>,
  Board: (p) => <_I {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M9 9v11"/></_I>,
  Team: (p) => <_I {...p}><circle cx="9" cy="9" r="3.2"/><path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="8" r="2.5"/><path d="M16 19c0-2.5 1.5-4.5 4-5"/></_I>,
  Plug: (p) => <_I {...p}><path d="M9 2v6"/><path d="M15 2v6"/><path d="M7 8h10v4a5 5 0 0 1-10 0V8z"/><path d="M12 17v5"/></_I>,
  Settings: (p) => <_I {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></_I>,
  Search: (p) => <_I {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></_I>,
  Plus: (p) => <_I {...p}><path d="M12 5v14M5 12h14"/></_I>,
  Filter: (p) => <_I {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></_I>,
  Sort: (p) => <_I {...p}><path d="M7 3v18M3 7l4-4 4 4"/><path d="M17 21V3M21 17l-4 4-4-4"/></_I>,
  Grid: (p) => <_I {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></_I>,
  List: (p) => <_I {...p}><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></_I>,
  Chevron: (p) => <_I {...p}><path d="m9 6 6 6-6 6"/></_I>,
  ChevronDown: (p) => <_I {...p}><path d="m6 9 6 6 6-6"/></_I>,
  ArrowRight: (p) => <_I {...p}><path d="M5 12h14M13 5l7 7-7 7"/></_I>,
  ArrowLeft: (p) => <_I {...p}><path d="M19 12H5M11 5l-7 7 7 7"/></_I>,
  Check: (p) => <_I {...p}><path d="m5 12 5 5 9-11"/></_I>,
  X: (p) => <_I {...p}><path d="M6 6l12 12M18 6 6 18"/></_I>,
  More: (p) => <_I {...p}><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></_I>,
  ExternalLink: (p) => <_I {...p}><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 13v7H4V5h7"/></_I>,
  Bell: (p) => <_I {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8z"/><path d="M10 21a2 2 0 0 0 4 0"/></_I>,
  Link: (p) => <_I {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></_I>,
  Image: (p) => <_I {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m21 15-5-5L5 21"/></_I>,
  Code: (p) => <_I {...p}><path d="m8 6-6 6 6 6"/><path d="m16 6 6 6-6 6"/></_I>,
  Eye: (p) => <_I {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></_I>,
  Warning: (p) => <_I {...p}><path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5"/><circle cx="12" cy="18" r=".5" fill="currentColor"/></_I>,
  Bolt: (p) => <_I {...p}><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></_I>,
  CursorPin: (p) => <_I {...p}><path d="M5 4l5 16 2.5-6 6-2.5z"/><path d="M14 14l5 5"/></_I>,
  Globe: (p) => <_I {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></_I>,
  Sync: (p) => <_I {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></_I>,
  Copy: (p) => <_I {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></_I>,
  Star: (p) => <_I {...p}><path d="m12 3 2.8 6 6.2.9-4.5 4.4 1 6.7L12 17.8 6.5 21l1-6.7L3 9.9 9.2 9z"/></_I>,
  Activity: (p) => <_I {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></_I>,
  Send: (p) => <_I {...p}><path d="m22 2-7 20-4-9-9-4 20-7z"/></_I>,
  Cmd: (p) => <_I {...p}><path d="M9 6V4.5A2.5 2.5 0 1 1 11.5 7H9zm0 0v12m0-12h6m0 0V4.5A2.5 2.5 0 1 0 12.5 7H15zm0 0v12m0 0V16.5A2.5 2.5 0 0 0 17.5 14V14m-8.5 4.5A2.5 2.5 0 1 1 6.5 16H9v2.5z"/></_I>,
  Sun: (p) => <_I {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></_I>,
  Moon: (p) => <_I {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></_I>,
  Camera: (p) => <_I {...p}><path d="M3 7h3l2-3h8l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/></_I>,
  Video: (p) => <_I {...p}><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8.5 16 12l6 3.5z"/></_I>,
  Mic: (p) => <_I {...p}><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 11v1a7 7 0 0 1-14 0v-1M12 19v3"/></_I>,
  Stop: (p) => <_I {...p}><rect x="6" y="6" width="12" height="12" rx="1.5"/></_I>,
  Pause: (p) => <_I {...p}><rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/></_I>,
  Play: (p) => <_I {...p}><path d="M7 5v14l12-7z"/></_I>,
  Rectangle: (p) => <_I {...p}><rect x="4" y="6" width="16" height="12" rx="1"/></_I>,
  Arrow: (p) => <_I {...p}><path d="M5 19 19 5M19 9V5h-4"/></_I>,
  TextT: (p) => <_I {...p}><path d="M5 5h14M12 5v14"/></_I>,
  Blur: (p) => <_I {...p}><circle cx="6" cy="6" r="1.2"/><circle cx="12" cy="6" r="1.2"/><circle cx="18" cy="6" r="1.2"/><circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/><circle cx="6" cy="18" r="1.2"/><circle cx="12" cy="18" r="1.2"/><circle cx="18" cy="18" r="1.2"/></_I>,
  Undo: (p) => <_I {...p}><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 1 1 0 10h-2"/></_I>,
  Trash: (p) => <_I {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></_I>,
};

window.Icon = Icon;
