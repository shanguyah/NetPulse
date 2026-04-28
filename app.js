/* =========================================
   NETPULSE v3 — app.js
   =========================================
   Data source: ./nodes.json (demo)
   Live mode:   http://127.0.0.1:5000/api/nodes
   Toggle:      set USE_LIVE_API = true
   ========================================= */

const USE_LIVE_API    = false;
const API_URL         = 'http://127.0.0.1:5000/api/nodes';
const STATIC_URL      = './nodes.json';
const REFRESH_INTERVAL = 30; // seconds

// ── GLOBAL STATE ─────────────────────────
let allNodes        = [];
let selectedNode    = null;
let refreshTimer    = REFRESH_INTERVAL;
let refreshInterval = null;
let countdownInterval= null;

// ── CLOCK ────────────────────────────────
function updateClock() {
  const el = document.getElementById('live-time');
  if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// ── TABS ─────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'terminal') {
      document.getElementById('ft-input').focus();
    }
  });
});

// ── FETCH NODES ───────────────────────────
async function fetchNodes() {
  const url = USE_LIVE_API ? API_URL : STATIC_URL;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    allNodes = data;
    setConnectionStatus(true);
    return data;
  } catch (err) {
    setConnectionStatus(false);
    logTerminal('err', `fetch failed: ${err.message}`);
    return allNodes.length ? allNodes : getFallbackNodes();
  }
}

function setConnectionStatus(online) {
  const dot   = document.getElementById('conn-dot');
  const label = document.getElementById('conn-label');
  if (online) {
    dot.className   = 'status-dot pulse';
    label.textContent = 'ONLINE';
    label.className   = 'status-text accent-green';
  } else {
    dot.className   = 'status-dot offline';
    label.textContent = 'OFFLINE';
    label.className   = 'status-text accent-red';
  }
}

// ── AUTO REFRESH ──────────────────────────
function startRefreshCycle() {
  refreshTimer = REFRESH_INTERVAL;
  clearInterval(refreshInterval);
  clearInterval(countdownInterval);

  refreshInterval = setInterval(async () => {
    logTerminal('cmd', `netpulse --refresh --interval=${REFRESH_INTERVAL}s`);
    const nodes = await fetchNodes();
    renderAll(nodes);
    refreshTimer = REFRESH_INTERVAL;
  }, REFRESH_INTERVAL * 1000);

  countdownInterval = setInterval(() => {
    refreshTimer = Math.max(0, refreshTimer - 1);
    const el = document.getElementById('refresh-countdown');
    if (el) el.textContent = `↻ ${refreshTimer}s`;
  }, 1000);
}

// ── RENDER ALL ────────────────────────────
function renderAll(nodes) {
  renderDashboard(nodes);
  renderTopology(nodes);
}

// ════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════

const USERS = [
  { name:'MacBook-Valentine',  ip:'192.168.1.102', mac:'A4:83:E7:2B:..', bw:84,  used:6.2, type:'WiFi 6', signal:92 },
  { name:'iPhone-15-Pro',      ip:'192.168.1.104', mac:'B2:C1:F3:44:..', bw:32,  used:1.8, type:'WiFi 6', signal:87 },
  { name:'DESKTOP-GAMING',     ip:'192.168.1.101', mac:'C0:FF:EE:08:..', bw:72,  used:5.1, type:'LAN',    signal:100},
  { name:'SmartTV-LG-OLED',    ip:'192.168.1.110', mac:'D8:A2:5E:91:..', bw:28,  used:3.7, type:'WiFi 5', signal:74 },
  { name:'iPad-Air',           ip:'192.168.1.115', mac:'E3:7A:BC:22:..', bw:12,  used:0.9, type:'WiFi 5', signal:81 },
  { name:'PS5',                ip:'192.168.1.108', mac:'F0:1D:BC:77:..', bw:9,   used:0.6, type:'LAN',    signal:100},
  { name:'Nest-Hub-Max',       ip:'192.168.1.120', mac:'A1:B3:C4:55:..', bw:4,   used:0.2, type:'WiFi 5', signal:68 },
  { name:'Unknown-Device',     ip:'192.168.1.199', mac:'?:?:?:?',        bw:6,   used:0.1, type:'WiFi 4', signal:44 },
];

