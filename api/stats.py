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
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            response = {
                'success': True,
                'result': result,
                'backend': 'scipy',
                'scipy_version': sys.modules['scipy'].__version__
            }
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            self.send_error(500, str(e))

    def do_OPTIONS(self):
        # CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
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
        'alpha': alpha
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
    
    # Scipy mannwhitneyu
    statistic, p_value = stats.mannwhitneyu(g1, g2, alternative='two-sided')
    
    # Effect size r = Z / sqrt(N)
    N = len(g1) + len(g2)
    z_score = abs(stats.norm.ppf(1 - p_value / 2)) if p_value < 1 else 0
    effect_size = z_score / np.sqrt(N)
    
    return {
        'U': float(statistic),
        'n1': int(len(g1)),
        'n2': int(len(g2)),
        'N': int(N),
        'pValue': float(p_value),
        'isSignificant': bool(p_value < alpha),
        'effectSize': float(effect_size),
        'effectSizeLabel': effect_size_label(effect_size),
        'alpha': alpha
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
