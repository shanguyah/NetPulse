# 🖥️ NetPulse — Router Management Dashboard

> **A premium dark terminal-aesthetic router dashboard** — monitor your network in real time with live charts, connected device tracking, traffic analysis, and security threat logging.

---

## 📸 Features

| Feature | Description |
|---|---|
| 🟢 **Live Device Tracker** | See all connected devices, IPs, MAC addresses, signal strength, and current bandwidth |
| 📊 **Bandwidth Graph** | 24-hour line chart of Mbps usage across the day |
| 🌐 **Top Visited Sites** | Horizontal bar chart of most-requested domains on your network |
| 🍩 **Data Per User** | Doughnut chart showing each device's share of total data |
| 🔒 **Protocol Split** | HTTPS vs HTTP vs DNS vs Gaming vs Other traffic breakdown |
| 🛡️ **Threat Log** | Live count of blocked ads, malware, phishing domains, port scans |
| 💻 **Terminal Log** | Animated Linux-style command output with real typing effect |
| ⏱️ **Live Clock + Status** | Real-time clock and router online status indicator |

---

## 🗂️ Project Structure

```
netpulse/
├── index.html     ← Main dashboard layout
├── style.css      ← Premium dark terminal theme + responsive grid
├── app.js         ← Charts, terminal animation, live updates
└── README.md      ← You're here
```

---

## 🚀 Getting Started

### Option A — Open directly (quickest)
Just double-click `index.html` in your file manager.  
Works in any modern browser (Chrome, Firefox, Edge, Safari).

### Option B — Local dev server (recommended)
```bash
# Python 3
cd netpulse/
python3 -m http.server 8080
# → open http://localhost:8080

# OR using Node.js npx
npx serve .
```

### Option C — VS Code
Install the **Live Server** extension and click **Go Live** in the bottom bar.

---

## 🛠️ Tech Stack

| Tool | Purpose |
|---|---|
| HTML5 + CSS3 | Layout, animations, terminal effects |
| [Chart.js](https://www.chartjs.org/) | All graphs (line, bar, doughnut) |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | Terminal monospace font |
| Vanilla JS (ES6+) | No framework needed |

---

## ⚙️ Customization

### Change connected devices
Edit the `USERS` array in `app.js`:
```js
const USERS = [
  { name: 'MyLaptop', ip: '192.168.1.100', mac: 'AA:BB:CC:..', bw: 50, used: 3.2, type: 'WiFi 6', signal: 90 },
  // ...
];
```

### Change router IP displayed
In `index.html`, find:
```html
<span class="accent-yellow">192.168.1.1</span>
```
Replace with your gateway IP.

### Adjust bandwidth history
Edit `BW_DATA` in `app.js` (24 hourly Mbps values):
```js
const BW_DATA = [18, 12, 8, ..., 247]; // 24 values
```

### Add more terminal commands
Push to `TERMINAL_LINES` in `app.js`:
```js
{ type: 'cmd',  prompt: 'root@router:~#', text: 'your-command --here' },
{ type: 'ok',   text: 'Command output here' },
```
Types: `cmd` · `ok` · `out` · `warn` · `err` · `info`

---

## 🌐 Connecting to a Real Router (Advanced)

NetPulse ships with **mock data** for demo purposes.  
To wire it up to a real router, replace data sources:

| Data | Source |
|---|---|
| Connected devices | `arp -a` or router API (`/cgi-bin/luci`) |
| Bandwidth stats | `vnstat`, `ifstat`, or SNMP |
| Top sites | Pi-hole API at `http://pi.hole/api.php` |
| Threats | Pi-hole or pfSense API |

Example: pull Pi-hole stats and update chart data via `fetch()`:
```js
const res  = await fetch('http://pi.hole/api.php?summaryRaw');
const data = await res.json();
console.log(data.ads_blocked_today);
```

---

## 🎨 Aesthetic Details

- **Color palette:** Deep dark navy `#030508` + terminal green `#00ff88`, cyan `#00d4ff`, amber `#ffd000`, magenta `#d94fff`, red `#ff3c5a`
- **Grid background:** Subtle 40px dot grid with 3% opacity cyan lines
- **Scanlines overlay:** Classic CRT scanline effect via CSS `repeating-linear-gradient`
- **Typing animation:** Variable-speed character-by-character with natural jitter
- **Blinking cursor:** Step-end CSS animation matching real terminal behavior
- **Charts:** Dark-themed Chart.js with gradient fills and glow accents

---

## 📄 License

MIT — free to use, modify, and distribute.

---

> Made with 🖤 for network nerds and terminal lovers.