const TOP_SITES = [
  { name:'youtube.com', hits:2840 }, { name:'netflix.com', hits:1920 },
  { name:'github.com',  hits:1340 }, { name:'twitch.tv',   hits:980  },
  { name:'discord.com', hits:870  }, { name:'spotify.com', hits:640  },
  { name:'reddit.com',  hits:510  },
];

const THREATS = [
  { icon:'⚠', name:'Malware endpoint blocked',  count:14  },
  { icon:'⛔', name:'Ads / trackers filtered',   count:327 },
  { icon:'🔒', name:'Phishing domain blocked',   count:3   },
  { icon:'⚡', name:'Port scan detected',        count:2   },
];

const BW_LABELS = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);
const BW_DATA   = [18,12,8,6,5,7,22,65,148,210,247,289,312,298,271,245,260,278,302,380,412,350,290,247];

let chartsInitialized = false;

function renderDashboard(nodes) {
  // Stat cards from live nodes
  const total  = nodes.length;
  const avgSec = Math.round(nodes.reduce((s,n) => s + n.security_score, 0) / (total || 1));
  const threatened = nodes.filter(n => n.security_score < 50).length;

  document.getElementById('stat-devices').textContent = total || USERS.length;
  document.getElementById('stat-devices-sub').textContent = `${total} nodes detected`;
  document.getElementById('stat-health').textContent = avgSec + '%';
  document.getElementById('stat-health').className   = 'stat-value ' + scoreClass(avgSec);
  document.getElementById('stat-health-sub').textContent = `${threatened} node(s) at risk`;

  // Users
  renderUsers();
  renderThreats();

  // Charts only once
  if (!chartsInitialized) {
    initCharts();
    chartsInitialized = true;
  }
}

function renderUsers() {
  const list  = document.getElementById('user-list');
  const maxBw = Math.max(...USERS.map(u => u.bw));
  document.getElementById('user-count').textContent = USERS.length + ' ACTIVE';

  list.innerHTML = USERS.map(u => {
    const pct = Math.round((u.bw / maxBw) * 100);
    const nameClass = u.name.includes('Unknown') ? 'accent-red' : 'user-name';
    const sigColor  = u.signal > 80 ? 'var(--green)' : u.signal > 60 ? 'var(--yellow)' : 'var(--red)';
    return `<div class="user-card">
      <div class="user-top">
        <span class="${nameClass}">${u.name}</span>
        <span class="user-bw">${u.bw} Mbps</span>
      </div>
      <div class="user-bar-bg"><div class="user-bar-fill" style="width:${pct}%"></div></div>
      <div class="user-meta">
        <span>${u.ip}</span><span>|</span>
        <span class="user-type">${u.type}</span><span>|</span>
        <span style="color:${sigColor}">${u.signal===100?'Wired':u.signal+'%'}</span><span>|</span>
        <span>${u.used} GB</span>
      </div>
    </div>`;
  }).join('');
}

function renderThreats() {
  document.getElementById('threat-list').innerHTML = THREATS.map(t =>
    `<div class="threat-item">
      <span class="threat-icon">${t.icon}</span>
      <span class="threat-name">${t.name}</span>
      <span class="threat-count">×${t.count}</span>
    </div>`
  ).join('');
}

