/* =========================================
   NETPULSE — app.js
   Router Dashboard Logic
   ========================================= */

// ── LIVE CLOCK ──────────────────────────
function updateClock() {
  const el = document.getElementById('live-time');
  if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// ── DATA ────────────────────────────────
const USERS = [
  { name: 'MacBook-Valentine',  ip: '192.168.1.102', mac: 'A4:83:E7:2B:..', bw: 84,  used: 6.2, type: 'WiFi 6', signal: 92 },
  { name: 'iPhone-15-Pro',      ip: '192.168.1.104', mac: 'B2:C1:F3:44:..', bw: 32,  used: 1.8, type: 'WiFi 6', signal: 87 },
  { name: 'DESKTOP-GAMING',     ip: '192.168.1.101', mac: 'C0:FF:EE:08:..', bw: 72,  used: 5.1, type: 'LAN',    signal: 100},
  { name: 'SmartTV-LG-OLED',    ip: '192.168.1.110', mac: 'D8:A2:5E:91:..', bw: 28,  used: 3.7, type: 'WiFi 5', signal: 74 },
  { name: 'iPad-Air',           ip: '192.168.1.115', mac: 'E3:7A:BC:22:..', bw: 12,  used: 0.9, type: 'WiFi 5', signal: 81 },
  { name: 'PS5',                ip: '192.168.1.108', mac: 'F0:1D:BC:77:..', bw: 9,   used: 0.6, type: 'LAN',    signal: 100},
  { name: 'Nest-Hub-Max',       ip: '192.168.1.120', mac: 'A1:B3:C4:55:..', bw: 4,   used: 0.2, type: 'WiFi 5', signal: 68 },
  { name: 'Unknown-Device',     ip: '192.168.1.199', mac: '?:?:?:?',        bw: 6,   used: 0.1, type: 'WiFi 4', signal: 44 },
];

const TOP_SITES = [
  { name: 'youtube.com',   hits: 2840 },
  { name: 'netflix.com',   hits: 1920 },
  { name: 'github.com',    hits: 1340 },
  { name: 'twitch.tv',     hits: 980  },
  { name: 'discord.com',   hits: 870  },
  { name: 'spotify.com',   hits: 640  },
  { name: 'reddit.com',    hits: 510  },
];

const THREATS = [
  { icon: '⚠', name: 'Malware endpoint blocked',  count: 14 },
  { icon: '⛔', name: 'Ads / trackers filtered',   count: 327 },
  { icon: '🔒', name: 'Phishing domain blocked',   count: 3  },
  { icon: '⚡', name: 'Port scan detected',        count: 2  },
];

// Bandwidth over 24h (hourly Mbps)
const BW_LABELS = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);
const BW_DATA   = [18,12,8,6,5,7,22,65,148,210,247,289,312,298,271,245,260,278,302,380,412,350,290,247];

// ── RENDER USERS ────────────────────────
function renderUsers() {
  const list = document.getElementById('user-list');
  const maxBw = Math.max(...USERS.map(u => u.bw));

  list.innerHTML = USERS.map(u => {
    const pct = Math.round((u.bw / maxBw) * 100);
    const nameColor = u.name.includes('Unknown') ? 'accent-red' : 'user-name';
    const signalColor = u.signal > 80 ? '#00ff88' : u.signal > 60 ? '#ffd000' : '#ff3c5a';
    return `
      <div class="user-card">
        <div class="user-top">
          <span class="${nameColor}">${u.name}</span>
          <span class="user-bw">${u.bw} Mbps</span>
        </div>
        <div class="user-bar-bg">
          <div class="user-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="user-meta">
          <span>${u.ip}</span>
          <span>|</span>
          <span class="user-type">${u.type}</span>
          <span>|</span>
          <span style="color:${signalColor}">${u.signal === 100 ? 'Wired' : u.signal+'%'}</span>
          <span>|</span>
          <span>${u.used} GB</span>
        </div>
      </div>`;
  }).join('');
}

// ── RENDER THREATS ───────────────────────
function renderThreats() {
  const list = document.getElementById('threat-list');
  list.innerHTML = THREATS.map(t => `
    <div class="threat-item">
      <span class="threat-icon">${t.icon}</span>
      <span class="threat-name">${t.name}</span>
      <span class="threat-count">×${t.count}</span>
    </div>`).join('');
}

