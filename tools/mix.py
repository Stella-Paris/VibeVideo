# Soundtrack: user BGM (intro + finale), one game OST per matchup, and sound effects built only
# from recorded acoustic instruments (VCSL, CC0). Reads data/cues.json, writes out/mix.wav.
import json, os, re, glob, sys
import numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt
from fractions import Fraction

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
CUES = json.load(open(f'{ROOT}/data/cues.json'))
DUR = CUES['duration']
N = int(round(DUR * SR))
rng = np.random.default_rng(7)

# ------------------------------------------------------------------ sample library
def load(path):
    x, sr = sf.read(path, always_2d=True)
    x = x[:, :2] if x.shape[1] >= 2 else np.repeat(x, 2, 1)
    if sr != SR:
        f = Fraction(SR, sr).limit_denominator(1000); x = resample_poly(x, f.numerator, f.denominator, axis=0)
    return x.astype(np.float32)
_cache = {}
def S(fam, pat=None, i=0):
    files = sorted(glob.glob(f'{ROOT}/vcsl/{fam}/*'))
    if pat: files = [f for f in files if re.search(pat, os.path.basename(f))] or files
    f = files[i % len(files)]
    if f not in _cache: _cache[f] = load(f)
    return _cache[f]
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def midi_of(name):
    m = re.search(r'_([A-G])(%23|#)?(-?\d)', name)
    if not m: return None
    return 12 * (int(m.group(3)) + 1) + NOTE[m.group(1)] + (1 if m.group(2) else 0)
def to_midi(n):
    if isinstance(n, (int, float)): return n
    m = re.match(r'([A-G])(#?)(-?\d)', n); return 12 * (int(m.group(3)) + 1) + NOTE[m.group(1)] + (1 if m.group(2) else 0)
def note(fam, n, dur=None, pat=None):
    target = to_midi(n); best = None
    for f in sorted(glob.glob(f'{ROOT}/vcsl/{fam}/*')):
        if pat and not re.search(pat, os.path.basename(f)): continue
        m = midi_of(os.path.basename(f))
        if m is None: continue
        if best is None or abs(m - target) < abs(best[1] - target): best = (f, m)
    if best[0] not in _cache: _cache[best[0]] = load(best[0])
    x = _cache[best[0]]; ratio = 2 ** ((target - best[1]) / 12)
    if abs(ratio - 1) > 1e-3:   # pitch-shift by resampling (speed change, fine for short one-shots)
        f = Fraction(1 / ratio).limit_denominator(200); x = resample_poly(x, f.numerator, f.denominator, axis=0).astype(np.float32)
    if dur: x = trim(x, dur)
    return x
def trim(x, dur, fade=0.08):
    n = int(dur * SR); x = x[:n].copy(); f = min(len(x), int(fade * SR))
    if f > 0: x[-f:] *= np.linspace(1, 0, f)[:, None]
    return x
def onset(x):   # sample index of the first transient (skip leading silence in recordings)
    a = np.abs(x).max(1); thr = a.max() * 0.25; i = int(np.argmax(a > thr)); return max(0, i - int(0.004 * SR))
def norm(x, db=-20.0, win=0.3):
    o = onset(x); seg = x[o:o + int(win * SR)]; r = np.sqrt(np.mean(seg ** 2)) + 1e-9
    return x * (10 ** (db / 20) / r)
def pan(x, p):
    if not p: return x
    l, r = np.cos((p + 1) * np.pi / 4) * np.sqrt(2), np.sin((p + 1) * np.pi / 4) * np.sqrt(2)
    return x * np.array([l, r], dtype=np.float32)
def lay(*parts):   # parts: (sound, offset_seconds, gain_db); returns buffer + its sync index (offset 0 = sync)
    pre = max(0.0, -min(o for _, o, _ in parts)); n = max(int((pre + o) * SR) + len(s) for s, o, _ in parts)
    buf = np.zeros((n, 2), np.float32)
    for s, o, g in parts:
        a = int((pre + o) * SR); buf[a:a + len(s)] += s * 10 ** (g / 20)
    return buf, int(pre * SR)
def H(fam, pat=None, i=0, db=-20, dur=None):   # one-shot hit aligned to its transient
    x = S(fam, pat, i); x = x[onset(x):]; x = trim(x, dur) if dur else x; return norm(x, db)