function initCharts() {
  Chart.defaults.color = '#2e4a5e';
  Chart.defaults.font.family = "'JetBrains Mono', monospace";
  Chart.defaults.font.size   = 9;

  // Bandwidth
  const bwCtx = document.getElementById('bandwidthChart').getContext('2d');
  const bwGrad = bwCtx.createLinearGradient(0,0,0,160);
  bwGrad.addColorStop(0,'rgba(0,212,255,.28)');
  bwGrad.addColorStop(1,'rgba(0,212,255,0)');
  new Chart(bwCtx, {
    type:'line',
    data: {
      labels: BW_LABELS,
      datasets:[{ label:'Mbps', data:BW_DATA, borderColor:'#00d4ff', borderWidth:1.5,
        backgroundColor:bwGrad, pointRadius:0, pointHoverRadius:4,
        pointHoverBackgroundColor:'#00d4ff', tension:.4, fill:true }]
    },
    options: chartOpts({ yCallback: v=>v+'M' })
  });

  // Sites
  new Chart(document.getElementById('sitesChart').getContext('2d'), {
    type:'bar',
    data: {
      labels: TOP_SITES.map(s=>s.name),
      datasets:[{ label:'Requests', data:TOP_SITES.map(s=>s.hits),
        backgroundColor:['rgba(0,255,136,.7)','rgba(0,212,255,.7)','rgba(255,208,0,.7)',
          'rgba(217,79,255,.7)','rgba(255,60,90,.7)','rgba(26,140,255,.7)','rgba(0,255,136,.35)'],
        borderWidth:0, borderRadius:3 }]
    },
    options: { ...chartOpts({}), indexAxis:'y' }
  });

  // User data doughnut
  new Chart(document.getElementById('userDataChart').getContext('2d'), {
    type:'doughnut',
    data: {
      labels: USERS.map(u=>u.name.split('-').slice(0,2).join('-')),
      datasets:[{ data:USERS.map(u=>u.used), borderWidth:1, borderColor:'#060c11',
        backgroundColor:['#00ff88','#00d4ff','#ffd000','#d94fff','#ff3c5a','#1a8cff','#00ff8877','#ff3c5a44'],
        hoverOffset:6 }]
    },
    options: doughnutOpts()
  });

  // Protocol doughnut
  new Chart(document.getElementById('protocolChart').getContext('2d'), {
    type:'doughnut',
    data: {
      labels:['HTTPS','HTTP','DNS','UDP/Game','Other'],
      datasets:[{ data:[62,8,14,11,5], borderWidth:1, borderColor:'#060c11',
        backgroundColor:['#00d4ff','#ffd000','#d94fff','#00ff88','#2e4a5e'],
        hoverOffset:6 }]
    },
    options: doughnutOpts()
  });
}

function chartOpts({ yCallback } = {}) {
  return {
    responsive:true, maintainAspectRatio:true, animation:{ duration:1000 },
    plugins:{ legend:{ display:false } },
    scales:{
      x:{ grid:{ color:'rgba(13,31,48,.9)', drawTicks:false }, ticks:{ maxTicksLimit:8 }, border:{ color:'#0d1f30' } },
      y:{ grid:{ color:'rgba(13,31,48,.9)', drawTicks:false }, ticks:{ callback: yCallback || (v=>v) }, border:{ color:'#0d1f30' } }
    }
  };
}

function doughnutOpts() {
  return {
    responsive:true, maintainAspectRatio:true, cutout:'65%',
    animation:{ duration:1200, animateRotate:true },
    plugins:{ legend:{ position:'right', labels:{ color:'#2e4a5e', font:{ size:8 }, boxWidth:8, padding:5 } } }
  };
}

// ════════════════════════════════════════════
//  TOPOLOGY
// ════════════════════════════════════════════

function scoreClass(s) {
  return s >= 80 ? 'score-high' : s >= 50 ? 'score-mid' : 'score-low';
}

function scoreBarColor(s) {
  return s >= 80 ? 'var(--green)' : s >= 50 ? 'var(--yellow)' : 'var(--red)';
}

function nodeIcon(n) {
  if (n.type === 'gateway') return '◈';
  if (n.type === 'router')  return '⬡';
  if (n.type === 'switch')  return '⊞';
  if (n.type === 'ap')      return '◉';
  return '◦';
}

function renderTopology(nodes) {
  const tree   = document.getElementById('topo-tree');
  const filter = (document.getElementById('topo-filter')?.value || '').toLowerCase();
  document.getElementById('topo-count').textContent = nodes.length + ' NODES';

  // Compute health summary
  const online   = nodes.filter(n => n.status === 'online').length;
  const avgSec   = Math.round(nodes.reduce((s,n)=>s+n.security_score,0)/(nodes.length||1));
  const alerts   = nodes.filter(n=>n.security_score < 50).length;
  const latency  = nodes.reduce((s,n)=>s+(n.latency||0),0);
  const avgLat   = nodes.length ? Math.round(latency/nodes.length) : 0;

  document.getElementById('health-grid').innerHTML = `
    <div class="health-cell"><div class="health-val accent-green">${online}</div><div class="health-lbl">ONLINE</div></div>
    <div class="health-cell"><div class="health-val ${scoreClass(avgSec)}">${avgSec}%</div><div class="health-lbl">AVG HEALTH</div></div>
    <div class="health-cell"><div class="health-val accent-red">${alerts}</div><div class="health-lbl">ALERTS</div></div>
    <div class="health-cell"><div class="health-val accent-cyan">${avgLat}ms</div><div class="health-lbl">AVG LATENCY</div></div>
  `;

  // Build tree
  const filtered = filter
    ? nodes.filter(n => n.name.toLowerCase().includes(filter) || n.ip.includes(filter))
    : nodes;

  // Group: parents first
  const roots    = filtered.filter(n => !n.parent_id);
  const children = filtered.filter(n =>  n.parent_id);

  tree.innerHTML = '';
  roots.forEach(n => {
    tree.appendChild(buildNodeEl(n, false));
    children.filter(c => c.parent_id === n.id).forEach(c => {
      tree.appendChild(buildNodeEl(c, true));
    });
  });
}

