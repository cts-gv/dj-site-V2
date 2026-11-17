"""
Original placeholder music for DJ-Mando.
Everything is synthesized from scratch (no samples, no copyrighted material),
so these tracks are safe to ship until real mixes are uploaded.
"""
import numpy as np
from scipy.signal import butter, sosfilt
import subprocess, os, sys

SR = 44100
rng_global = np.random.default_rng(7)


# ---------- helpers ----------
def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n, a=0.005, d=0.1, s=0.7, r=0.1):
    """ADSR over n samples (times in seconds)."""
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(0, n - a_n - d_n - r_n)
    e = np.concatenate([
        np.linspace(0, 1, max(a_n, 1), endpoint=False),
        np.linspace(1, s, max(d_n, 1), endpoint=False),
        np.full(s_n, s),
        np.linspace(s, 0, max(r_n, 1)),
    ])
    if len(e) < n:
        e = np.pad(e, (0, n - len(e)))
    return e[:n]


def lp(x, cutoff, order=2):
    cutoff = min(cutoff, SR / 2 - 100)
    return sosfilt(butter(order, cutoff, btype="low", fs=SR, output="sos"), x)


def hp(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, btype="high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def wave(kind, freq, n, detune=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    ratios = [1.0] if detune == 0 else [1 - detune, 1.0, 1 + detune]
    for r in ratios:
        f = freq * r
        K = max(1, min(40, int((SR / 2 - 200) / f)))
        if kind == "sine":
            o = np.sin(2 * np.pi * f * t)
        elif kind == "saw":
            o = sum(np.sin(2 * np.pi * k * f * t + (r * 0.7)) / k for k in range(1, K + 1)) * (2 / np.pi)
        elif kind == "square":
            o = sum(np.sin(2 * np.pi * k * f * t) / k for k in range(1, K + 1, 2)) * (4 / np.pi)
        elif kind == "tri":
            o = sum(((-1) ** ((k - 1) // 2)) * np.sin(2 * np.pi * k * f * t) / k ** 2 for k in range(1, K + 1, 2)) * (8 / np.pi ** 2)
        else:
            raise ValueError(kind)
        out += o
    return out / len(ratios)


def kick(punch=1.0, decay=0.32, f0=52):
    n = int(decay * SR)
    t = np.arange(n) / SR
    f = f0 + 140 * np.exp(-t * 38)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 11)
    click = hp(rng_global.standard_normal(n), 2500) * np.exp(-t * 260) * 0.25
    return np.tanh((body + click) * 1.6 * punch)


def snare(tone=190, decay=0.2, noise_amt=0.8):
    n = int(decay * SR)
    t = np.arange(n) / SR
    noise = hp(rng_global.standard_normal(n), 1400) * np.exp(-t * 22) * noise_amt
    body = np.sin(2 * np.pi * tone * t) * np.exp(-t * 28) * 0.6
    return np.tanh((noise + body) * 1.3)


def clap():
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    noise = bp(rng_global.standard_normal(n), 900, 4500)
    e = np.zeros(n)
    for off in (0.0, 0.011, 0.023):
        i = int(off * SR)
        e[i:] += np.exp(-np.arange(n - i) / SR * 90) * 0.7
    e += np.exp(-t * 18) * 0.5 * (t > 0.03)
    return np.tanh(noise * e * 1.5)


def hat(decay=0.04, bright=7000):
    n = int(decay * SR) + 1
    t = np.arange(n) / SR
    return hp(rng_global.standard_normal(n), bright) * np.exp(-t * (4.5 / decay)) * 0.8


def rim():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) + np.sin(2 * np.pi * 820 * t)) * np.exp(-t * 90) * 0.5


def tom(freq=110, decay=0.25):
    n = int(decay * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.7 * np.exp(-t * 25))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12)


