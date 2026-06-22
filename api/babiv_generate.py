"""
Vercel serverless: /api/babiv_generate
AI1833-powered Bab IV narrative generation.
Free tier: deepseek-v4-flash, 10 API keys rotation.
"""
import json
import os
import time
import random
from http.server import BaseHTTPRequestHandler

# 10 free-tier API keys, comma-separated in Vercel env var
API_KEYS = []
_raw = os.environ.get("AI1833_FREE_KEYS", "")
if _raw:
    API_KEYS = [k.strip() for k in _raw.split(",") if k.strip()]

# Fallback: individual keys AI1833_FREE_KEY_0 through AI1833_FREE_KEY_9
if not API_KEYS:
    for i in range(10):
        key = os.environ.get(f"AI1833_FREE_KEY_{i}", "")
        if key:
            API_KEYS.append(key)

BASE_URL = os.environ.get("AI1833_BASE_URL", "https://api.ai1833.shop/v1")
MODEL = os.environ.get("AI1833_FREE_MODEL", "deepseek-v4-flash")

_key_index = 0

def get_next_key():
    global _key_index
    if not API_KEYS:
        return None
    key = API_KEYS[_key_index % len(API_KEYS)]
    _key_index += 1
    return key

# Prompt templates
SECTION_PROMPTS = {
    "descriptive": """Kamu adalah asisten penulisan skripsi. Tulis paragraf HASIL DESKRIPTIF dalam Bahasa Indonesia akademik.

Gaya: Objektif, data-centric, tanpa opini. Laporkan apa yang ditemukan — jangan menafsirkan.
Format: 1-2 paragraf, Times New Roman 12pt style, justified.

Data analisis: {data}

Tulis paragraf deskripsi data:""",

    "assumptions": """Kamu adalah asisten penulisan skripsi. Tulis paragraf UJI ASUMSI dalam Bahasa Indonesia akademik.

Gaya: Objektif, jelaskan apakah asumsi terpenuhi. Sebutkan nama uji dan hasilnya.
Format: 1 paragraf.

Data analisis: {data}

Tulis paragraf uji asumsi:""",

    "hypothesis": """Kamu adalah asisten penulisan skripsi. Tulis paragraf PENGUJIAN HIPOTESIS dalam Bahasa Indonesia akademik.

Gaya: Laporkan hasil uji statistik dengan tepat. Sebutkan:
- Nama uji
- Statistik uji (t, F, χ², U, W, H)
- Derajat bebas
- p-value
- Effect size (Cohen's d, η², r)
- Signifikan atau tidak
- Interpretasi singkat (1 kalimat)

Format: 1 paragraf per hasil uji.

Data analisis: {data}

Tulis paragraf hasil pengujian hipotesis:""",

    "discussion": """Kamu adalah asisten penulisan skripsi. Tulis paragraf PEMBAHASAN dalam Bahasa Indonesia akademik.

Gaya: Interpretatif — jelaskan MAKNA dari hasil. Kaitkan dengan:
- Teori yang mendasari
- Penelitian terdahulu yang relevan
- Implikasi praktis temuan

Format: 2-3 paragraf, hindari pengulangan angka dari bagian hasil.

Temuan dari analisis: {data}

Tulis paragraf pembahasan:""",

    "synthesis": """Kamu adalah asisten penulisan skripsi. Tulis paragraf SINTESIS PEMBAHASAN dalam Bahasa Indonesia akademik.

Gabungkan semua temuan berikut menjadi narasi yang koheren. Jelaskan gambaran besar dari penelitian ini:
- Pola temuan secara keseluruhan
- Keterkaitan antar hasil analisis
- Kontribusi terhadap bidang studi
- Keterbatasan penelitian

Temuan-temuan: {data}

Tulis paragraf sintesis pembahasan:""",
}


def call_ai1833(prompt, max_tokens=800):
    """Call AI1833 API with key rotation."""
    if not API_KEYS:
        return None, "No API keys configured"

    key = get_next_key()
    if not key:
        return None, "Key rotation exhausted"

    import urllib.request
    import urllib.error

    body = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "Kamu adalah asisten penulisan skripsi profesional. Gunakan Bahasa Indonesia akademik yang formal namun jelas. Hindari pengulangan. Tulis dengan gaya ilmiah yang mengalir."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.6,
        "max_tokens": max_tokens,
    }).encode()

    req = urllib.request.Request(
        f"{BASE_URL}/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read())
            return data["choices"][0]["message"]["content"], None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()[:500]
        return None, f"HTTP {e.code}: {err_body}"
    except Exception as e:
        return None, str(e)


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        # Read body
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length else b"{}"

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            self._send_error("Invalid JSON")
            return

        section = payload.get("section", "descriptive")
        data_str = payload.get("data", "")
        max_tokens = payload.get("maxTokens", 800)

        if not data_str:
            self._send_error("Missing 'data' field")
            return

        # Get prompt template
        prompt_template = SECTION_PROMPTS.get(section, SECTION_PROMPTS["descriptive"])
        prompt = prompt_template.format(data=data_str)

        # Call AI1833
        text, error = call_ai1833(prompt, max_tokens)

        if error:
            self._send_error(error)
            return

        self._send_json({
            "success": True,
            "section": section,
            "text": text,
            "model": MODEL,
        })

    def _send_json(self, data):
        resp = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(resp)

    def _send_error(self, msg):
        resp = json.dumps({"success": False, "error": msg}, ensure_ascii=False).encode()
        self.send_response(500)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(resp)