function buildNodeEl(node, isChild) {
  const div = document.createElement('div');
  div.className = `tree-node${isChild ? ' child' : ''}${selectedNode?.id === node.id ? ' selected' : ''}`;
  div.innerHTML = `
    <span class="node-icon">${nodeIcon(node)}</span>
    <div class="node-info">
      <div class="node-name">${node.name}</div>
      <div class="node-ip">${node.ip} · ${node.mac || '??:??:??:??'}</div>
    </div>
    <div>
      <div class="node-score ${scoreClass(node.security_score)}">${node.security_score}%</div>
      <div class="score-bar-bg">
        <div class="score-bar-fill" style="width:${node.security_score}%;background:${scoreBarColor(node.security_score)}"></div>
      </div>
    </div>`;
  div.addEventListener('click', () => selectNode(node));
  return div;
}

function selectNode(node) {
  selectedNode = node;
  renderTopology(allNodes);     // re-render tree to update selection
  renderSecurityDetail(node);
}

function renderSecurityDetail(node) {
  const panel  = document.getElementById('security-detail');
  const badge  = document.getElementById('audit-badge');
  const cls    = scoreClass(node.security_score);
  const color  = scoreBarColor(node.security_score);
  const radius = 28;
  const circ   = 2 * Math.PI * radius;
  const dash   = (node.security_score / 100) * circ;

  badge.textContent = node.name.toUpperCase();

  const flags = node.flags || generateFlags(node.security_score);

  panel.innerHTML = `
    <div class="sec-card">
      <div class="sec-card-header">
        <span class="sec-card-icon">${nodeIcon(node)}</span>
        <div>
          <div class="sec-card-name">${node.name}</div>
          <div class="sec-card-ip">${node.ip} · ${node.mac || 'unknown'} · ${node.status || 'online'}</div>
        </div>
      </div>
      <div class="sec-score-ring">
        <div class="ring-wrap">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle class="ring-bg"   cx="32" cy="32" r="${radius}"/>
            <circle class="ring-fill" cx="32" cy="32" r="${radius}"
              stroke="${color}"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${circ - dash}"/>
          </svg>
          <div class="ring-label">
            <span class="ring-pct ${cls}">${node.security_score}</span>
            <span class="ring-text">SCORE</span>
          </div>
        </div>
        <div style="font-size:10px;color:var(--dim);line-height:1.8">
          <div>Type: <span style="color:var(--white)">${node.type || 'device'}</span></div>
          <div>Latency: <span class="accent-cyan">${node.latency || '—'}ms</span></div>
          <div>Firmware: <span style="color:var(--white)">${node.firmware || 'unknown'}</span></div>
          <div>Open ports: <span class="accent-yellow">${(node.open_ports || []).join(', ') || 'none'}</span></div>
        </div>
      </div>
      <div class="sec-flags">${flags.map(f=>`
        <div class="sec-flag ${f.type}">
          <span class="sec-flag-icon">${f.type==='ok'?'✓':f.type==='warn'?'▲':'✗'}</span>
          <span class="sec-flag-text">${f.text}</span>
        </div>`).join('')}
      </div>
    </div>`;
}

function generateFlags(score) {
  const all = [
    { type:'ok',   text:'Firewall rules active' },
    { type:'ok',   text:'Firmware up to date' },
    { type:'ok',   text:'WPA3 encryption enabled' },
    { type:'ok',   text:'No suspicious traffic detected' },
    { type:'warn', text:'Default admin credentials not changed' },
    { type:'warn', text:'UPnP is enabled — consider disabling' },
    { type:'warn', text:'Remote management accessible on WAN' },
    { type:'fail', text:'Open Telnet port detected (23)' },
    { type:'fail', text:'Firmware version outdated (>90 days)' },
    { type:'fail', text:'No intrusion detection configured' },
  ];
  if (score >= 80) return all.slice(0,4);
  if (score >= 50) return [...all.slice(0,3), ...all.slice(4,6)];
  return [...all.slice(0,2), ...all.slice(4,7), ...all.slice(7,9)];
}

