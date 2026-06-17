"""
Azezmen Statistical Tests Backend
Vercel Serverless Function — Python 3.11

Endpoints:
  POST /api/stats

Body:
  {
    "method": "wilcoxon" | "mannwhitney" | "ngain",
    "data": { ... },
    "options": { "alpha": 0.05, "maxScore": 100 }
  }

Response:
  {
    "success": true,
    "result": { ... },
    "backend": "scipy"
  }
"""

from http.server import BaseHTTPRequestHandler
import json
import sys

try:
    from scipy import stats
    from scipy.stats import rankdata
    import numpy as np
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

import os
import urllib.request

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')


def verify_jwt(token):
    """Verify JWT token with Supabase."""
    if not SUPABASE_URL or not token:
        return None
    try:
        url = f"{SUPABASE_URL}/auth/v1/user"
        req = urllib.request.Request(url, headers={
            'Authorization': f'Bearer {token}',
            'apikey': SUPABASE_ANON_KEY
        })
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            return data.get('user')
    except Exception:
        return None


ALLOWED_ORIGINS = [
    'https://zoya.id',
    'https://www.zoya.id',
    'https://zoya-id-beta.vercel.app',
    'https://azezmen.vercel.app',
]


def is_allowed_origin(origin):
    if not origin:
        return True  # server-to-server
    if origin in ALLOWED_ORIGINS:
        return True
    import re
    if re.match(r'^https://zoya-id-beta-[a-z0-9]+-zaaaxx11s-projects\.vercel\.app$', origin):
        return True
    if re.match(r'^http://localhost:\d+$', origin):
        return True
    return False