# ---------- mixing ----------
class Mix:
    def __init__(self, seconds):
        self.n = int(seconds * SR)
        self.buses = {k: np.zeros((self.n, 2)) for k in ("drums", "bass", "music", "lead")}

    def add(self, bus, sig, t_sec, gain=1.0, pan=0.0):
        s = int(t_sec * SR)
        if s >= self.n:
            return
        e = min(self.n, s + len(sig))
        sig = sig[: e - s] * gain
        l = np.cos((pan + 1) * np.pi / 4)
        r = np.sin((pan + 1) * np.pi / 4)
        self.buses[bus][s:e, 0] += sig * l * 1.414
        self.buses[bus][s:e, 1] += sig * r * 1.414


def echo(x, delay_s, fb=0.4, taps=5, mix=0.4, damp=4500):
    out = x.copy()
    d = int(delay_s * SR)
    wet = np.zeros_like(x)
    cur = x
    for i in range(1, taps + 1):
        cur = lp(cur, damp, 1) * fb
        shifted = np.zeros_like(x)
        shifted[d * i:] = cur[: len(x) - d * i]
        # ping-pong
        if i % 2:
            wet[:, 0] += shifted[:, 1] * 0.6 + shifted[:, 0] * 0.4
            wet[:, 1] += shifted[:, 0] * 0.4
        else:
            wet[:, 1] += shifted[:, 0] * 0.6 + shifted[:, 1] * 0.4
            wet[:, 0] += shifted[:, 1] * 0.4
    return out + wet * mix


def simple_reverb(x, mix=0.18, size=0.45):
    n = int(size * SR)
    t = np.arange(n) / SR
    ir = rng_global.standard_normal((n, 2)) * np.exp(-t * 7)[:, None]
    ir = lp(ir[:, 0], 5000, 1)[:, None] * np.ones((1, 2)) * 0.5 + ir * 0.5
    from scipy.signal import fftconvolve
    wet = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    wet /= (np.max(np.abs(wet)) + 1e-9) / (np.max(np.abs(x)) + 1e-9)
    return x * (1 - mix * 0.3) + wet * mix


# ---------- composition engine ----------
SCALES = {
    "minor_pent": [0, 3, 5, 7, 10],
    "major_pent": [0, 2, 4, 7, 9],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
    "minor": [0, 2, 3, 5, 7, 8, 10],
}
CH = {
    "m": [0, 3, 7], "M": [0, 4, 7], "m7": [0, 3, 7, 10], "M7": [0, 4, 7, 11],
    "7": [0, 4, 7, 10], "m9": [0, 3, 7, 10, 14], "M9": [0, 4, 7, 11, 14],
}


def steps(pattern):
    """'x..x' -> list of (index, level) ; X = accent, x = normal, o = ghost."""
    out = []
    for i, c in enumerate(pattern.replace(" ", "").replace("|", "")):
        if c == "X":
            out.append((i, 1.0))
        elif c == "x":
            out.append((i, 0.75))
        elif c == "o":
            out.append((i, 0.4))
    return out