def N_(fam, n, db=-20, dur=None, pat=None):
    x = note(fam, n, dur, pat); x = x[onset(x):]; return norm(x, db)
PENTA = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7']
def harp_gliss(lo=0, hi=12, dur=0.8, up=True, db=-24):
    notes = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6'][lo:hi]
    if not up: notes = notes[::-1]
    return [(N_('harp', n, db, 2.5), i * dur / len(notes), 0) for i, n in enumerate(notes)]

# ------------------------------------------------------------------ SFX recipes (all acoustic)
def recipe(c):
    n, i, d = c['name'], int(c.get('i', 0)), c.get('dur')
    if n == 'slap': return lay((H('slapstick', 'quiet', i, -21), 0, 0), (H('framedrum', 'HitMuted', i, -24), 0, 0))
    if n == 'swish': return lay((H('cabasa', 'Rub', i, -25, 0.5), -0.12, 0), (H('shaker', 'Down', i, -27), -0.05, 0))
    if n == 'coin': return lay((N_('glock', 'C6' if i == 0 else 'G6', -19, 1.5), 0, 0), (H('triangle', 'Hit', 0, -27, 1.5), 0, 0))
    if n == 'stack': return lay((H('slitdrum', 'Lo' if i < 3 else 'Hi', i, -21), 0, 0), (H('woodblock', None, i, -24), 0, 0))
    if n == 'vault': return lay((H('bassdrum2', 'ff', 0, -12, 3), 0, 0), (H('timpani', None, 0, -15, 3), 0, 0), (H('gong2', 'light', 0, -22, 4), 0, 0), (H('crash', 'mf', 0, -24, 3), 0, 0))
    if n == 'question': return lay((H('vibraslap', None, 0, -19), 0, 0),)
    if n == 'pluck': return lay((N_('kalimba', PENTA[i % 10][:-1] + str(int(PENTA[i % 10][-1]) - 1), -22, 1.5), 0, 0),)
    if n == 'step': return lay((N_('marimba', ['C4', 'E4', 'G4', 'C5', 'E5'][i], -17, 1.6), 0, 0), (H('woodblock', 'ff', 0, -26), 0, 0))
    if n == 'stamp': return lay((H('bassdrum2', 'f', 0, -15, 1.5), 0, 0), (H('slapstick', 'rr', 0, -19), 0, 0))
    if n == 'tick': return lay((H('claves' if i % 2 else 'woodblock', None, i, -25), 0, 0),)
    if n == 'rise': return lay(*harp_gliss(0, 10, 0.7, True, -25))
    if n == 'floor': return lay((N_('piano', 'C2', -16, 1.6), 0, 0), (N_('piano', 'C#2', -18, 1.6), 0, 0), (H('timpani', None, 2, -20, 2), 0, 0))
    if n == 'ceil': return lay((N_('tubularbells', 'C4', -18, 4), 0, 0), (N_('glock', 'G5', -22, 2), 0.02, 0), (H('marktree', 'fastAsc', 0, -26, 2), -0.3, 0))
    if n == 'lock': return lay((H('claves', None, i, -20), 0, 0), (N_('glock', ['C6', 'E6', 'G6', 'C7'][i % 4], -24, 1.2), 0, 0))
    if n == 'blip': return lay((N_('marimba', ['E5', 'G5', 'C6'][i % 3], -19, 1.2), 0, 0),)
    if n == 'vs': return lay((H('crash', 'ff', 0, -16, 3.5), 0, 0), (H('bassdrum2', 'ff', 0, -12, 2.5), 0, 0), (H('timpani', None, 1, -15, 2.5), 0, 0))
    if n == 'sparkle': return lay((H('marktree', 'fastAsc', 0, -24, 2.5), 0, 0), (N_('glock', 'C7', -26, 1.5), 0.25, 0))
    if n == 'fill': return lay(*[(N_('marimba', m, -22, 1.0), k * 0.13, 0) for k, m in enumerate(['C5', 'D5', 'E5', 'G5', 'A5', 'C6'])])
    if n == 'gliss': return lay(*harp_gliss(2, 14, 0.9, True, -23))
    if n == 'rocket': return lay((H('flexatone', 'fast', 0, -24, 1.2), 0, 0), (H('ratchet', 'Fast', 0, -26), 0.1, 0))
    if n == 'chain': return lay((H('cowbell', 'Muted', 0, -18), 0, 0), (H('ratchet', 'Crank', 0, -20), 0.04, 0), (H('bassdrum2', 'mp', 0, -20, 1), 0, 0))
    if n == 'alarm': return lay((H('triangle', 'roll', 0, -21, 1.3), 0, 0), (H('agogo', 'f_', 0, -23), 0, 0), (H('agogo', 'f_', 1, -23), 0.16, 0), (H('agogo', 'f_', 0, -23), 0.32, 0))
    if n == 'ceilplate': return lay((N_('vibraphone', 'C4', -21, 3), 0, 0), (N_('vibraphone', 'E4', -22, 3), 0, 0), (N_('vibraphone', 'G4', -22, 3), 0, 0))
    if n == 'star': return lay((N_('glock', 'G5' if i == 0 else 'C6', -18, 2), 0, 0), (N_('tubularbells', 'G4' if i == 0 else 'C5', -24, 3), 0, 0))
    if n == 'gold5': return lay(*harp_gliss(0, 14, 0.7, True, -23), (H('marktree', 'fastAsc', 0, -22, 3), 0.1, 0), (N_('tubularbells', 'C5', -17, 4), 0.72, 0), (N_('glock', 'C6', -20, 2), 0.72, 0), (N_('glock', 'G6', -22, 2), 0.82, 0))
    if n == 'kill': return lay((H('crash', 'ff', 1, -16, 3), 0, 0), (H('timpani', None, 3, -14, 2.5), 0, 0), (H('bassdrum2', 'ff', 0, -14, 2), 0, 0))
    if n == 'deflate': return lay(*[(N_('marimba', m, -23, 0.8), k * 0.07, 0) for k, m in enumerate(['C6', 'A5', 'G5', 'E5', 'D5', 'C5', 'A4', 'G4'])], (H('vibraslap', None, 1, -24), 0.55, 0))
    if n == 'block': return lay((H('woodblock', None, i, -22), 0, 0), (N_('marimba', PENTA[i % 8], -27, 0.6), 0, 0))
    if n == 'heart': return lay((H('bassdrum', 'v3', i, -16, 0.6), 0, 0), (H('bassdrum', 'v2', i + 1, -21, 0.6), 0.2, 0))
    if n == 'shutter': return lay((H('claves', None, i, -26), 0, 0), (H('shaker', 'Faster', i, -30), 0.02, 0))
    if n == 'burst': return lay((H('crash', 'mf', 0, -18, 3), 0, 0), (H('tambourine', 'Roll', 0, -22, 1.5), 0, 0), (N_('glock', 'E6', -22, 1.5), 0, 0))
    if n == 'gate': return lay((H('gong2', 'full1', 0, -14, 5), 0, 0), (H('bassdrum2', 'ff', 1, -13, 2), 0, 0))
    if n == 'drumroll':
        d = d or 1.0; k = int(d / 0.07); parts = []
        for j in range(k): parts.append((H('timpani', None, j % 4, -30 + 12 * j / max(1, k - 1), 1.2), j * d / k, 0))
        return lay(*parts)
    if n == 'flatline': x = S('wineglass', 'D%234|D#4', 0); x = trim(x[onset(x):][int(0.3 * SR):], 2.0, 0.5); return lay((norm(x, -25, 1.0), 0, 0),)
    if n == 'swell': x = S('suscymbal', 'cresc_1.5s'); return lay((norm(trim(x, 1.6, 0.05), -20, 1.5), -1.5, 0),)
    if n == 'boomhit': return lay((H('bassdrum2', 'ff', 0, -11, 3), 0, 0), (H('crash', 'ff', 0, -15, 4), 0, 0), (H('timpani', None, 0, -14, 3), 0, 0))
    if n == 'whistle': return lay((H('trainwhistle', 'Double', 0, -16, 2.5), 0, 0),)
    if n == 'chug': return lay(*[(H('shaker', 'Double', j, -27 + 3 * (j % 2)), j * 0.14, 0) for j in range(14)])
    if n == 'coal': return lay((H('slitdrum', 'Lo', i, -22), 0, 0), (H('cabasa', 'Hit', i, -28), 0, 0))
    if n == 'dragon': return lay((H('gong', 'gong_f', 0, -15, 5), 0, 0), *harp_gliss(0, 14, 1.2, True, -24), (H('belltree', None, 0, -24, 3), 0.4, 0))
    if n == 'envelopes': return lay((H('sleighbells', 'shake', 0, -21, 2), 0, 0), (H('belltree', None, 1, -23, 3), 0.2, 0))
    if n == 'shatter': return lay((H('crash', 'ff', 2, -15, 3), 0, 0), (H('marktree', 'desc', 0, -20, 3), 0.02, 0), (H('tambourine', 'Hit_v2', 0, -20), 0, 0), (N_('glock', 'G#6', -22, 1.5), 0, 0), (N_('glock', 'C7', -22, 1.5), 0.04, 0))
    if n == 'cock': return lay((H('ratchet', 'Crank', 1, -19), 0, 0), (H('claves', None, 2, -20), 0.15, 0))
    if n == 'thud': return lay((H('bassdrum2', 'mf', 0, -15, 1.5), 0, 0), (H('tom', None, 0, -20), 0, 0))
    if n == 'safelock': return lay((H('cowbell', 'Muted', 1, -17), 0, 0), (H('woodblock', 'ff', 0, -17), 0.06, 0), (H('bassdrum2', 'mp', 1, -19, 1), 0, 0))
    if n == 'marimbaDown': return lay((N_('marimba', ['G5', 'E5', 'D5', 'C5', 'A4'][i], -18 - i, 1.5), 0, 0),)
    if n == 'clunk': return lay((H('slitdrum', 'Lo', 2, -16), 0, 0), (H('woodblock', 'ff', 1, -19), 0, 0))
    if n == 'stair': return lay((N_('glock', PENTA[i + 1], -20, 1.5), 0, 0), (H('tom', None, i, -23), 0, 0), (H('tambourine', 'Hit', i, -27), 0, 0))
    if n == 'crown': return lay((N_('tubularbells', 'C4', -16, 5), 0, 0), (N_('tubularbells', 'G4', -19, 5), 0.03, 0), (H('crash', 'mf', 1, -19, 3), 0, 0), *[(N_('glock', m, -22, 1.5), 0.08 * k, 0) for k, m in enumerate(['C6', 'E6', 'G6', 'C7'])])
    if n == 'blade': return lay((H('fingercym', None, 0, -18, 2), 0, 0), (H('triangle', 'Hit', 1, -20, 2), 0.01, 0), (H('guiro', 'Fast', 0, -24), -0.1, 0))
    if n == 'coinroll': return lay((N_('glock', PENTA[(i * 3) % 12], -24, 0.8), 0, 0),)
    if n == 'gear': return lay((H('agogo', None, i, -22), 0, 0), (H('tom', None, i + 2, -19), 0, 0), (H('ratchet', 'Crank', i, -26), 0.05, 0))
    if n == 'smg': return lay(*[(H('slapstick', 'rr', j, -20), j * 0.055, 0) for j in range(9)], *[(H('claps', None, j, -26), j * 0.055 + 0.01, 0) for j in range(9)])
    if n == 'crash': return lay((H('crash', 'ff', 0, -14, 4), 0, 0), (H('bassdrum2', 'ff', 0, -12, 2.5), 0, 0), (H('timpani', None, 4, -15, 2.5), 0, 0))
    if n == 'templebell': return lay((N_('tubularbells', 'D3', -15, 6), 0, 0), (H('gong2', 'light', 1, -21, 5), 0, 0))
    if n == 'tamb': return lay((H('tambourine', 'Shake', 0, -21, 1.2), 0, 0),)
    if n == 'error': return lay((N_('piano', 'F#2', -15, 0.9), 0, 0), (N_('piano', 'C2', -15, 0.9), 0, 0), (H('woodblock', 'ff', 0, -22), 0, 0))
    if n == 'happy': return lay(*[(N_('glock', m, -21, 1.2), 0.09 * k, 0) for k, m in enumerate(['C5', 'E5', 'G5', 'C6'])], (H('tambourine', 'Hit', 0, -25), 0, 0))
    if n == 'card': return lay((H('cabasa', 'Hit', i, -24), 0, 0),)
    if n == 'hero': return lay((H('bassdrum2', 'ff', 0, -10, 3), 0, 0), (H('gong2', 'loudest', 0, -13, 6), 0, 0), (H('crash', 'ff', 1, -14, 4), 0, 0), (H('timpani', None, 0, -13, 3), 0, 0),
                              (N_('tubularbells', 'C4', -16, 5), 0.02, 0), (N_('tubularbells', 'G3', -18, 5), 0.02, 0), (H('suscymbal', 'cresc_1.5s', 0, -20, 1.6), -1.5, 0))
    if n == 'xhit': return lay((H('slapstick', 'rr', i, -18), 0, 0), (H('tom', None, i, -21), 0, 0))
    if n == 'plus1': return lay((N_('glock', PENTA[i % 12], -23, 0.9), 0, 0),)
    if n == 'mult': return lay((H('timpani', None, i % 5, -18 + i * 0.8, 2), 0, 0), (H('claps', None, i, -22), 0, 0), (N_('glock', PENTA[i + 2], -24, 1), 0, 0))
    if n == 'beans': return lay((H('sleighbells', 'shake', 1, -22, 1.5), 0, 0), (H('cabasa', 'Rub', 0, -24, 1.0), 0.1, 0), (H('guiro', 'long', 0, -26), 0.2, 0))
    if n == 'drain': return lay(*[(N_('marimba', 72 - k, -22 - k * 0.3, 0.5), k * 0.09, 0) for k in range(16)], (H('flexatone', 'long', 0, -26, 1.8), 0.1, 0))
    if n == 'popup': return lay((N_('vibraphone', 'G4', -17, 2), 0, 0), (N_('vibraphone', 'C5', -17, 2.5), 0.28, 0))
    if n == 'piano':
        ch = [['C3', 'G3', 'E4', 'G4', 'C5'], ['A2', 'E3', 'C4', 'E4', 'A4'], ['F2', 'C3', 'A3', 'C4', 'F4'], ['C2', 'G2', 'E3', 'G3', 'C4', 'E4']][i % 4]
        return lay(*[(N_('piano', m, -19 if i < 3 else -17, 5), k * 0.012, 0) for k, m in enumerate(ch)])
    if n == 'ping': return lay((H('triangle', 'Hit', i, -20, 2), 0, 0), (N_('glock', ['E6', 'G6', 'C7'][i % 3], -23, 1.5), 0, 0))
    if n == 'endhit': return lay(*[(N_('piano', m, -16, 6), k * 0.01, 0) for k, m in enumerate(['C2', 'C3', 'G3', 'E4', 'G4', 'C5'])], (N_('tubularbells', 'C4', -18, 6), 0, 0), (H('crash', 'mp', 0, -24, 4), 0, 0))
    raise KeyError(n)