def effect_size_label(r):
    """Kategorikan effect size berdasarkan nilai r."""
    r = abs(r)
    if r >= 0.5:
        return 'Besar'
    elif r >= 0.3:
        return 'Sedang'
    else:
        return 'Kecil'


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if not SCIPY_AVAILABLE:
            self.send_error(503, "scipy not available")
            return

        # Verify JWT
        auth_header = self.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            self.send_error(401, 'Unauthorized')
            return
        token = auth_header.split(' ')[1]
        user = verify_jwt(token)
        if not user:
            self.send_error(401, 'Invalid or expired token')
            return

        # Parse request
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')

        try:
            req = json.loads(body)
            method = req.get('method')
            data = req.get('data')
            options = req.get('options', {})

            # Route to correct test
            if method == 'wilcoxon':
                result = compute_wilcoxon(data, options)
            elif method == 'mannwhitney':
                result = compute_mannwhitney(data, options)
            elif method == 'ngain':
                result = compute_ngain(data, options)
            else:
                self.send_error(400, f"Unknown method: {method}")
                return

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            origin = self.headers.get('Origin', '')
            if is_allowed_origin(origin):
                self.send_header('Access-Control-Allow-Origin', origin or '*')
            self.end_headers()

            response = {
                'success': True,
                'result': result,
                'backend': 'scipy',
                'scipy_version': sys.modules['scipy'].__version__
            }
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            print(f'[stats] Error: {e}', file=sys.stderr)
            self.send_error(500, 'Internal server error')

    def do_GET(self):
        """Health check / keep-alive — no auth required."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        origin = self.headers.get('Origin', '')
        if is_allowed_origin(origin):
            self.send_header('Access-Control-Allow-Origin', origin or '*')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        import time
        resp = {'status': 'ok', 'scipy': SCIPY_AVAILABLE, 'ts': int(time.time())}
        self.wfile.write(json.dumps(resp).encode())

    def do_OPTIONS(self):
        # CORS preflight
        self.send_response(200)
        origin = self.headers.get('Origin', '')
        if is_allowed_origin(origin):
            self.send_header('Access-Control-Allow-Origin', origin or '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()


def compute_wilcoxon(data, options):
    """
    Wilcoxon signed-rank test (paired samples)
    
    data: { "before": [n1, n2, ...], "after": [n1, n2, ...] }
    options: { "alpha": 0.05 }
    """
    before = np.array(data['before'])
    after = np.array(data['after'])
    alpha = options.get('alpha', 0.05)
    
    # Remove NaN and pairs with zero difference
    mask = ~(np.isnan(before) | np.isnan(after))
    before = before[mask]
    after = after[mask]
    
    diffs = after - before
    non_zero_mask = diffs != 0
    non_zero_diffs = diffs[non_zero_mask]
    
    if len(non_zero_diffs) < 5:
        return {'error': f'Need at least 5 non-zero differences (got {len(non_zero_diffs)})'}
    
    # Scipy wilcoxon
    statistic, p_value = stats.wilcoxon(non_zero_diffs, alternative='two-sided')
    
    # Compute Wpos and Wneg manually
    abs_diffs = np.abs(non_zero_diffs)
    ranks = rankdata(abs_diffs)
    Wpos = float(np.sum(ranks[non_zero_diffs > 0]))
    Wneg = float(np.sum(ranks[non_zero_diffs < 0]))
    
    # Z-score from p-value (always positive)
    n = len(non_zero_diffs)
    z_score = abs(stats.norm.ppf(1 - p_value / 2)) if p_value < 1 else 0
    effect_size = z_score / np.sqrt(n)
    
    return {
        'W': float(statistic),
        'Wpos': Wpos,
        'Wneg': Wneg,
        'n': int(n),
        'pValue': float(p_value),
        'isSignificant': bool(p_value < alpha),
        'z': float(z_score),
        'effectSize': float(effect_size),
        'effectSizeLabel': effect_size_label(effect_size),
        'meanDiff': float(np.mean(diffs)),
        'alpha': alpha,
        'interpretation': (
            f'Terdapat perbedaan signifikan antara sebelum & sesudah (p = {p_value:.4f} < α = {alpha}). '
            f'Median diferensi {"positif" if np.mean(diffs) > 0 else "negatif"}. '
            f'Effect size r = {effect_size:.3f} ({effect_size_label(effect_size).lower()}).'
            if p_value < alpha else
            f'Tidak ada perbedaan signifikan (p = {p_value:.4f} > α = {alpha}). H₀ tidak ditolak.'
        )
    }


def compute_mannwhitney(data, options):
    """
    Mann-Whitney U test (independent samples)
    
    data: { "group1": [n1, n2, ...], "group2": [n1, n2, ...] }
    options: { "alpha": 0.05 }
    """
    g1 = np.array(data['group1'])
    g2 = np.array(data['group2'])
    alpha = options.get('alpha', 0.05)
    
    # Remove NaN
    g1 = g1[~np.isnan(g1)]
    g2 = g2[~np.isnan(g2)]
    
    if len(g1) < 3 or len(g2) < 3:
        return {'error': f'Each group needs at least 3 observations (g1={len(g1)}, g2={len(g2)})'}
    
    n1 = len(g1)
    n2 = len(g2)
    
    # Scipy mannwhitneyu
    statistic, p_value = stats.mannwhitneyu(g1, g2, alternative='two-sided')
    
    # Compute R1, R2, meanRank1, meanRank2 (for frontend table display)
    combined = np.concatenate([g1, g2])
    ranks = rankdata(combined)
    R1 = float(np.sum(ranks[:n1]))
    R2 = float(np.sum(ranks[n1:]))
    meanRank1 = R1 / n1
    meanRank2 = R2 / n2
    
    # Effect size r = Z / sqrt(N)
    N = n1 + n2
    z_score = abs(stats.norm.ppf(1 - p_value / 2)) if p_value < 1 else 0
    effect_size = z_score / np.sqrt(N)
    
    return {
        'U': float(statistic),
        'n1': int(n1),
        'n2': int(n2),
        'N': int(N),
        'R1': R1,
        'R2': R2,
        'meanRank1': float(meanRank1),
        'meanRank2': float(meanRank2),
        'pValue': float(p_value),
        'isSignificant': bool(p_value < alpha),
        'z': float(z_score),
        'effectSize': float(effect_size),
        'effectSizeLabel': effect_size_label(effect_size),
        'alpha': alpha,
        'interpretation': (
            f'Terdapat perbedaan signifikan antara dua grup (p = {p_value:.4f} < α = {alpha}). '
            f'Mean rank grup 1 {"lebih tinggi" if meanRank1 > meanRank2 else "lebih rendah"} dari grup 2. '
            f'Effect size r = {effect_size:.3f} ({effect_size_label(effect_size).lower()}).'
            if p_value < alpha else
            f'Tidak ada perbedaan signifikan antara dua grup (p = {p_value:.4f} > α = {alpha}). H₀ tidak ditolak.'
        )
    }


def compute_ngain(data, options):
    """
    N-gain analysis (Hake 1998)
    
    data: { "pre": [n1, n2, ...], "post": [n1, n2, ...] }
    options: { "maxScore": 100 }
    """
    pre = np.array(data['pre'])
    post = np.array(data['post'])
    max_score = options.get('maxScore', 100)
    
    # Remove NaN
    mask = ~(np.isnan(pre) | np.isnan(post))
    pre = pre[mask]
    post = post[mask]
    
    if len(pre) < 2:
        return {'error': f'Need at least 2 valid pairs (got {len(pre)})'}
    
    # Compute N-gain per student
    gains = []
    for p, pt in zip(pre, post):
        denom = max_score - p
        if denom <= 0:
            g = 1.0 if pt >= p else 0.0
        else:
            g = (pt - p) / denom
        gains.append(g)
    
    gains = np.array(gains)
    
    # Kategori Hake
    def categorize(g):
        if g >= 0.7:
            return 'Tinggi'
        elif g >= 0.3:
            return 'Sedang'
        else:
            return 'Rendah'
    
    categories = [categorize(g) for g in gains]
    distribusi = {
        'Tinggi': int(np.sum([c == 'Tinggi' for c in categories])),
        'Sedang': int(np.sum([c == 'Sedang' for c in categories])),
        'Rendah': int(np.sum([c == 'Rendah' for c in categories]))
    }
    
    mean_gain = float(np.mean(gains))
    kategori_kelas = categorize(mean_gain)
    
    # Paired t-test for significance
    t_stat, t_p = stats.ttest_rel(post, pre)
    
    # Tafsiran efektivitas berdasarkan persentase
    efektivitas_persen = round(mean_gain * 100, 2)
    if efektivitas_persen > 76:
        tafsiran_efektivitas = 'Efektif'
    elif efektivitas_persen >= 56:
        tafsiran_efektivitas = 'Cukup Efektif'
    elif efektivitas_persen >= 40:
        tafsiran_efektivitas = 'Kurang Efektif'
    else:
        tafsiran_efektivitas = 'Tidak Efektif'
    
    return {
        'n': int(len(gains)),
        'maxScore': max_score,
        'nGainMean': mean_gain,
        'nGainSD': float(np.std(gains, ddof=1)),
        'nGainMin': float(np.min(gains)),
        'nGainMax': float(np.max(gains)),
        'kategoriKelas': kategori_kelas,
        'efektivitasPersen': efektivitas_persen,
        'tafsiranEfektivitas': tafsiran_efektivitas,
        'distribusi': distribusi,
        'distribusiPersen': {
            'Tinggi': round(distribusi['Tinggi'] / len(gains) * 100, 2),
            'Sedang': round(distribusi['Sedang'] / len(gains) * 100, 2),
            'Rendah': round(distribusi['Rendah'] / len(gains) * 100, 2)
        },
        'signifTest': {
            't': float(t_stat),
            'pValue': float(t_p),
            'significant': bool(t_p < 0.05)
        },
        'preStats': {
            'mean': float(np.mean(pre)),
            'sd': float(np.std(pre, ddof=1)),
            'min': float(np.min(pre)),
            'max': float(np.max(pre))
        },
        'postStats': {
            'mean': float(np.mean(post)),
            'sd': float(np.std(post, ddof=1)),
            'min': float(np.min(post)),
            'max': float(np.max(post))
        }
    }
