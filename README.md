# 🖥️ NetPulse v3 — Router Management Dashboard

> Premium dark terminal-aesthetic router dashboard with **live network topology**, **auto-refresh scanning**, **security audits**, **interactive shell**, and an optional **Python/Scapy backend** for real router monitoring.

---

## 📸 What's New in v3

| Feature | Description |
|---|---|
| 🗂️ **3-Tab Layout** | Dashboard / Topology / Terminal — clean navigation |
| 🌐 **Topology View** | Visual node tree with parent→child hierarchy, security scores, score bars |
| 🔒 **Security Audit Panel** | Per-node radial score ring, firmware info, open ports, flag checklist |
| 💻 **Interactive Terminal** | Full shell with `scan`, `nodes`, `check [ip]`, `block [ip]`, `status`, `threats`, `reboot` |
| ⟳ **Auto-Refresh** | Countdown timer — re-fetches nodes every 30 seconds automatically |
| 🐍 **Python Backend** | Flask + Scapy ARP scanner → live `/api/nodes` endpoint |
| 🔍 **Node Filter** | Search topology by name or IP in real time |
| 📊 **All Charts Retained** | Bandwidth 24h, Top Sites, Data per User, Protocol Split |

---

## 🗂️ Project Structure

```
netpulse/
├── index.html     ← 3-tab dashboard layout
├── style.css      ← Premium dark terminal theme
├── app.js         ← Charts, topology, interactive terminal, auto-refresh
├── nodes.json     ← Static demo data (used when backend is offline)
├── backend.py     ← Flask + Scapy live scanner API
└── README.md
```

---

## 🚀 Quick Start (Demo Mode)

No backend needed — runs entirely on static data:

```bash
# Python
cd netpulse/
python3 -m http.server 8080
# → open http://localhost:8080

# OR Node.js
npx serve .
```

---

## 🐍 Live Mode — Python Backend

### 1. Install dependencies

```bash
pip install flask flask-cors scapy
```

### 2. Run the backend (requires root for ARP scanning)

```bash
sudo python3 backend.py
```

This starts a server at `http://127.0.0.1:5000` with these endpoints:

| Endpoint | Description |
|---|---|
| `GET /api/nodes` | Scan network and return all nodes as JSON |
| `GET /api/status` | Router summary (count, avg security, alerts) |
| `GET /api/threats` | Blocked threats (mock; Pi-hole integration optional) |

### 3. Enable live mode in the frontend

In `app.js`, line 9:
```js
const USE_LIVE_API = true;   // ← change false → true
```

### 4. Run the frontend

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` — the dashboard will now pull **live data** from your actual network.

---

## 🌐 Pi-hole Integration (Threat Data)

If you run Pi-hole on your network, replace the `/api/threats` mock with:

```python
import requests

@app.route("/api/threats")
def api_threats():
    res  = requests.get("http://pi.hole/api.php?summaryRaw")
    data = res.json()
    return jsonify([
        { "icon": "⛔", "name": "Ads / trackers filtered", "count": data["ads_blocked_today"] },
        { "icon": "📋", "name": "Queries today",           "count": data["dns_queries_today"] },
    ])
```

---

## 💻 Interactive Terminal Commands

Open the **Terminal** tab and type:

| Command | Description |
|---|---|
| `help` | Show all available commands |
| `scan` | Trigger a live network scan |
| `nodes` | List all discovered nodes with scores |
| `status` | Show router uptime, WAN IP, bandwidth |
| `check 192.168.1.x` | Security audit for a specific IP |
| `block 192.168.1.x` | Apply firewall DROP rule for an IP |
| `bandwidth` | Current bandwidth and peak usage |
| `threats` | List all blocked threats today |
| `uptime` | Router uptime |
| `clear` | Clear the terminal screen |
| `reboot confirm` | Reboot the router |

---

## ⚙️ Configuration

### Change network range (backend)
In `backend.py`:
```python
NETWORK_RANGE    = "192.168.1.0/24"   # your subnet
GATEWAY_IP       = "192.168.1.1"      # your gateway
REFRESH_INTERVAL = 25                 # cache TTL in seconds
```

### Change auto-refresh interval (frontend)
In `app.js`:
```js
const REFRESH_INTERVAL = 30;  // seconds
```

### Add custom nodes to demo data
Edit `nodes.json`. Node types: `gateway` · `router` · `switch` · `ap` · `device`

---

## 🎨 Design System

| Token | Value | Usage |
|---|---|---|
| `--bg-deep` | `#030508` | Page background |
| `--green` | `#00ff88` | OK status, commands |
| `--cyan` | `#00d4ff` | Active elements, bandwidth |
| `--yellow` | `#ffd000` | Warnings |
| `--red` | `#ff3c5a` | Errors, threats, low security |
| `--magenta` | `#d94fff` | Info lines, topology |
| `--font` | JetBrains Mono | All text |

---

## 📄 License

MIT — free to use, fork, and modify.

---

> Built for network engineers, homelab nerds, and terminal lovers. 🖤