def render(cfg, path):
    bpm = cfg["bpm"]
    beat = 60.0 / bpm
    step_t = beat / 4
    bars = cfg["bars"]
    bar_t = beat * 4
    total = bars * bar_t + 2.5
    m = Mix(total)
    rng = np.random.default_rng(cfg["seed"])
    swing = cfg.get("swing", 0.0)
    chords = cfg["chords"]  # list of (root_midi, quality) one per bar, loops
    scale = SCALES[cfg["scale"]]
    key = cfg["key"]

    kick_times = []

    # lead motif per chord (deterministic)
    motifs = {}
    for ci, (root, q) in enumerate(chords):
        tones = [root + i for i in CH[q]]
        pool = [key + 12 * o + s for o in (1, 2) for s in scale]
        motif = []
        for i in range(16):
            if i in cfg.get("lead_rhythm_steps", []):
                if i % 4 == 0:
                    cand = [t + 12 for t in tones] + [t + 24 for t in tones]
                    motif.append(int(rng.choice(cand)))
                else:
                    played = [x for x in motif if x is not None]
                    near = played[-1] if played else pool[len(pool) // 2]
                    cand = sorted(pool, key=lambda p: abs(p - near))[:4]
                    motif.append(int(rng.choice(cand)))
            else:
                motif.append(None)
        motifs[ci] = motif

    def layers_for(bar):
        for (a, b, ls) in cfg["sections"]:
            if a <= bar < b:
                return ls
        return set()

    for bar in range(bars):
        ls = layers_for(bar)
        ci = bar % len(chords)
        root, q = chords[ci]
        tones = [root + i for i in CH[q]]
        t0 = bar * bar_t
        for i in range(16):
            ts = t0 + i * step_t + (swing * step_t if i % 2 else 0)
            # drums
            if "kick" in ls:
                for idx, lv in steps(cfg["kick"]):
                    if idx == i:
                        m.add("drums", kick(decay=cfg.get("kick_decay", 0.32), f0=cfg.get("kick_f0", 52)), ts, 0.95 * lv)
                        kick_times.append(ts)
            if "snare" in ls:
                for idx, lv in steps(cfg.get("snare", "")):
                    if idx == i:
                        m.add("drums", snare(tone=cfg.get("snare_tone", 190)), ts, 0.6 * lv, 0.05)
            if "clap" in ls:
                for idx, lv in steps(cfg.get("clap", "")):
                    if idx == i:
                        m.add("drums", clap(), ts, 0.5 * lv, -0.05)
            if "hat" in ls:
                for idx, lv in steps(cfg.get("hat", "")):
                    if idx == i:
                        m.add("drums", hat(0.035), ts, 0.26 * lv, 0.25 if i % 4 else -0.2)
            if "ohat" in ls:
                for idx, lv in steps(cfg.get("ohat", "")):
                    if idx == i:
                        m.add("drums", hat(0.16, 6000), ts, 0.28 * lv, 0.3)
            if "rim" in ls:
                for idx, lv in steps(cfg.get("rim", "")):
                    if idx == i:
                        m.add("drums", rim(), ts, 0.4 * lv, 0.35)
            if "tom" in ls:
                for idx, lv in steps(cfg.get("tom", "")):
                    if idx == i:
                        m.add("drums", tom(cfg.get("tom_f", 110)), ts, 0.5 * lv, -0.3)

            # bass
            if "bass" in ls:
                for idx, lv in steps(cfg.get("bass", "")):
                    if idx == i:
                        # find length until next bass step
                        nxt = [j for j, _ in steps(cfg["bass"]) if j > i]
                        ln = ((nxt[0] if nxt else 16) - i) * step_t * cfg.get("bass_len", 0.9)
                        n = int(ln * SR)
                        note = root + cfg.get("bass_oct", -24)
                        if cfg.get("bass_walk") and (i // 4) % 4 == 3:
                            note += int(rng.choice([7, 12, 0]))
                        sig = wave(cfg.get("bass_wave", "saw"), mtof(note), n)
                        sig = lp(sig, cfg.get("bass_cut", 420)) * env(n, 0.004, 0.08, 0.75, 0.04)
                        sub = wave("sine", mtof(note), n) * env(n, 0.004, 0.05, 0.9, 0.04)
                        m.add("bass", sig * 0.55 + sub * 0.5, ts, 0.8 * lv)

            # chord stabs / pad
            if "chord" in ls:
                for idx, lv in steps(cfg.get("chord_pat", "")):
                    if idx == i:
                        nxt = [j for j, _ in steps(cfg["chord_pat"]) if j > i]
                        ln = ((nxt[0] if nxt else 16) - i) * step_t * cfg.get("chord_len", 0.9)
                        n = int(ln * SR)
                        stab = np.zeros(n)
                        for k, tn in enumerate(tones):
                            stab += wave(cfg.get("chord_wave", "saw"), mtof(tn + 12 * cfg.get("chord_oct", 0)), n, 0.006)
                        stab = lp(stab, cfg.get("chord_cut", 2400)) / len(tones)
                        stab *= env(n, cfg.get("chord_a", 0.004), 0.12, 0.45, 0.08)
                        m.add("music", stab, ts, 0.5 * lv, 0.0)
            if "pad" in ls and i == 0:
                n = int(bar_t * 1.05 * SR)
                pad = np.zeros(n)
                for k, tn in enumerate(tones):
                    pad += wave("saw", mtof(tn), n, 0.01)
                pad = lp(pad, cfg.get("pad_cut", 1500)) / len(tones)
                pad *= env(n, 0.5, 0.3, 0.8, 0.6)
                m.add("music", pad, ts, 0.4, 0.0)

            # arpeggio
            if "arp" in ls:
                for idx, lv in steps(cfg.get("arp_pat", "")):
                    if idx == i:
                        k = (idx // 1) % len(tones)
                        note = tones[k] + 12 * cfg.get("arp_oct", 1)
                        if (bar // 2) % 2:
                            note += 12 if k == len(tones) - 1 else 0
                        n = int(step_t * 1.6 * SR)
                        sig = wave(cfg.get("arp_wave", "square"), mtof(note), n)
                        sig = lp(sig, cfg.get("arp_cut", 3200)) * env(n, 0.002, 0.07, 0.3, 0.06)
                        m.add("lead", sig, ts, 0.28 * lv, 0.4 if (idx // 2) % 2 else -0.4)

            # lead melody
            if "lead" in ls:
                note = motifs[ci][i]
                if note is not None:
                    n = int(step_t * cfg.get("lead_len", 2.2) * SR)
                    sig = wave(cfg.get("lead_wave", "saw"), mtof(note), n, 0.004)
                    sig = lp(sig, cfg.get("lead_cut", 3500)) * env(n, 0.01, 0.1, 0.55, 0.12)
                    m.add("lead", sig, ts, 0.3, 0.1)

    # sidechain duck
    duck = np.ones(m.n)
    depth = cfg.get("duck", 0.55)
    tau = cfg.get("duck_tau", 0.11)
    for kt in kick_times:
        s = int(kt * SR)
        e = min(m.n, s + int(0.35 * SR))
        tt = np.arange(e - s) / SR
        duck[s:e] = np.minimum(duck[s:e], 1 - depth * np.exp(-tt / tau))
    if depth > 0:
        m.buses["bass"] *= duck[:, None]
        m.buses["music"] *= duck[:, None]

    lead = echo(m.buses["lead"], beat * cfg.get("echo_beats", 0.75), cfg.get("echo_fb", 0.45), mix=cfg.get("echo_mix", 0.45))
    mix = (m.buses["drums"] * cfg.get("g_drums", 1.0)
           + m.buses["bass"] * cfg.get("g_bass", 1.0)
           + m.buses["music"] * cfg.get("g_music", 1.0)
           + lead * cfg.get("g_lead", 1.0))
    mix = simple_reverb(mix, cfg.get("reverb", 0.18))

    # master: gentle glue + normalize + fades
    mix = np.tanh(mix * 1.15)
    mix = mix[: int((bars * bar_t + 2.0) * SR)]
    peak = np.max(np.abs(mix))
    mix = mix / peak * 0.62
    fi = int(0.05 * SR)
    fo = int(2.0 * SR)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5

    pcm = (mix * 32767).astype(np.int16)
    wav = path + ".wav"
    import wave as wv
    with wv.open(wav, "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "112k", path + ".mp3"], check=True)
    os.remove(wav)
    print("rendered", path + ".mp3", f"{(bars * bar_t + 2):.0f}s")


A = 57  # A3
TRACKS = {
    # 1. Four-on-the-floor house, A minor
    "neon-nights": dict(
        bpm=124, bars=32, seed=11, key=57, scale="minor_pent",
        chords=[(57, "m7"), (53, "M7"), (60, "M"), (55, "7")],
        kick="X...X...X...X...", clap="....X.......X...", hat="..x...x...x...x.", ohat="..x...x...x...x.",
        bass="..x...x...x...x.", bass_wave="saw", bass_cut=520, bass_len=0.8,
        chord_pat="x..x..x...x..x..", chord_wave="saw", chord_cut=2600, chord_len=0.8,
        arp_pat="xxxxxxxxxxxxxxxx", arp_wave="square", arp_cut=2800, arp_oct=1,
        lead_rhythm_steps=[0, 3, 6, 8, 10, 14], lead_wave="saw", lead_cut=3200,
        sections=[(0, 4, {"kick", "hat"}), (4, 8, {"kick", "hat", "bass", "ohat"}),
                  (8, 12, {"kick", "hat", "bass", "ohat", "clap", "chord"}),
                  (12, 16, {"kick", "hat", "bass", "ohat", "clap", "chord", "arp"}),
                  (16, 20, {"pad", "arp", "hat"}),
                  (20, 28, {"kick", "hat", "bass", "ohat", "clap", "chord", "arp", "lead"}),
                  (28, 32, {"kick", "hat", "ohat", "clap", "bass", "chord", "arp", "lead"})],
        duck=0.6, echo_beats=0.75, echo_mix=0.4),
    # 2. Disco-funk groove, D dorian
    "golden-hour": dict(
        bpm=112, bars=32, seed=23, key=50, scale="dorian", swing=0.12,
        chords=[(50, "m9"), (50, "m9"), (55, "7"), (55, "7"), (53, "M9"), (52, "m7"), (50, "m9"), (57, "7")],
        kick="X...X...X...X...", clap="....X.......X...", hat="x.xxx.xxx.xxx.xx", ohat="..x...x...x...x.",
        bass="x..xx.x.x..xx.x.", bass_wave="square", bass_cut=700, bass_len=0.7, bass_walk=True, bass_oct=-24,
        chord_pat="..x...x..x..x...", chord_wave="saw", chord_cut=3000, chord_len=0.55, chord_oct=0,
        arp_pat="x.x.x.x.x.x.x.x.", arp_wave="tri", arp_cut=4000, arp_oct=2,
        lead_rhythm_steps=[0, 2, 3, 6, 8, 11, 12, 14], lead_wave="square", lead_cut=2600, lead_len=1.6,
        sections=[(0, 4, {"kick", "hat", "bass"}),
                  (4, 8, {"kick", "hat", "bass", "clap", "chord"}),
                  (8, 16, {"kick", "hat", "bass", "clap", "chord", "ohat", "arp"}),
                  (16, 18, {"hat", "chord", "pad"}),
                  (18, 32, {"kick", "hat", "bass", "clap", "chord", "ohat", "arp", "lead"})],
        duck=0.25, echo_beats=0.75, echo_mix=0.3, reverb=0.16),
    # 3. Boom-bap hip-hop, E minor 9
    "block-party": dict(
        bpm=92, bars=28, seed=5, key=52, scale="minor_pent", swing=0.18,
        chords=[(52, "m9"), (52, "m9"), (48, "M9"), (50, "7")],
        kick="X.....o.X.o.....", snare="....X.......X...", hat="x.x.x.x.x.x.x.x.", ohat="......o.......o.",
        kick_decay=0.4, kick_f0=46, snare_tone=175,
        bass="X.....x.x.o.....", bass_wave="sine", bass_cut=300, bass_len=0.95, bass_oct=-24,
        chord_pat="x.......x.......", chord_wave="tri", chord_cut=2200, chord_len=1.9, chord_a=0.01,
        arp_pat="", lead_rhythm_steps=[0, 3, 6, 10, 12], lead_wave="tri", lead_cut=2400, lead_len=2.5,
        sections=[(0, 4, {"chord", "hat"}), (4, 8, {"kick", "snare", "hat", "chord", "bass"}),
                  (8, 16, {"kick", "snare", "hat", "chord", "bass", "ohat", "lead"}),
                  (16, 20, {"chord", "hat", "bass"}),
                  (20, 28, {"kick", "snare", "hat", "chord", "bass", "ohat", "lead"})],
        duck=0.0, echo_beats=0.75, echo_mix=0.35, reverb=0.2, g_music=1.1),
    # 4. Synthwave cruiser, F# minor
    "midnight-drive": dict(
        bpm=100, bars=32, seed=41, key=54, scale="minor", 
        chords=[(54, "m"), (50, "M"), (57, "M"), (52, "m")],
        kick="X.......X..o....", snare="....X.......X...", hat="x.x.x.x.x.x.x.x.", ohat="..............x.",
        kick_decay=0.35, kick_f0=50, snare_tone=200,
        bass="xxxxxxxxxxxxxxxx", bass_wave="saw", bass_cut=480, bass_len=0.7, bass_oct=-24,
        chord_pat="X...............", chord_wave="saw", chord_cut=1800, chord_len=4.0, chord_a=0.2,
        arp_pat="xxxxxxxxxxxxxxxx", arp_wave="saw", arp_cut=2200, arp_oct=1,
        lead_rhythm_steps=[0, 6, 8, 12], lead_wave="saw", lead_cut=3000, lead_len=3.0,
        sections=[(0, 4, {"pad", "arp"}), (4, 8, {"pad", "arp", "kick", "hat", "bass"}),
                  (8, 16, {"pad", "arp", "kick", "snare", "hat", "bass", "ohat"}),
                  (16, 20, {"pad", "arp", "lead"}),
                  (20, 32, {"pad", "arp", "kick", "snare", "hat", "bass", "ohat", "lead", "chord"})],
        duck=0.35, echo_beats=0.75, echo_mix=0.5, reverb=0.28, g_lead=1.1),
    # 5. Latin dembow party, C minor
    "fiesta-latina": dict(
        bpm=96, bars=32, seed=77, key=48, scale="minor_pent",
        chords=[(48, "m"), (44, "M"), (51, "M"), (46, "M")],
        kick="X..xX..xX..xX..x", snare="...x..x....x..x.", hat="x.x.x.x.x.x.x.x.", rim="...o..o....o..o.",
        ohat="..x...x...x...x.", tom="", kick_decay=0.3, kick_f0=55, snare_tone=210,
        bass="X..x..x.X..x..x.", bass_wave="sine", bass_cut=300, bass_len=0.85, bass_oct=-24,
        chord_pat="x..x..x.x..x..x.", chord_wave="square", chord_cut=2000, chord_len=0.7,
        arp_pat="x.x.x.x.x.x.x.x.", arp_wave="tri", arp_cut=3500, arp_oct=2,
        lead_rhythm_steps=[0, 3, 4, 7, 8, 11, 12, 15], lead_wave="square", lead_cut=2400, lead_len=1.4,
        sections=[(0, 2, {"kick", "hat"}), (2, 4, {"kick", "snare", "hat", "bass"}),
                  (4, 12, {"kick", "snare", "hat", "bass", "chord", "rim"}),
                  (12, 16, {"kick", "snare", "hat", "bass", "chord", "rim", "arp"}),
                  (16, 18, {"chord", "arp", "hat"}),
                  (18, 32, {"kick", "snare", "hat", "bass", "chord", "rim", "arp", "lead", "ohat"})],
        duck=0.3, echo_beats=0.75, echo_mix=0.35, reverb=0.16),
}

if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    only = sys.argv[2:] or list(TRACKS)
    for name in only:
        render(TRACKS[name], os.path.join(out, name))