// ── CHARTS ──────────────────────────────
const CHART_DEFAULTS = {
  color: '#3a5568',
  borderColor: '#0e2236',
};

Chart.defaults.color = '#3a5568';
Chart.defaults.font.family = "'JetBrains Mono', monospace";
Chart.defaults.font.size = 10;

// Bandwidth line chart
function initBandwidthChart() {
  const ctx = document.getElementById('bandwidthChart').getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 180);
  gradient.addColorStop(0, 'rgba(0,212,255,0.3)');
  gradient.addColorStop(1, 'rgba(0,212,255,0)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: BW_LABELS,
      datasets: [{
        label: 'Mbps',
        data: BW_DATA,
        borderColor: '#00d4ff',
        borderWidth: 2,
        backgroundColor: gradient,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#00d4ff',
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 1200, easing: 'easeInOutQuart' },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: 'rgba(14,34,54,0.8)', drawTicks: false },
          ticks: { maxTicksLimit: 8, color: '#3a5568' },
          border: { color: '#0e2236' },
        },
        y: {
          grid: { color: 'rgba(14,34,54,0.8)', drawTicks: false },
          ticks: { color: '#3a5568', callback: v => v + ' M' },
          border: { color: '#0e2236' },
        }
      }
    }
  });
}

// Top sites bar chart
function initSitesChart() {
  const ctx = document.getElementById('sitesChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: TOP_SITES.map(s => s.name),
      datasets: [{
        label: 'Requests',
        data: TOP_SITES.map(s => s.hits),
        backgroundColor: [
          'rgba(0,255,136,0.7)', 'rgba(0,212,255,0.7)', 'rgba(255,208,0,0.7)',
          'rgba(217,79,255,0.7)','rgba(255,60,90,0.7)', 'rgba(26,140,255,0.7)',
          'rgba(0,255,136,0.4)',
        ],
        borderWidth: 0,
        borderRadius: 3,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: true,
      animation: { duration: 1000 },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(14,34,54,0.8)' }, ticks: { color: '#3a5568' }, border: { color: '#0e2236' } },
        y: { grid: { display: false }, ticks: { color: '#c8dde8', font: { size: 9 } }, border: { color: '#0e2236' } }
      }
    }
  });
}

// Data per user doughnut
function initUserDataChart() {
  const ctx = document.getElementById('userDataChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: USERS.map(u => u.name.split('-').slice(0,2).join('-')),
      datasets: [{
        data: USERS.map(u => u.used),
        backgroundColor: [
          '#00ff88','#00d4ff','#ffd000','#d94fff',
          '#ff3c5a','#1a8cff','#00ff8899','#ff3c5a55'
        ],
        borderWidth: 1,
        borderColor: '#070d12',
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      cutout: '65%',
      animation: { duration: 1200, animateRotate: true },
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#3a5568', font: { size: 8 }, boxWidth: 8, padding: 6 }
        }
      }
    }
  });
}

// Protocol split pie chart
function initProtocolChart() {
  const ctx = document.getElementById('protocolChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['HTTPS','HTTP','DNS','UDP/Gaming','Other'],
      datasets: [{
        data: [62, 8, 14, 11, 5],
        backgroundColor: ['#00d4ff','#ffd000','#d94fff','#00ff88','#3a5568'],
        borderWidth: 1,
        borderColor: '#070d12',
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      cutout: '65%',
      animation: { duration: 1200 },
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#3a5568', font: { size: 8 }, boxWidth: 8, padding: 6 }
        }
      }
    }
  });
}

