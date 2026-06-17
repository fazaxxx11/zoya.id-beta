"""
Azezmen Statistical Tests Backend
Vercel Serverless Function — Python 3.11

Endpoints:
  POST /api/stats

Body:
  {
    "method": "wilcoxon" | "mannwhitney" | "ngain" | "correlation" | "ttest" | "normality" | "anova" | "twowayanova" | "chisquare" | "validity" | "reliability" | "kruskal" | "regression" | "regression_multiple",
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

try:
    import statsmodels.api as sm
    from statsmodels.formula.api import ols as sm_ols
    from statsmodels.stats.anova import anova_lm
    STATSMODELS_AVAILABLE = True
except ImportError:
    STATSMODELS_AVAILABLE = False

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
            elif method == 'correlation':
                result = compute_correlation(data, options)
            elif method == 'ttest':
                result = compute_ttest(data, options)
            elif method == 'normality':
                result = compute_normality(data, options)
            elif method == 'anova':
                result = compute_anova(data, options)
            elif method == 'twowayanova':
                result = compute_twowayanova(data, options)
            elif method == 'chisquare':
                result = compute_chisquare(data, options)
            elif method == 'validity':
                result = compute_validity(data, options)
            elif method == 'reliability':
                result = compute_reliability(data, options)
            elif method == 'kruskal':
                result = compute_kruskal(data, options)
            elif method == 'regression':
                result = compute_regression(data, options)
            elif method == 'regression_multiple':
                result = compute_regression_multiple(data, options)
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


def compute_correlation(data, options):
    """
    Pearson or Spearman correlation.

    data: { "type": "pearson"|"spearman", "x": [...], "y": [...] }
    options: { "alpha": 0.05 }
    """
    corr_type = data.get('type', 'pearson')
    x = np.array(data['x'], dtype=float)
    y = np.array(data['y'], dtype=float)
    alpha = options.get('alpha', 0.05)

    mask = ~(np.isnan(x) | np.isnan(y))
    x = x[mask]
    y = y[mask]
    n = len(x)

    if n < 3:
        return {'error': f'Need at least 3 valid pairs (got {n})'}

    if corr_type == 'spearman':
        r, p_value = stats.spearmanr(x, y)
        method_label = 'Spearman'
    else:
        r, p_value = stats.pearsonr(x, y)
        method_label = 'Pearson'

    r = float(r)
    p_value = float(p_value)
    df = n - 2
    es_label = effect_size_label(r)

    return {
        'r': r,
        'pValue': p_value,
        'n': int(n),
        'df': int(df),
        'significant': bool(p_value < alpha),
        'effectSize': abs(r),
        'effectSizeLabel': es_label,
        'method': method_label,
        'interpretation': (
            f'Terdapat korelasi {method_label.lower()} yang signifikan '
            f'(r = {r:.4f}, p = {p_value:.4f} < α = {alpha}). '
            f'Kekuatan korelasi: {es_label.lower()}.'
            if p_value < alpha else
            f'Tidak ada korelasi yang signifikan '
            f'(r = {r:.4f}, p = {p_value:.4f} > α = {alpha}). H₀ tidak ditolak.'
        )
    }


def compute_ttest(data, options):
    """
    t-test (one-sample, paired, independent).

    data: { "mode": "oneSample"|"paired"|"independent", ... }
    options: { "alpha": 0.05 }
    """
    mode = data.get('mode', 'independent')
    alpha = options.get('alpha', 0.05)

    if mode == 'oneSample':
        sample = np.array(data['sample'], dtype=float)
        sample = sample[~np.isnan(sample)]
        popmean = float(data.get('popmean', 0))
        n = len(sample)
        if n < 2:
            return {'error': f'Need at least 2 observations (got {n})'}
        t_stat, p_value = stats.ttest_1samp(sample, popmean)
        mean_diff = float(np.mean(sample) - popmean)
        se = float(stats.sem(sample))
        ci_low = mean_diff - stats.t.ppf(1 - alpha / 2, n - 1) * se
        ci_high = mean_diff + stats.t.ppf(1 - alpha / 2, n - 1) * se
        df = n - 1
        cohens_d = mean_diff / float(np.std(sample, ddof=1))
        label_mode = 'uji-t satu sampel'

    elif mode == 'paired':
        before = np.array(data['before'], dtype=float)
        after = np.array(data['after'], dtype=float)
        mask = ~(np.isnan(before) | np.isnan(after))
        before = before[mask]
        after = after[mask]
        n = len(before)
        if n < 2:
            return {'error': f'Need at least 2 valid pairs (got {n})'}
        t_stat, p_value = stats.ttest_rel(before, after)
        diffs = after - before
        mean_diff = float(np.mean(diffs))
        se = float(stats.sem(diffs))
        ci_low = mean_diff - stats.t.ppf(1 - alpha / 2, n - 1) * se
        ci_high = mean_diff + stats.t.ppf(1 - alpha / 2, n - 1) * se
        df = n - 1
        cohens_d = mean_diff / float(np.std(diffs, ddof=1))
        label_mode = 'uji-t berpasangan'

    else:  # independent
        group1 = np.array(data['group1'], dtype=float)
        group2 = np.array(data['group2'], dtype=float)
        group1 = group1[~np.isnan(group1)]
        group2 = group2[~np.isnan(group2)]
        n1, n2 = len(group1), len(group2)
        if n1 < 2 or n2 < 2:
            return {'error': f'Each group needs at least 2 observations (got {n1}, {n2})'}
        t_stat, p_value = stats.ttest_ind(group1, group2)
        mean_diff = float(np.mean(group1) - np.mean(group2))
        n = n1 + n2
        se1 = stats.sem(group1)
        se2 = stats.sem(group2)
        se_pooled = float(np.sqrt(se1**2 + se2**2))
        df = n - 2
        ci_low = mean_diff - stats.t.ppf(1 - alpha / 2, df) * se_pooled
        ci_high = mean_diff + stats.t.ppf(1 - alpha / 2, df) * se_pooled
        pooled_std = np.sqrt(((n1 - 1) * np.var(group1, ddof=1) + (n2 - 1) * np.var(group2, ddof=1)) / (n1 + n2 - 2))
        cohens_d = mean_diff / float(pooled_std)
        label_mode = 'uji-t independen'

    t_stat = float(t_stat)
    p_value = float(p_value)
    significant = bool(p_value < alpha)
    es = abs(cohens_d)
    if es >= 0.8:
        es_label = 'Besar'
    elif es >= 0.5:
        es_label = 'Sedang'
    else:
        es_label = 'Kecil'

    return {
        't': t_stat,
        'df': int(df),
        'pValue': p_value,
        'meanDiff': mean_diff,
        'ci95': {'low': float(ci_low), 'high': float(ci_high)},
        'significant': significant,
        'effectSize': float(cohens_d),
        'effectSizeLabel': es_label,
        'alpha': alpha,
        'interpretation': (
            f'Terdapat perbedaan signifikan pada {label_mode} '
            f'(t = {t_stat:.4f}, p = {p_value:.4f} < α = {alpha}). '
            f'Cohen\'s d = {cohens_d:.3f} ({es_label.lower()}).'
            if significant else
            f'Tidak ada perbedaan signifikan pada {label_mode} '
            f'(t = {t_stat:.4f}, p = {p_value:.4f} > α = {alpha}). H₀ tidak ditolak.'
        )
    }


def compute_normality(data, options):
    """
    Shapiro-Wilk normality test.

    data: { "values": [...] }
    options: { "alpha": 0.05 }
    """
    values = np.array(data['values'], dtype=float)
    values = values[~np.isnan(values)]
    alpha = options.get('alpha', 0.05)
    n = len(values)

    if n < 3:
        return {'error': f'Need at least 3 observations (got {n})'}
    if n > 5000:
        return {'error': f'Shapiro-Wilk only supports up to 5000 samples (got {n})'}

    W, p_value = stats.shapiro(values)

    return {
        'W': float(W),
        'pValue': float(p_value),
        'isNormal': bool(p_value >= alpha),
        'n': int(n),
        'alpha': alpha,
        'interpretation': (
            f'Data berdistribusi normal (W = {W:.4f}, p = {p_value:.4f} > α = {alpha}). '
            f'Asumsi normalitas terpenuhi.'
            if p_value >= alpha else
            f'Data tidak berdistribusi normal (W = {W:.4f}, p = {p_value:.4f} < α = {alpha}). '
            f'Asumsi normalitas tidak terpenuhi, gunakan uji non-parametrik.'
        )
    }


def compute_anova(data, options):
    """
    One-way ANOVA with Tukey HSD post-hoc.

    data: { "groups": [[...], [...], ...], "groupNames": ["A","B",...] }
    options: { "alpha": 0.05 }
    """
    raw_groups = data['groups']
    group_names = data.get('groupNames', [f'Grup {i+1}' for i in range(len(raw_groups))])
    alpha = options.get('alpha', 0.05)

    groups = []
    for g in raw_groups:
        arr = np.array(g, dtype=float)
        arr = arr[~np.isnan(arr)]
        groups.append(arr)

    k = len(groups)
    if k < 2:
        return {'error': 'Need at least 2 groups'}

    # Group stats
    group_stats = []
    for i, g in enumerate(groups):
        group_stats.append({
            'name': group_names[i],
            'n': int(len(g)),
            'mean': float(np.mean(g)),
            'sd': float(np.std(g, ddof=1)),
            'min': float(np.min(g)),
            'max': float(np.max(g))
        })

    # One-way ANOVA
    f_stat, p_value = stats.f_oneway(*groups)

    all_data = np.concatenate(groups)
    N = len(all_data)
    grand_mean = np.mean(all_data)

    ss_between = sum(len(g) * (np.mean(g) - grand_mean) ** 2 for g in groups)
    ss_total = np.sum((all_data - grand_mean) ** 2)
    ss_within = ss_total - ss_between

    df_between = k - 1
    df_within = N - k

    eta_squared = float(ss_between / ss_total) if ss_total > 0 else 0.0

    # Tukey HSD post-hoc
    post_hoc = []
    try:
        tukey = stats.tukey_hsd(*groups)
        for i in range(k):
            for j in range(i + 1, k):
                diff = float(np.mean(groups[i]) - np.mean(groups[j]))
                post_hoc.append({
                    'group1': group_names[i],
                    'group2': group_names[j],
                    'meanDiff': diff,
                    'pValue': float(tukey.pvalue[i][j]),
                    'significant': bool(tukey.pvalue[i][j] < alpha)
                })
    except Exception:
        # Fallback if tukey_hsd not available
        for i in range(k):
            for j in range(i + 1, k):
                _, p = stats.ttest_ind(groups[i], groups[j])
                post_hoc.append({
                    'group1': group_names[i],
                    'group2': group_names[j],
                    'meanDiff': float(np.mean(groups[i]) - np.mean(groups[j])),
                    'pValue': float(p),
                    'significant': bool(p < alpha)
                })

    significant = bool(p_value < alpha)
    if eta_squared >= 0.14:
        es_label = 'Besar'
    elif eta_squared >= 0.06:
        es_label = 'Sedang'
    else:
        es_label = 'Kecil'

    return {
        'F': float(f_stat),
        'dfBetween': int(df_between),
        'dfWithin': int(df_within),
        'pValue': float(p_value),
        'significant': significant,
        'etaSquared': eta_squared,
        'effectSizeLabel': es_label,
        'alpha': alpha,
        'groupStats': group_stats,
        'postHoc': post_hoc,
        'interpretation': (
            f'Terdapat perbedaan signifikan antar grup (F = {f_stat:.4f}, p = {p_value:.4f} < α = {alpha}). '
            f'η² = {eta_squared:.3f} ({es_label.lower()}). Lihat uji post-hoc Tukey untuk detail.'
            if significant else
            f'Tidak ada perbedaan signifikan antar grup (F = {f_stat:.4f}, p = {p_value:.4f} > α = {alpha}). H₀ tidak ditolak.'
        )
    }


def compute_twowayanova(data, options):
    """
    Two-way ANOVA (Type II) using statsmodels OLS + anova_lm.

    data: { "y": [...], "factorA": [...], "factorB": [...] }
    options: { "alpha": 0.05 }
    """
    if not STATSMODELS_AVAILABLE:
        return {'error': 'statsmodels is not available on this server'}

    alpha = options.get('alpha', 0.05)

    y = np.array(data['y'], dtype=float)
    factor_a = np.array(data['factorA'], dtype=str)
    factor_b = np.array(data['factorB'], dtype=str)

    mask = ~np.isnan(y)
    y = y[mask]
    factor_a = factor_a[mask]
    factor_b = factor_b[mask]

    n = len(y)
    if n < 4:
        return {'error': f'Need at least 4 observations (got {n})'}

    import pandas as pd
    df = pd.DataFrame({
        'y': y,
        'A': factor_a,
        'B': factor_b
    })

    model = sm_ols('y ~ C(A) + C(B) + C(A):C(B)', data=df).fit()
    anova_table = anova_lm(model, typ=2)

    ss_total = np.sum((y - np.mean(y)) ** 2)

    effects = []
    for idx in anova_table.index:
        if idx == 'Residual':
            continue
        ss = float(anova_table.loc[idx, 'sum_sq'])
        df_val = int(anova_table.loc[idx, 'df'])
        f_val = float(anova_table.loc[idx, 'F'])
        p_val = float(anova_table.loc[idx, 'PR(>F)'])
        eta_sq = ss / ss_total if ss_total > 0 else 0.0
        name = idx.replace('C(', '').replace(')', '').replace(':', ' × ')
        effects.append({
            'name': name,
            'F': f_val,
            'df': df_val,
            'pValue': p_val,
            'significant': bool(p_val < alpha),
            'etaSquared': float(eta_sq)
        })

    residuals = {
        'df': int(anova_table.loc['Residual', 'df']),
        'ss': float(anova_table.loc['Residual', 'sum_sq']),
        'ms': float(anova_table.loc['Residual', 'sum_sq'] / anova_table.loc['Residual', 'df'])
    }

    sig_effects = [e['name'] for e in effects if e['significant']]

    return {
        'effects': effects,
        'residuals': residuals,
        'alpha': alpha,
        'interpretation': (
            f'Terdapat efek signifikan pada: {", ".join(sig_effects)} (p < {alpha}). '
            f'Efek residuel: df={residuals["df"]}.'
            if sig_effects else
            f'Tidak ada efek signifikan pada level α = {alpha}. Semua interaksi dan faktor utama tidak signifikan.'
        )
    }


def compute_chisquare(data, options):
    """
    Chi-square test of independence + Cramér's V.

    data: { "var1": [...], "var2": [...] }
    options: { "alpha": 0.05 }
    """
    var1 = np.array(data['var1'])
    var2 = np.array(data['var2'])
    alpha = options.get('alpha', 0.05)

    # Build contingency table
    import pandas as pd
    df = pd.DataFrame({'var1': var1, 'var2': var2})
    contingency = pd.crosstab(df['var1'], df['var2'])

    chi2, p_value, dof, expected = stats.chi2_contingency(contingency)

    # Cramér's V
    n = contingency.values.sum()
    r, c = contingency.shape
    k = min(r, c)
    cramers_v = float(np.sqrt(chi2 / (n * (k - 1)))) if n > 0 and k > 1 else 0.0

    # Convert contingency table for JSON
    table_data = {
        'rows': [str(x) for x in contingency.index.tolist()],
        'columns': [str(x) for x in contingency.columns.tolist()],
        'observed': contingency.values.tolist(),
        'expected': expected.tolist()
    }

    significant = bool(p_value < alpha)
    if cramers_v >= 0.5:
        es_label = 'Besar'
    elif cramers_v >= 0.3:
        es_label = 'Sedang'
    else:
        es_label = 'Kecil'

    return {
        'chi2': float(chi2),
        'df': int(dof),
        'pValue': float(p_value),
        'cramersV': cramers_v,
        'significant': significant,
        'effectSizeLabel': es_label,
        'alpha': alpha,
        'contingencyTable': table_data,
        'n': int(n),
        'interpretation': (
            f'Terdapat hubungan signifikan antar variabel (χ² = {chi2:.4f}, df = {dof}, p = {p_value:.4f} < α = {alpha}). '
            f'Cramér\'s V = {cramers_v:.3f} ({es_label.lower()}).'
            if significant else
            f'Tidak ada hubungan signifikan antar variabel (χ² = {chi2:.4f}, df = {dof}, p = {p_value:.4f} > α = {alpha}). H₀ tidak ditolak.'
        )
    }


def compute_validity(data, options):
    """
    Item validity — Pearson item-total correlation (corrected and simple).

    data: { "matrix": [[...], [...], ...] } — rows=students, cols=items
    options: { "alpha": 0.05 }
    """
    matrix = np.array(data['matrix'], dtype=float)
    alpha = options.get('alpha', 0.05)
    n, k = matrix.shape

    if n < 3:
        return {'error': f'Need at least 3 students (got {n})'}
    if k < 2:
        return {'error': f'Need at least 2 items (got {k})'}

    total_scores = np.sum(matrix, axis=1)

    # Critical r value (two-tailed)
    t_crit = stats.t.ppf(1 - alpha / 2, n - 2)
    r_critical = float(t_crit / np.sqrt(t_crit**2 + n - 2))

    items = []
    for i in range(k):
        item_scores = matrix[:, i]

        # Simple item-total correlation (including the item itself in total)
        r_simple, p_simple = stats.pearsonr(item_scores, total_scores)

        # Corrected item-total correlation (excluding the item)
        rest_total = total_scores - item_scores
        r_corrected, p_corrected = stats.pearsonr(item_scores, rest_total)

        valid = abs(float(r_corrected)) >= r_critical
        items.append({
            'item': i + 1,
            'r': float(r_corrected),
            'pValue': float(p_corrected),
            'rSimple': float(r_simple),
            'pSimple': float(p_simple),
            'isValid': bool(valid),
            'verdict': 'Valid' if valid else 'Tidak Valid'
        })

    valid_count = sum(1 for it in items if it['isValid'])

    return {
        'items': items,
        'rCritical': r_critical,
        'n': int(n),
        'k': int(k),
        'df': int(n - 2),
        'validCount': valid_count,
        'invalidCount': k - valid_count,
        'summary': (
            f'{valid_count} dari {k} butir soal valid (r ≥ r_kritis = {r_critical:.4f}).'
            if valid_count == k else
            f'{valid_count} dari {k} butir soal valid, {k - valid_count} butir tidak valid.'
        )
    }


def compute_reliability(data, options):
    """
    Reliability analysis — Cronbach's alpha + item statistics.

    data: { "matrix": [[...], [...], ...] } — rows=students, cols=items
    options: { "alpha": 0.05 }
    """
    matrix = np.array(data['matrix'], dtype=float)
    alpha = options.get('alpha', 0.05)
    n, k = matrix.shape

    if n < 2:
        return {'error': f'Need at least 2 students (got {n})'}
    if k < 2:
        return {'error': f'Need at least 2 items (got {k})'}

    # Cronbach's alpha: α = (k/(k-1)) * (1 - Σσ²_item / σ²_total)
    item_vars = np.var(matrix, axis=0, ddof=1)
    total_scores = np.sum(matrix, axis=1)
    total_var = np.var(total_scores, ddof=1)

    if total_var == 0:
        return {'error': 'Total variance is zero — all scores identical'}

    cronbach_alpha = float((k / (k - 1)) * (1 - np.sum(item_vars) / total_var))

    # Interpretation based on alpha thresholds
    if cronbach_alpha >= 0.9:
        interp = 'Sangat Baik'
    elif cronbach_alpha >= 0.8:
        interp = 'Baik'
    elif cronbach_alpha >= 0.7:
        interp = 'Cukup'
    elif cronbach_alpha >= 0.6:
        interp = 'Kurang'
    else:
        interp = 'Sangat Kurang'

    # Item statistics
    item_stats = []
    for i in range(k):
        item_scores = matrix[:, i]
        rest_total = total_scores - item_scores
        r_corr, _ = stats.pearsonr(item_scores, rest_total)

        # Alpha if deleted
        remaining_indices = [j for j in range(k) if j != i]
        remaining_matrix = matrix[:, remaining_indices]
        remaining_vars = np.var(remaining_matrix, axis=0, ddof=1)
        remaining_total = np.sum(remaining_matrix, axis=1)
        remaining_total_var = np.var(remaining_total, ddof=1)
        k_remaining = k - 1
        alpha_if_deleted = float((k_remaining / (k_remaining - 1)) * (1 - np.sum(remaining_vars) / remaining_total_var)) if k_remaining > 1 and remaining_total_var > 0 else 0.0

        item_stats.append({
            'item': i + 1,
            'mean': float(np.mean(item_scores)),
            'variance': float(item_vars[i]),
            'itemTotalCorrelation': float(r_corr),
            'alphaIfDeleted': alpha_if_deleted
        })

    return {
        'alpha': cronbach_alpha,
        'k': int(k),
        'n': int(n),
        'interpretation': f'α = {cronbach_alpha:.4f} — Reliabilitas {interp}',
        'category': interp,
        'itemStats': item_stats
    }


def compute_kruskal(data, options):
    """
    Kruskal-Wallis H test (non-parametric one-way ANOVA).

    data: { "groups": [[...], [...], ...], "groupNames": ["A","B",...] }
    options: { "alpha": 0.05 }
    """
    raw_groups = data['groups']
    group_names = data.get('groupNames', [f'Grup {i+1}' for i in range(len(raw_groups))])
    alpha = options.get('alpha', 0.05)

    groups = []
    for g in raw_groups:
        arr = np.array(g, dtype=float)
        arr = arr[~np.isnan(arr)]
        groups.append(arr)

    k = len(groups)
    if k < 2:
        return {'error': 'Need at least 2 groups'}

    h_stat, p_value = stats.kruskal(*groups)

    # Group stats
    all_data = np.concatenate(groups)
    combined_ranks = rankdata(all_data)

    group_stats = []
    idx = 0
    for i, g in enumerate(groups):
        ng = len(g)
        ranks_slice = combined_ranks[idx:idx + ng]
        group_stats.append({
            'name': group_names[i],
            'n': int(ng),
            'meanRank': float(np.mean(ranks_slice)),
            'median': float(np.median(g)),
            'mean': float(np.mean(g)),
            'sd': float(np.std(g, ddof=1)),
            'min': float(np.min(g)),
            'max': float(np.max(g))
        })
        idx += ng

    N = len(all_data)
    # Epsilon-squared effect size: ε² = H / (N - 1)
    epsilon_sq = float(h_stat / (N - 1)) if N > 1 else 0.0

    if epsilon_sq >= 0.14:
        es_label = 'Besar'
    elif epsilon_sq >= 0.06:
        es_label = 'Sedang'
    else:
        es_label = 'Kecil'

    significant = bool(p_value < alpha)

    return {
        'H': float(h_stat),
        'df': int(k - 1),
        'pValue': float(p_value),
        'significant': significant,
        'epsilonSquared': epsilon_sq,
        'effectSizeLabel': es_label,
        'alpha': alpha,
        'groupStats': group_stats,
        'interpretation': (
            f'Terdapat perbedaan signifikan antar grup (H = {h_stat:.4f}, p = {p_value:.4f} < α = {alpha}). '
            f'ε² = {epsilon_sq:.3f} ({es_label.lower()}).'
            if significant else
            f'Tidak ada perbedaan signifikan antar grup (H = {h_stat:.4f}, p = {p_value:.4f} > α = {alpha}). H₀ tidak ditolak.'
        )
    }


def compute_regression(data, options):
    """
    Simple linear regression.

    data: { "x": [...], "y": [...] }
    options: { "alpha": 0.05 }
    """
    x = np.array(data['x'], dtype=float)
    y = np.array(data['y'], dtype=float)
    alpha = options.get('alpha', 0.05)

    mask = ~(np.isnan(x) | np.isnan(y))
    x = x[mask]
    y = y[mask]
    n = len(x)

    if n < 3:
        return {'error': f'Need at least 3 valid pairs (got {n})'}

    slope, intercept, r, p_value, se = stats.linregress(x, y)

    r_sq = float(r ** 2)
    sign = '+' if intercept >= 0 else '-'
    equation = f'y = {slope:.4f}x {sign} {abs(intercept):.4f}'

    if r_sq >= 0.67:
        es_label = 'Kuat'
    elif r_sq >= 0.33:
        es_label = 'Sedang'
    else:
        es_label = 'Lemah'

    significant = bool(p_value < alpha)

    return {
        'slope': float(slope),
        'intercept': float(intercept),
        'r': float(r),
        'rSquared': r_sq,
        'pValue': float(p_value),
        'se': float(se),
        'n': int(n),
        'equation': equation,
        'significant': significant,
        'rSquaredLabel': es_label,
        'alpha': alpha,
        'interpretation': (
            f'Model regresi signifikan (p = {p_value:.4f} < α = {alpha}). '
            f'R² = {r_sq:.4f} ({es_label}), artinya {r_sq*100:.1f}% variasi Y dijelaskan oleh X. '
            f'Persamaan: {equation}'
            if significant else
            f'Model regresi tidak signifikan (p = {p_value:.4f} > α = {alpha}). H₀ tidak ditolak.'
        )
    }


def compute_regression_multiple(data, options):
    """
    Multiple linear regression using statsmodels OLS.

    data: { "X": [[...], [...], ...], "y": [...], "predictors": ["x1","x2",...] }
    options: { "alpha": 0.05 }
    """
    if not STATSMODELS_AVAILABLE:
        return {'error': 'statsmodels is not available on this server'}

    alpha = options.get('alpha', 0.05)

    y = np.array(data['y'], dtype=float)
    raw_X = data['X']
    predictors = data.get('predictors', [f'X{i+1}' for i in range(len(raw_X))])

    X = np.column_stack([np.array(col, dtype=float) for col in raw_X])

    # Filter rows with any NaN
    mask = ~np.isnan(y)
    for col_idx in range(X.shape[1]):
        mask = mask & ~np.isnan(X[:, col_idx])

    y = y[mask]
    X = X[mask, :]
    n = len(y)

    if n < X.shape[1] + 2:
        return {'error': f'Need at least {X.shape[1] + 2} observations (got {n})'}

    # Add constant for intercept
    X_with_const = sm.add_constant(X)
    model = sm.OLS(y, X_with_const).fit()

    coefficients = []
    # First row is intercept
    coefficients.append({
        'name': 'Intercept',
        'coef': float(model.params[0]),
        'se': float(model.bse[0]),
        't': float(model.tvalues[0]),
        'pValue': float(model.pvalues[0])
    })
    for i, pred in enumerate(predictors):
        coefficients.append({
            'name': pred,
            'coef': float(model.params[i + 1]),
            'se': float(model.bse[i + 1]),
            't': float(model.tvalues[i + 1]),
            'pValue': float(model.pvalues[i + 1])
        })

    significant = bool(model.f_pvalue < alpha)

    return {
        'coefficients': coefficients,
        'rSquared': float(model.rsquared),
        'adjRSquared': float(model.rsquared_adj),
        'F': float(model.fvalue),
        'pValue': float(model.f_pvalue),
        'n': int(n),
        'k': int(X.shape[1]),
        'significant': significant,
        'alpha': alpha,
        'interpretation': (
            f'Model regresi berganda signifikan (F = {model.fvalue:.4f}, p = {model.f_pvalue:.4f} < α = {alpha}). '
            f'R² = {model.rsquared:.4f}, R² adjusted = {model.rsquared_adj:.4f}.'
            if significant else
            f'Model regresi berganda tidak signifikan (F = {model.fvalue:.4f}, p = {model.f_pvalue:.4f} > α = {alpha}). H₀ tidak ditolak.'
        )
    }
