#!/usr/bin/env python3
"""
NetPulse — backend.py
Flask + Scapy network scanner API

Usage:
    pip install flask flask-cors scapy
    sudo python3 backend.py

Endpoints:
    GET /api/nodes         → scan and return all nodes as JSON
    GET /api/status        → router status summary
    GET /api/threats       → mocked threat/ad-block data (Pi-hole integration optional)
"""

import json
import time
import threading
import subprocess
from datetime import datetime

from flask import Flask, jsonify
from flask_cors import CORS

# ── Optional scapy import ───────────────────
try:
    from scapy.all import ARP, Ether, srp
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False
    print("[WARN] scapy not installed — using fallback data. Run: pip install scapy")

app = Flask(__name__)
CORS(app)  # Allow requests from the frontend (localhost)

# ── CONFIG ──────────────────────────────────
NETWORK_RANGE   = "192.168.1.0/24"
GATEWAY_IP      = "192.168.1.1"
SCAN_TIMEOUT    = 3          # seconds for ARP scan
CACHE_TTL       = 25         # seconds before re-scanning

# ── SCAN CACHE ───────────────────────────────
_cache_lock  = threading.Lock()
_cache_nodes = []
_cache_time  = 0


# ════════════════════════════════════════════
#  SCANNER
# ════════════════════════════════════════════

def ping_latency(ip: str) -> int:
    """Return average ping latency in ms (or 999 on timeout)."""
    try:
        result = subprocess.run(
            ["ping", "-c", "1", "-W", "1", ip],
            capture_output=True, text=True, timeout=2
        )
        for line in result.stdout.split("\n"):
            if "avg" in line or "rtt" in line:
                # Format: rtt min/avg/max/mdev = 1.234/1.234/1.234/0.000 ms
                parts = line.split("=")[-1].strip().split("/")
                return int(float(parts[1]))
    except Exception:
        pass
    return 999


def arp_scan(network: str) -> list[dict]:
    """Use Scapy ARP to discover live hosts."""
    pkt   = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=network)
    ans, _ = srp(pkt, timeout=SCAN_TIMEOUT, verbose=False)

    hosts = []
    for _, rcv in ans:
        hosts.append({
            "ip":  rcv.psrc,
            "mac": rcv.hwsrc.upper(),
        })
    return hosts


def classify_device(ip: str, mac: str) -> dict:
    """
    Classify device type and estimate security score based on
    open ports, mac prefix, and known device patterns.
    """
    # OUI prefix → device type hints
    mac_prefix = mac[:8].upper()
    oui_map = {
        "A8:C0:D3": ("gateway", "Huawei"),
        "C8:3A:35": ("router",  "Tenda"),
        "50:C7:BF": ("switch",  "TP-Link"),
        "80:2A:A8": ("ap",      "Ubiquiti"),
        "B4:FB:E4": ("ap",      "Huawei"),
    }
    device_type, vendor = oui_map.get(mac_prefix, ("device", "Unknown"))

    # Port scan (lightweight)
    open_ports = check_open_ports(ip, [22, 23, 80, 443, 8080, 8443])

    # Score logic
    score = 100
    if 23   in open_ports: score -= 40   # Telnet = critical
    if 22   in open_ports: score -= 15   # SSH open
    if 8080 in open_ports: score -= 10   # Alt HTTP
    if not open_ports:     score  = min(score, 95)
    score = max(10, min(100, score))

    return {
        "type":       device_type,
        "vendor":     vendor,
        "open_ports": open_ports,
        "security_score": score,
    }


def check_open_ports(ip: str, ports: list[int]) -> list[int]:
    """Quick TCP connect check for a list of ports."""
    import socket
    open_ports = []
    for port in ports:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.4)
            if s.connect_ex((ip, port)) == 0:
                open_ports.append(port)
            s.close()
        except Exception:
            pass
    return open_ports


def build_node_tree(hosts: list[dict]) -> list[dict]:
    """
    Assign parent IDs: gateway is root, everything else is a child.
    For a daisy-chain of routers, parent assignment can be refined
    by checking default gateway of each hop (requires SSH access).
    """
    nodes = []
    node_id = 1
    gateway_id = None

    # Gateway first
    for host in hosts:
        if host["ip"] == GATEWAY_IP:
            info = classify_device(host["ip"], host["mac"])
            nodes.append({
                "id":       node_id,
                "parent_id": None,
                "name":     f"Gateway-{host['ip'].split('.')[-1]}",
                "ip":       host["ip"],
                "mac":      host["mac"],
                "latency":  ping_latency(host["ip"]),
                "firmware": "unknown",
                "status":   "online",
                **info,
            })
            gateway_id = node_id
            node_id += 1
            break

    # All other hosts as children of gateway
    for host in hosts:
        if host["ip"] == GATEWAY_IP:
            continue
        info = classify_device(host["ip"], host["mac"])
        lat  = ping_latency(host["ip"])
        # Long latency suggests daisy-chain hop — use as secondary parent in real setups
        nodes.append({
            "id":        node_id,
            "parent_id": gateway_id,
            "name":      f"{info['vendor']}-{host['ip'].split('.')[-1]}",
            "ip":        host["ip"],
            "mac":       host["mac"],
            "latency":   lat,
            "firmware":  "unknown",
            "status":    "online",
            **info,
        })
        node_id += 1

    return nodes