// ── TERMINAL LOG ─────────────────────────
const TERMINAL_LINES = [
  { type: 'cmd',  prompt: 'root@router:~#', text: 'netpulse --start --daemon' },
  { type: 'ok',   text: '[  OK  ] NetPulse daemon started (PID 1842)' },
  { type: 'cmd',  prompt: 'root@router:~#', text: 'ip route show default' },
  { type: 'out',  text: 'default via 10.0.0.1 dev eth0 proto dhcp src 10.0.0.5 metric 100' },
  { type: 'cmd',  prompt: 'root@router:~#', text: 'arp -a | grep -c "192.168"' },
  { type: 'out',  text: '8' },
  { type: 'cmd',  prompt: 'root@router:~#', text: 'nmap -sn 192.168.1.0/24' },
  { type: 'ok',   text: 'Host: 192.168.1.101  Status: Up' },
  { type: 'ok',   text: 'Host: 192.168.1.102  Status: Up' },
  { type: 'ok',   text: 'Host: 192.168.1.104  Status: Up' },
  { type: 'warn', text: 'Host: 192.168.1.199  Status: Up [UNKNOWN MAC]' },
  { type: 'cmd',  prompt: 'root@router:~#', text: 'vnstat -i eth0 --oneline' },
  { type: 'out',  text: 'eth0;2024;Apr;312.1 GiB;18.4 GiB;247 Mbit/s' },
  { type: 'cmd',  prompt: 'root@router:~#', text: 'cat /proc/net/dev | awk \'{print $1, $2}\''},
  { type: 'out',  text: 'eth0: 247398201 bytes RX' },
  { type: 'cmd',  prompt: 'root@router:~#', text: 'pihole -c -e' },
  { type: 'ok',   text: 'Blocklist active: 327 ads blocked today' },
  { type: 'warn', text: 'Phishing attempt blocked: malware-cdn.ru' },
  { type: 'err',  text: 'Port scan detected from 192.168.1.199 → ALERT' },
  { type: 'info', text: '[FIREWALL] Rule applied: DROP 192.168.1.199:4444' },
  { type: 'cmd',  prompt: 'root@router:~#', text: 'uptime -p' },
  { type: 'out',  text: 'up 14 days, 6 hours, 33 minutes' },
  { type: 'cmd',  prompt: 'root@router:~#', text: 'watch -n 5 netpulse --live' },
  { type: 'ok',   text: 'Monitoring active. Refresh every 5s...' },
];

let lineIndex = 0;
let charIndex = 0;
let isTypingCmd = false;
let currentLineEl = null;

function getTerminalClass(type) {
  return { cmd:'t-cmd', ok:'t-ok', out:'t-out', warn:'t-warn', err:'t-err', info:'t-info' }[type] || 't-out';
}

function appendTerminalLine(line) {
  const log = document.getElementById('terminal-log');

  // Remove previous cursor
  const oldCursor = log.querySelector('.cursor');
  if (oldCursor) oldCursor.remove();

  const div = document.createElement('div');
  div.className = 't-line visible';

  if (line.type === 'cmd') {
    div.innerHTML = `<span class="t-prompt">${line.prompt}</span><span class="t-cmd" id="typing-target"></span>`;
    log.appendChild(div);
    typeText(document.getElementById('typing-target'), line.text, () => {
      addCursor(log);
      scheduleNextLine();
    });
  } else {
    div.innerHTML = `<span class="${getTerminalClass(line.type)}">${line.text}</span>`;
    log.appendChild(div);
    addCursor(log);
    scheduleNextLine();
  }

  log.scrollTop = log.scrollHeight;
}

function addCursor(log) {
  const span = document.createElement('span');
  span.className = 'cursor';
  log.appendChild(span);
}

function typeText(el, text, done) {
  let i = 0;
  const speed = () => 28 + Math.random() * 40;
  function tick() {
    el.textContent += text[i++];
    if (i < text.length) setTimeout(tick, speed());
    else done();
  }
  tick();
}

function scheduleNextLine() {
  lineIndex++;
  if (lineIndex >= TERMINAL_LINES.length) {
    // Loop back after a pause
    setTimeout(() => {
      const log = document.getElementById('terminal-log');
      log.innerHTML = '';
      lineIndex = 0;
      scheduleNextLine();
    }, 6000);
    return;
  }
  const line = TERMINAL_LINES[lineIndex];
  const delay = line.type === 'cmd' ? 900 : 200;
  setTimeout(() => appendTerminalLine(line), delay);
}

// ── LIVE STAT UPDATES ────────────────────
function jitter(val, range) {
  return Math.max(0, val + (Math.random() - 0.5) * range);
}

function updateStats() {
  const bw = Math.round(jitter(247, 60));
  document.getElementById('stat-bw').innerHTML = `${bw} <span class="stat-unit">Mbps</span>`;
  const devices = USERS.length;
  document.getElementById('stat-devices').textContent = devices;
}
setInterval(updateStats, 4000);

// ── INIT ─────────────────────────────────
function init() {
  renderUsers();
  renderThreats();
  initBandwidthChart();
  initSitesChart();
  initUserDataChart();
  initProtocolChart();

  // Kick off terminal
  setTimeout(() => appendTerminalLine(TERMINAL_LINES[0]), 400);
}

document.addEventListener('DOMContentLoaded', init);