PAN = {'slap': 0.25, 'pluck': 0.35, 'block': 0.4, 'coal': 0.3, 'shutter': 0.45, 'plus1': 0.4, 'coinroll': 0.3, 'tick': 0.3, 'stack': 0.35, 'card': 0.3}

# ------------------------------------------------------------------ music bed
def music_track(name):
    return load(f'{ROOT}/assets/music/{name}.mp3')
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
def env_db(x, win=0.5):
    m = x.mean(1); k = int(win * SR); n = len(m) // k
    return np.array([20 * np.log10(np.sqrt(np.mean(m[j * k:(j + 1) * k] ** 2)) + 1e-9) for j in range(n)])

sh = CUES['shots']; ch = CUES['chStart']
hit = lambda sid: sh[sid]['t0'] + 0.55                         # VS slam of each round opener
segs = []   # (track, video_start, video_end, track_offset, fade_in, fade_out)
# intro on the user's BGM, from its own beginning (its full band enters right as S02 starts)
segs.append(('user', 0.0, hit('S06'), 0.0, 0.02, 0.5))
# round 1: Genshin main theme; its big swell (~38.5 s) lands on the 0-constellation turning point
g_kink = sh['S10']['e']['kink']; g_off = max(1.8, 38.5 - (g_kink - hit('S06')))
segs.append(('genshin', hit('S06'), hit('S14'), g_off, 0.05, 0.5))
segs.append(('whiteout', hit('S14'), hit('S21'), 9.6, 0.05, 0.5))
segs.append(('hok', hit('S21'), hit('S27'), 4.2, 0.05, 0.5))
# round 4: the 云宫迅音 drop lands on the golden-staff hit; search the strongest energy jump that fits
wk = music_track('wukong'); e = env_db(wk, 0.25); hero = sh['S29']['e']['hero']; lead = hero - hit('S27')
best, bt = -1e9, None
for j in range(8, len(e) - 4):
    tt = j * 0.25
    if tt - lead < 1.0 or tt - lead + (sh['S33']['t0'] - hit('S27')) > len(wk) / SR - 2: continue
    score = e[j:j + 2].mean() - e[j - 6:j - 1].mean()
    if score > best: best, bt = score, tt