// Filter
document.getElementById('topo-filter')?.addEventListener('input', () => {
  if (allNodes.length) renderTopology(allNodes);
});

// Manual scan button
document.getElementById('scan-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('scan-btn');
  btn.textContent = '⟳ SCANNING...';
  btn.disabled = true;
  logTerminal('cmd', 'netpulse --scan --range=192.168.1.0/24');
  const nodes = await fetchNodes();
  renderAll(nodes);
  refreshTimer = REFRESH_INTERVAL;
  btn.textContent = '⟳ SCAN';
  btn.disabled = false;
  logTerminal('ok', `scan complete — ${nodes.length} nodes found`);
});

// ════════════════════════════════════════════
//  AUTO TERMINAL LOG (Dashboard sidebar)
// ════════════════════════════════════════════

const TERMINAL_LINES = [
  { type:'cmd',  prompt:'root@router:~#', text:'netpulse --start --daemon' },
  { type:'ok',   text:'[  OK  ] NetPulse daemon started (PID 1842)' },
  { type:'cmd',  prompt:'root@router:~#', text:'ip route show default' },
  { type:'out',  text:'default via 10.0.0.1 dev eth0 proto dhcp' },
  { type:'cmd',  prompt:'root@router:~#', text:'nmap -sn 192.168.1.0/24' },
  { type:'ok',   text:'Host 192.168.1.101 — Up [GAMING-PC]' },
  { type:'ok',   text:'Host 192.168.1.102 — Up [MacBook]' },
  { type:'warn', text:'Host 192.168.1.199 — Up [UNKNOWN MAC]' },
  { type:'cmd',  prompt:'root@router:~#', text:'vnstat -i eth0 --oneline' },
  { type:'out',  text:'eth0;2026;Apr;312.1 GiB;18.4 GiB;247 Mbit/s' },
  { type:'cmd',  prompt:'root@router:~#', text:'pihole -c -e' },
  { type:'ok',   text:'Blocklist active — 327 ads blocked today' },
  { type:'warn', text:'Phishing attempt: malware-cdn.ru → BLOCKED' },
  { type:'err',  text:'Port scan from 192.168.1.199 → FIREWALL DROP' },
  { type:'info', text:'[FIREWALL] Rule: DROP 192.168.1.199:4444' },
  { type:'cmd',  prompt:'root@router:~#', text:'uptime -p' },
  { type:'out',  text:'up 14 days, 6 hours, 33 minutes' },
  { type:'cmd',  prompt:'root@router:~#', text:'watch -n 30 netpulse --live' },
  { type:'ok',   text:'Live monitoring active. Refresh every 30s...' },
];

let tLineIdx = 0;
function logTerminal(type, text, prompt = 'root@router:~#') {
  const log = document.getElementById('terminal-log');
  if (!log) return;
  const oldCursor = log.querySelector('.cursor');
  if (oldCursor) oldCursor.remove();

  const div = document.createElement('div');
  div.className = 't-line visible';
  const cls = {cmd:'t-cmd',ok:'t-ok',out:'t-out',warn:'t-warn',err:'t-err',info:'t-info'}[type]||'t-out';

  if (type === 'cmd') {
    div.innerHTML = `<span class="t-prompt">${prompt}</span><span class="${cls}" id="ttype-${Date.now()}"></span>`;
    log.appendChild(div);
    const target = div.querySelector('[id^="ttype-"]');
    typeText(target, text, () => {
      const c = document.createElement('span'); c.className = 'cursor';
      log.appendChild(c);
    });
  } else {
    div.innerHTML = `<span class="${cls}">${text}</span>`;
    log.appendChild(div);
    const c = document.createElement('span'); c.className = 'cursor';
    log.appendChild(c);
  }
  log.scrollTop = log.scrollHeight;
}

function typeText(el, text, done) {
  let i = 0;
  const tick = () => {
    if (i < text.length) { el.textContent += text[i++]; setTimeout(tick, 25 + Math.random()*45); }
    else done();
  };
  tick();
}

function startAutoLog() {
  const line = TERMINAL_LINES[tLineIdx % TERMINAL_LINES.length];
  logTerminal(line.type, line.text, line.prompt);
  tLineIdx++;
  const delay = line.type === 'cmd' ? 1200 : 300;
  setTimeout(startAutoLog, delay);
}