def scan_network() -> list[dict]:
    """Full scan with caching."""
    global _cache_nodes, _cache_time

    with _cache_lock:
        age = time.time() - _cache_time
        if age < CACHE_TTL and _cache_nodes:
            return _cache_nodes

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Scanning {NETWORK_RANGE}...")

    if SCAPY_AVAILABLE:
        try:
            hosts = arp_scan(NETWORK_RANGE)
            nodes = build_node_tree(hosts)
        except Exception as e:
            print(f"[ERROR] Scan failed: {e}")
            nodes = get_fallback_nodes()
    else:
        nodes = get_fallback_nodes()

    with _cache_lock:
        _cache_nodes = nodes
        _cache_time  = time.time()

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Found {len(nodes)} nodes")
    return nodes


# ════════════════════════════════════════════
#  ROUTES
# ════════════════════════════════════════════

@app.route("/api/nodes")
def api_nodes():
    nodes = scan_network()
    return jsonify(nodes)


@app.route("/api/status")
def api_status():
    nodes = scan_network()
    avg_score = round(sum(n["security_score"] for n in nodes) / len(nodes)) if nodes else 0
    return jsonify({
        "gateway":      GATEWAY_IP,
        "node_count":   len(nodes),
        "avg_security": avg_score,
        "online_count": sum(1 for n in nodes if n["status"] == "online"),
        "alerts":       sum(1 for n in nodes if n["security_score"] < 50),
        "scanned_at":   datetime.utcnow().isoformat() + "Z",
    })


@app.route("/api/threats")
def api_threats():
    """
    Mocked threat data.
    For live data: integrate Pi-hole API at http://pi.hole/api.php?summaryRaw
    """
    return jsonify([
        { "icon": "⚠",  "name": "Malware endpoints blocked", "count": 14  },
        { "icon": "⛔", "name": "Ads / trackers filtered",    "count": 327 },
        { "icon": "🔒", "name": "Phishing domain blocked",   "count": 3   },
        { "icon": "⚡", "name": "Port scans detected",       "count": 2   },
    ])


# ════════════════════════════════════════════
#  FALLBACK DATA
# ════════════════════════════════════════════

def get_fallback_nodes() -> list[dict]:
    """Return static demo nodes when scapy is unavailable."""
    return [
        { "id":1, "parent_id":None, "name":"Huawei-HG8245H",      "ip":"192.168.1.1", "mac":"A8:C0:D3:11:22:33", "type":"gateway", "status":"online", "security_score":88, "latency":2,  "firmware":"V3R017C10",      "open_ports":[80,443]     },
        { "id":2, "parent_id":1,    "name":"Tenda-AC10-Main",      "ip":"192.168.1.2", "mac":"C8:3A:35:55:44:33", "type":"router",  "status":"online", "security_score":72, "latency":5,  "firmware":"V15.03.06.09",   "open_ports":[80,8080]    },
        { "id":3, "parent_id":1,    "name":"Tenda-AC10-Ext1",      "ip":"192.168.1.3", "mac":"C8:3A:35:66:55:44", "type":"router",  "status":"online", "security_score":58, "latency":8,  "firmware":"V15.03.04.01",   "open_ports":[80,23]      },
        { "id":4, "parent_id":2,    "name":"Switch-TP-Link",       "ip":"192.168.1.5", "mac":"50:C7:BF:12:AB:CD", "type":"switch",  "status":"online", "security_score":91, "latency":1,  "firmware":"N/A",            "open_ports":[]           },
        { "id":5, "parent_id":3,    "name":"AP-Ubiquiti-U6-Pro",   "ip":"192.168.1.6", "mac":"80:2A:A8:78:9F:CD", "type":"ap",      "status":"online", "security_score":43, "latency":12, "firmware":"5.43.23.12791",  "open_ports":[22,80,443]  },
        { "id":6, "parent_id":1,    "name":"Tenda-AC10-Ext2",      "ip":"192.168.1.4", "mac":"C8:3A:35:77:66:55", "type":"router",  "status":"online", "security_score":35, "latency":18, "firmware":"V15.02.01.00",   "open_ports":[22,23,80,8080] },
    ]


# ════════════════════════════════════════════
#  ENTRY
# ════════════════════════════════════════════

if __name__ == "__main__":
    print("""
  ╔══════════════════════════════════════╗
  ║   NetPulse Backend — v3.0.0         ║
  ║   http://127.0.0.1:5000/api/nodes   ║
  ╚══════════════════════════════════════╝
    """)
    # Run initial scan in background so first request is fast
    threading.Thread(target=scan_network, daemon=True).start()
    app.run(host="0.0.0.0", port=5000, debug=False)