w_off = bt - lead
print(f'wukong drop at {bt:.2f}s (jump {best:.1f} dB) -> offset {w_off:.2f}')
segs.append(('wukong', hit('S27'), sh['S33']['t0'] + 0.3, w_off, 0.05, 1.2))
# finale: user BGM so that its natural ending lands on the end card
ut = music_track('user'); u_len = len(ut) / SR
segs.append(('user', sh['S33']['t0'] - 0.3, DUR, u_len - 3.5 - (DUR - (sh['S33']['t0'] - 0.3)), 1.2, 0.6))

music = np.zeros((N, 2), np.float32)
for name, v0, v1, off, fi, fo in segs:
    tr = music_track(name); a, b = int(v0 * SR), int(min(DUR, v1 + fo) * SR); o = int(off * SR)
    seg = tr[o:o + (b - a)]
    if len(seg) < b - a: seg = np.pad(seg, ((0, b - a - len(seg)), (0, 0)))
    seg = seg * 10 ** ((-20 - rms_db(seg[:int(min(len(seg), 40 * SR))])) / 20)    # equal loudness per track
    g = np.ones(len(seg), np.float32); nfi, nfo = int(fi * SR), int(fo * SR)
    g[:nfi] = np.linspace(0, 1, nfi) ** 2; g[-nfo:] *= np.linspace(1, 0, nfo) ** 0.5
    # slow leveller so quiet intros and loud tuttis sit at a similar bed level
    w = int(3 * SR); pw = np.convolve((seg ** 2).mean(1), np.ones(w) / w, 'same'); lv = 10 * np.log10(pw + 1e-10)
    ag = 10 ** (np.clip(-20 - lv, -5, 7) / 20); ag = np.convolve(ag, np.ones(int(SR)) / SR, 'same')
    music[a:b] += seg * (g * ag)[:, None]
    print(f'{name:9s} video {v0:7.2f}-{v1:7.2f}  track@{off:7.2f}')