// ════════════════════════════════════════════
//  INTERACTIVE TERMINAL TAB
// ════════════════════════════════════════════

const COMMANDS = {
  help: () => `
<span class="t-ok">NetPulse Shell — available commands:</span>
<span class="t-out">  scan              — scan all network nodes</span>
<span class="t-out">  nodes             — list all discovered nodes</span>
<span class="t-out">  status            — show router status</span>
<span class="t-out">  check [ip]        — security audit for IP</span>
<span class="t-out">  block [ip]        — add IP to firewall blocklist</span>
<span class="t-out">  uptime            — show router uptime</span>
<span class="t-out">  bandwidth         — current bandwidth usage</span>
<span class="t-out">  threats           — list blocked threats</span>
<span class="t-out">  clear             — clear terminal</span>
<span class="t-out">  reboot [confirm]  — reboot router (requires confirm)</span>`,

  scan: async () => {
    const nodes = await fetchNodes();
    renderAll(nodes);
    return `<span class="t-ok">scan complete — ${nodes.length} nodes discovered</span>\n` +
      nodes.map(n => `<span class="t-out">  ${n.ip.padEnd(16)} ${n.name.padEnd(22)} <span class="${scoreClass(n.security_score)}">${n.security_score}% secure</span></span>`).join('\n');
  },

  nodes: () => {
    if (!allNodes.length) return `<span class="t-warn">no nodes loaded — run scan first</span>`;
    return allNodes.map(n =>
      `<span class="t-out">  ${n.ip.padEnd(16)} ${n.name.padEnd(22)} <span class="${scoreClass(n.security_score)}">${n.security_score}%</span>  ${n.status||'online'}</span>`
    ).join('\n');
  },

  status: () => `<span class="t-ok">router status:</span>
<span class="t-out">  gateway     192.168.1.1</span>
<span class="t-out">  uptime      14d 06h 33m</span>
<span class="t-out">  bandwidth   247 Mbps (peak 412)</span>
<span class="t-out">  wan-ip      <span class="accent-cyan">41.90.x.x</span></span>
<span class="t-out">  dns         1.1.1.1, 8.8.8.8</span>
<span class="t-ok">  firewall    ACTIVE</span>`,

  uptime: () => `<span class="t-out">up 14 days, 6 hours, 33 minutes</span>`,
  bandwidth: () => `<span class="t-out">current: <span class="accent-cyan">247 Mbps</span>  peak today: <span class="accent-yellow">412 Mbps</span>  total: <span class="accent-green">18.4 GB</span></span>`,

  threats: () => THREATS.map(t =>
    `<span class="t-warn">  ${t.icon} ${t.name.padEnd(32)} ×${t.count}</span>`
  ).join('\n'),

  check: (args) => {
    const ip   = args[0];
    const node = allNodes.find(n => n.ip === ip);
    if (!ip)   return `<span class="t-err">usage: check [ip]</span>`;
    if (!node) return `<span class="t-warn">no node found for ${ip} — run scan first</span>`;
    const flags = generateFlags(node.security_score);
    return `<span class="t-ok">security audit: ${node.name} (${node.ip})</span>\n` +
      flags.map(f => `<span class="${f.type==='ok'?'t-ok':f.type==='warn'?'t-warn':'t-err'}">  ${f.type==='ok'?'✓':f.type==='warn'?'▲':'✗'} ${f.text}</span>`).join('\n') +
      `\n<span class="${scoreClass(node.security_score)}">  score: ${node.security_score}%</span>`;
  },

  block: (args) => {
    const ip = args[0];
    if (!ip) return `<span class="t-err">usage: block [ip]</span>`;
    return `<span class="t-ok">[FIREWALL] DROP rule applied for ${ip}</span>
<span class="t-warn">  iptables -A INPUT -s ${ip} -j DROP</span>
<span class="t-ok">  rule active — all traffic from ${ip} blocked</span>`;
  },

  reboot: (args) => {
    if (args[0] !== 'confirm') return `<span class="t-warn">type: reboot confirm — to proceed</span>`;
    return `<span class="t-err">rebooting router... connection will drop in 5s</span>`;
  },

  clear: () => '__CLEAR__',
};

const ftBody  = document.getElementById('ft-body');
const ftInput = document.getElementById('ft-input');

function ftPrint(html) {
  const div = document.createElement('div');
  div.className = 'ft-line';
  div.innerHTML = html;
  ftBody.appendChild(div);
  ftBody.scrollTop = ftBody.scrollHeight;
}

ftInput?.addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;
  const raw   = ftInput.value.trim();
  ftInput.value = '';
  if (!raw) return;

  ftPrint(`<span class="t-prompt">root@router:~#&nbsp;</span><span class="t-cmd">${raw}</span>`);

  const parts = raw.split(/\s+/);
  const cmd   = parts[0].toLowerCase();
  const args  = parts.slice(1);
  const fn    = COMMANDS[cmd];

  if (!fn) {
    ftPrint(`<span class="t-err">command not found: ${cmd} — type help</span>`);
  } else {
    const result = await fn(args);
    if (result === '__CLEAR__') {
      ftBody.innerHTML = '';
    } else if (result) {
      const lines = result.trim().split('\n');
      lines.forEach(line => ftPrint(`<span>${line}</span>`));
    }
  }
  ftBody.scrollTop = ftBody.scrollHeight;
});

// Print welcome banner
setTimeout(() => {
  ['<span class="t-ok">  ███╗   ██╗███████╗████████╗██████╗ ██╗   ██╗██╗     ███████╗███████╗</span>',
   '<span class="t-ok">  ████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██║   ██║██║     ██╔════╝██╔════╝</span>',
   '<span class="t-ok">  ██╔██╗ ██║█████╗     ██║   ██████╔╝██║   ██║██║     ███████╗█████╗  </span>',
   '<span class="t-ok">  ██║╚██╗██║██╔══╝     ██║   ██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  </span>',
   '<span class="t-ok">  ██║ ╚████║███████╗   ██║   ██║     ╚██████╔╝███████╗███████║███████╗</span>',
   '<span class="t-ok">  ╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝</span>',
   '<span class="t-out">  Router Management System v3.0.0 — type <span class="t-ok">help</span> for commands</span>',
   '<span class="t-out">  Connected to: <span class="accent-yellow">192.168.1.1</span>  Mode: <span class="accent-cyan">DEMO</span>  API: <span class="accent-dim">http://127.0.0.1:5000/api/nodes</span></span>',
   ''].forEach(l => ftPrint(l));
}, 200);

// ════════════════════════════════════════════
//  FALLBACK DATA (when nodes.json not found)
// ════════════════════════════════════════════

function getFallbackNodes() {
  return [
    { id:1, parent_id:null, name:'Huawei-HG8245H', ip:'192.168.1.1', mac:'A8:C0:D3:11:22:33', type:'gateway', status:'online', security_score:88, latency:2,  firmware:'V3R017', open_ports:[80,443] },
    { id:2, parent_id:1,    name:'Tenda-AC10-Main', ip:'192.168.1.2', mac:'C8:3A:35:55:44:33', type:'router',  status:'online', security_score:72, latency:5,  firmware:'V15.03.06', open_ports:[80,8080] },
    { id:3, parent_id:1,    name:'Tenda-AC10-Ext1', ip:'192.168.1.3', mac:'C8:3A:35:66:55:44', type:'router',  status:'online', security_score:58, latency:8,  firmware:'V15.03.04', open_ports:[80,23] },
    { id:4, parent_id:2,    name:'Switch-TP-Link',  ip:'192.168.1.5', mac:'50:C7:BF:12:AB:CD', type:'switch',  status:'online', security_score:91, latency:1,  firmware:'N/A',       open_ports:[] },
    { id:5, parent_id:3,    name:'AP-Ubiquiti',     ip:'192.168.1.6', mac:'80:2A:A8:78:9F:CD', type:'ap',      status:'online', security_score:43, latency:12, firmware:'5.43.23',   open_ports:[22,80,443] },
    { id:6, parent_id:1,    name:'Tenda-AC10-Ext2', ip:'192.168.1.4', mac:'C8:3A:35:77:66:55', type:'router',  status:'online', security_score:35, latency:18, firmware:'V15.02.01', open_ports:[23,80,8080,22] },
  ];
}

// ════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════

async function init() {
  const nodes = await fetchNodes();
  renderAll(nodes);
  startRefreshCycle();
  setTimeout(startAutoLog, 500);
}

document.addEventListener('DOMContentLoaded', init);