# ------------------------------------------------------------------ SFX layer
fx = np.zeros((N + SR * 8, 2), np.float32)
for c in CUES['sfx']:
    buf, sync = recipe(c)
    g = 10 ** ((c.get('gain', 0) or 0) / 20) * 10 ** (2.0 / 20)
    p = PAN.get(c['name'], 0) * (1 if int(c.get('i', 0)) % 2 else -1)
    a = int(c['t'] * SR) - sync
    if a < 0: buf = buf[-a:]; a = 0
    fx[a:a + len(buf)] += pan(buf, p) * g
fx = fx[:N]

# duck the music a little under dense SFX moments
env = np.abs(fx).mean(1); k = int(0.05 * SR)
sm = np.convolve(env, np.ones(k) / k, 'same'); lvl = 20 * np.log10(sm + 1e-6)
duck = 10 ** (-np.clip((lvl + 30) * 0.25, 0, 4) / 20)
duck = np.convolve(duck, np.ones(int(0.12 * SR)) / int(0.12 * SR), 'same')
mix = music * duck[:, None] + fx
sos = butter(2, 30, 'hp', fs=SR, output='sos'); mix = sosfilt(sos, mix, axis=0)
mix = mix / max(1.0, np.abs(mix).max() / 0.98)
os.makedirs(f'{ROOT}/out', exist_ok=True)
sf.write(f'{ROOT}/out/mix_raw.wav', mix.astype(np.float32), SR, subtype='FLOAT')
sf.write(f'{ROOT}/out/music_only_raw.wav', (music / max(1.0, np.abs(music).max() / 0.98)).astype(np.float32), SR, subtype='FLOAT')
print('wrote mix', mix.shape[0] / SR, 'music rms', rms_db(music), 'fx rms(active)', 20*np.log10(np.sqrt(np.mean(fx[np.abs(fx).mean(1)>1e-3]**2))+1e-9))
