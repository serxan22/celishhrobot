"""
In Session — original score and sound design, synthesised from the film's cue
sheet (audio/cues.json, written by `npm run cues` from src/lib/timing.ts).

Writes two stems the film mixes (public/audio/score.wav, public/audio/sfx.wav)
and a reference mix (public/audio/mix.wav). The score is deliberately
restrained — a low drone, a slow pad in D minor that warms toward F and B-flat
for the people and resolves to an open D, a soft felt pulse only where the
picture cuts on a beat — so it can be replaced by a licensed track later
without losing the sound design, which stays on its own stem.

    python3 audio/score.py
"""
import json
import os

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CUES = json.load(open(os.path.join(HERE, "cues.json")))
SEC = CUES["sections"]
TOTAL = SEC["total"] + 0.25
N = int(TOTAL * SR)
rng = np.random.default_rng(2019)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def t_axis(n):
    return np.arange(n) / SR


def lowpass(x, fc, order=2):
    sos = butter(order, min(fc, SR * 0.45) / (SR / 2), btype="low", output="sos")
    return sosfilt(sos, x, axis=0)


def highpass(x, fc, order=2):
    sos = butter(order, fc / (SR / 2), btype="high", output="sos")
    return sosfilt(sos, x, axis=0)


def bandpass(x, lo, hi, order=2):
    sos = butter(order, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], btype="band", output="sos")
    return sosfilt(sos, x, axis=0)


def swept_lowpass(x, f0, f1, block=256):
    """Lowpass whose cutoff moves from f0 to f1 over the signal (mono)."""
    out = np.zeros_like(x)
    zi = np.zeros(2)
    nb = int(np.ceil(len(x) / block))
    for i in range(nb):
        fc = f0 * (f1 / f0) ** (i / max(nb - 1, 1))
        b, a = butter(1, min(fc, SR * 0.45) / (SR / 2), btype="low")
        seg = x[i * block:(i + 1) * block]
        if len(zi) != max(len(a), len(b)) - 1:
            zi = np.zeros(max(len(a), len(b)) - 1)
        y, zi = lfilter(b, a, seg, zi=zi)
        out[i * block:(i + 1) * block] = y
    return out


def reverb_ir(seconds=2.6, predelay=0.012, bright=5200):
    n = int(seconds * SR)
    t = t_axis(n)
    ir = np.zeros((n, 2))
    for ch in range(2):
        noise = rng.standard_normal(n)
        noise = lowpass(noise, bright, 1)
        env = np.exp(-t / (seconds / 6.2))
        ir[:, ch] = noise * env
        # a few early reflections
        for d, g in [(0.011, 0.5), (0.019, 0.35), (0.029, 0.28), (0.041, 0.2)]:
            k = int((d + 0.003 * ch) * SR)
            ir[k, ch] += g
    pd = int(predelay * SR)
    ir = np.vstack([np.zeros((pd, 2)), ir])
    return ir / np.sqrt((ir ** 2).sum(axis=0, keepdims=True))


IR = reverb_ir()
IR_LONG = reverb_ir(5.5, 0.02, 4200)


def reverb(x, wet=0.35, ir=IR):
    """Stereo convolution reverb; x is (n, 2)."""
    y = np.zeros((len(x) + len(ir) - 1, 2))
    for ch in range(2):
        y[:, ch] = fftconvolve(x[:, ch], ir[:, ch])
    y = y[: len(x)]
    return x * (1 - wet) + y * wet


def pan(mono, p=0.0):
    """Equal-power pan, p in -1..1."""
    a = (p + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], axis=1)


def place(bus, sig, t0):
    i = int(t0 * SR)
    if i >= len(bus):
        return
    j = min(len(bus), i + len(sig))
    bus[i:j] += sig[: j - i]


def env(n, attack, release, curve=2.0):
    a = int(attack * SR)
    r = int(release * SR)
    e = np.ones(n)
    if a > 0:
        e[:a] = np.linspace(0, 1, a) ** curve
    if r > 0:
        e[-r:] *= np.linspace(1, 0, r) ** curve
    return e


# ------------------------------------------------------------------ voices --

def pad_voice(freqs, dur, bright=1800, detune=0.004, attack=1.6, release=2.2):
    """A soft additive pad: each note a few detuned voices of a mellow wave."""
    n = int(dur * SR)
    t = t_axis(n)
    out = np.zeros((n, 2))
    for k, f in enumerate(freqs):
        for v, d in enumerate([-detune, 0.0, detune]):
            ph = rng.uniform(0, 2 * np.pi)
            wave = np.zeros(n)
            for h in range(1, 7):
                if f * h > 7000:
                    break
                wave += np.sin(2 * np.pi * f * (1 + d) * h * t + ph * h) / (h ** 1.9)
            lfo = 1 + 0.08 * np.sin(2 * np.pi * (0.07 + 0.013 * k + 0.021 * v) * t + ph)
            out += pan(wave * lfo, (v - 1) * 0.55 + (k - len(freqs) / 2) * 0.08)
    out = lowpass(out, bright, 2)
    out *= env(n, attack, release)[:, None]
    return out / (len(freqs) * 3)


def felt(note, dur=3.2, bright=2600, gain=1.0):
    """A felt-piano note: decaying partials, a soft hammer."""
    f = midi(note)
    n = int(dur * SR)
    t = t_axis(n)
    x = np.zeros(n)
    for h in range(1, 8):
        tau = 1.6 / (h ** 0.9)
        inharm = 1 + 0.0004 * h * h
        x += np.sin(2 * np.pi * f * h * inharm * t) * np.exp(-t / tau) / (h ** 1.7)
    hammer = lowpass(rng.standard_normal(n) * np.exp(-t / 0.004), 1800, 1) * 0.12
    x = lowpass(x + hammer, bright, 2)
    x *= env(n, 0.004, 0.4, 1.0)
    return x * gain * 0.5


def kick(gain=1.0):
    n = int(0.55 * SR)
    t = t_axis(n)
    f = 46 + 70 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / 0.2)
    click = lowpass(rng.standard_normal(n) * np.exp(-t / 0.002), 3000, 1) * 0.15
    return np.tanh((x + click) * 1.4) * gain * 0.6


def tick(gain=1.0, dur=0.05, lo=3200, hi=9000):
    n = int(dur * SR)
    t = t_axis(n)
    x = bandpass(rng.standard_normal(n), lo, hi) * np.exp(-t / (dur / 5))
    return x * gain


def whoosh(dur=1.2, gain=1.0, rise=0.55):
    n = int(dur * SR)
    t = t_axis(n) / dur
    noise = rng.standard_normal(n)
    x = swept_lowpass(noise, 300, 5200) * 0.5 + swept_lowpass(noise[::-1].copy(), 4200, 400) * 0.5
    shape = np.where(t < rise, (t / rise) ** 2.2, ((1 - t) / (1 - rise)) ** 1.6)
    return highpass(x * shape, 120) * gain


def swell(dur=1.6, gain=1.0, note=62):
    n = int(dur * SR)
    t = t_axis(n) / dur
    noise = swept_lowpass(rng.standard_normal(n), 250, 3800)
    tone = np.zeros(n)
    for f in [midi(note), midi(note + 7), midi(note + 12)]:
        tone += np.sin(2 * np.pi * f * t_axis(n)) * 0.3
    shape = t ** 2.4
    shape[-int(0.04 * SR):] *= np.linspace(1, 0, int(0.04 * SR))
    return (noise * 0.35 + tone * 0.25) * shape * gain


def impact(gain=1.0, dur=2.8):
    n = int(dur * SR)
    t = t_axis(n)
    f = 38 + 26 * np.exp(-t / 0.09)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7)
    body = lowpass(rng.standard_normal(n), 900, 2) * np.exp(-t / 0.11) * 0.5
    return np.tanh((sub + body) * 1.2) * gain * 0.8


def shutter(gain=1.0):
    n = int(0.4 * SR)
    t = t_axis(n)
    thump = np.sin(2 * np.pi * (70 + 40 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.08)
    snap = tick(1.0, 0.06, 1800, 7000)
    x = thump * 0.6
    x[: len(snap)] += snap * 0.5
    return x * gain


def paper(gain=1.0):
    n = int(0.42 * SR)
    t = t_axis(n) / 0.42
    x = bandpass(rng.standard_normal(n), 1400, 7800)
    shape = np.where(t < 0.18, t / 0.18, np.exp(-(t - 0.18) * 7))
    return x * shape * gain * 0.35


def click(gain=1.0):
    n = int(0.08 * SR)
    t = t_axis(n)
    x = bandpass(rng.standard_normal(n), 2000, 6000) * np.exp(-t / 0.0025)
    x += np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.012) * 0.3
    return x * gain


def shimmer(dur=1.6, gain=1.0):
    n = int(dur * SR)
    t = t_axis(n)
    x = np.zeros(n)
    for f, a in [(midi(86), 0.5), (midi(93), 0.35), (midi(98), 0.22), (midi(81), 0.4)]:
        vib = 1 + 0.002 * np.sin(2 * np.pi * 4.6 * t + rng.uniform(0, 6))
        x += np.sin(2 * np.pi * f * np.cumsum(vib) / SR) * a
    return x * env(n, dur * 0.4, dur * 0.55, 1.6) * gain * 0.12


def line_glide(dur=1.3, gain=1.0):
    n = int(dur * SR)
    t = t_axis(n)
    f = 1900 * (2600 / 1900) ** (t / dur)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * 0.08
    return x * env(n, 0.35, 0.7, 1.8) * gain * 0.1


def hit(gain=1.0):
    n = int(1.3 * SR)
    t = t_axis(n)
    sub = np.sin(2 * np.pi * np.cumsum(44 + 50 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.35)
    tone = (np.sin(2 * np.pi * midi(38) * t) + 0.5 * np.sin(2 * np.pi * midi(45) * t)) * np.exp(-t / 0.5) * 0.3
    snap = np.zeros(n)
    s = tick(1.0, 0.05, 1500, 6000)
    snap[: len(s)] = s * 0.4
    return np.tanh((sub + tone + snap) * 1.3) * gain * 0.7


def boom(gain=1.0):
    n = int(6.0 * SR)
    t = t_axis(n)
    sub = np.sin(2 * np.pi * np.cumsum(34 + 30 * np.exp(-t / 0.12)) / SR) * np.exp(-t / 1.6)
    chord = sum(felt(nn, 6.0, 2200, 0.8) for nn in [38, 45, 50, 54, 57, 64])
    return (np.tanh(sub * 1.2) * 0.8 + chord * 0.6) * gain


def ping(gain=1.0):
    n = int(2.4 * SR)
    t = t_axis(n)
    x = sum(np.sin(2 * np.pi * midi(86) * h * t) * np.exp(-t / (1.1 / h)) / h ** 1.4 for h in (1, 2, 3))
    return x * gain * 0.18


# -------------------------------------------------------------------- score --

def build_score():
    bus = np.zeros((N, 2))

    # A low D drone under the whole film, breathing slowly.
    t = t_axis(N)
    drone = np.sin(2 * np.pi * midi(26) * t) * 0.22 + np.sin(2 * np.pi * midi(38) * t) * 0.34 + np.sin(2 * np.pi * midi(45) * t) * 0.1
    drone = np.tanh(drone * 1.1) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.05 * t))
    dr_env = np.clip((t - 0.6) / 3.5, 0, 1) ** 2
    dr_env *= np.clip((SEC["total"] + 0.1 - t) / 1.6, 0, 1)
    # the drone steps aside while the Blog's headline is held in silence
    bs = SEC["blogSeparate"]
    dr_env *= 1 - 0.55 * np.clip((t - bs) / 0.4, 0, 1) * np.clip((SEC["blogLandEnd"] - t) / 0.4, 0, 1)
    bus += pan(drone * dr_env * 0.11, 0)

    # The pad: slow chords, arranged by section.
    D, F, G, A, Bb, C, E = 50, 53, 55, 57, 58, 60, 52
    chords = [
        (SEC["identityOpen"] - 0.4, SEC["events"]["start"] + 0.6, [D, A, C + 12 - 12, E + 12, F + 12]),  # Dm9
        (SEC["events"]["start"] + 0.2, SEC["seminars"]["start"] + 0.6, [D, A, C, F + 12, A + 12]),  # Dm7
        (SEC["seminars"]["start"] + 0.2, SEC["blog"]["start"] + 1.4, [Bb - 12, F, A, C + 12, D + 12]),  # Bbmaj9
        (SEC["blogLandEnd"] - 0.2, SEC["newsroom"]["start"] + 0.6, [G - 12, D, F, A, C + 12]),  # Gm9
        (SEC["newsroom"]["start"] + 0.2, SEC["team"]["start"] + 0.6, [D, A, C, E + 12, F + 12]),  # Dm9
        (SEC["team"]["start"] + 0.2, SEC["record"]["start"] + 0.6, [F - 12, C, E, A, G + 12]),  # Fmaj9
        (SEC["record"]["start"] + 0.2, SEC["mobile"]["start"] + 0.6, [Bb - 12, F, A, D + 12, E + 12]),  # Bbmaj7#11-ish
        (SEC["mobile"]["start"] + 0.2, SEC["finaleCard"] - 0.3, [C - 12, G, Bb, D + 12, E + 12]),  # C9sus
        (SEC["finaleCard"] - 0.2, SEC["total"], [D - 12, A - 12, E, F + 1, A]),  # D add9 (open, major third)
    ]
    for start, end, notes in chords:
        dur = end - start + 2.2
        sig = pad_voice([midi(n) for n in notes], dur, bright=1500 if start < SEC["team"]["start"] else 2100)
        place(bus, sig * 0.5, start)

    # The pulse — only where the picture cuts on a beat.
    beat = SEC["beat"]
    first = SEC["eventsFirstCut"]
    k0 = int(np.ceil((SEC["events"]["start"] + 1.0 - first) / beat))
    times = [first + k * beat for k in range(k0, 200) if first + k * beat < SEC["events"]["end"] - 0.3]
    for i, tt in enumerate(times):
        place(bus, pan(kick(0.55 if i % 2 == 0 else 0.35), 0), tt)
        place(bus, pan(tick(0.05, 0.04), 0.3 if i % 2 else -0.3), tt + beat / 2)
    # half-time through the seminars
    tt = SEC["seminars"]["start"] + 0.1
    while tt < SEC["blogSeparate"] - 0.2:
        place(bus, pan(kick(0.3), 0), tt)
        tt += beat * 2
    # the record keeps time in the newsroom
    tt = SEC["newsroom"]["start"] + 0.9
    i = 0
    while tt < SEC["newsroom"]["end"] - 1.6:
        place(bus, pan(kick(0.4 if i % 4 == 0 else 0.22), 0), tt)
        tt += beat
        i += 1
    # a soft arpeggio for the people
    arp = [65, 69, 72, 76, 72, 69]
    tt = SEC["team"]["start"] + 0.5
    i = 0
    while tt < SEC["team"]["end"] - 0.4:
        place(bus, pan(felt(arp[i % len(arp)], 1.8, 2200, 0.16), (i % 2) * 0.5 - 0.25), tt)
        tt += beat / 2
        i += 1

    bus = reverb(bus, 0.32)
    return bus * automation()[:, None]


def automation():
    """The score's level through the film (dB), so it breathes with the picture."""
    s = SEC
    keys = [
        (0.0, -48), (1.6, -26), (s["identityOpen"], -16), (s["identity"]["end"] - 0.6, -9),
        (s["threshold"]["end"] - 1.2, -8), (s["events"]["start"] + 0.4, -5), (s["events"]["end"] - 0.4, -4),
        (s["seminars"]["start"] + 0.6, -10), (s["blogSeparate"] - 0.3, -10), (s["blogSeparate"] + 0.4, -22),
        (s["blogLandEnd"] - 0.2, -20), (s["blogLandEnd"] + 0.8, -9), (s["newsroom"]["start"] + 0.3, -6),
        (s["newsroom"]["end"] - 0.5, -6), (s["team"]["start"] + 0.5, -8), (s["team"]["end"], -8),
        (s["record"]["start"] + 0.4, -11), (s["mobile"]["start"] + 0.3, -13), (s["finale"]["start"], -7),
        (s["finale"]["start"] + 1.3, -5), (s["finale"]["start"] + 1.6, -15), (s["finaleCard"] - 0.3, -14),
        (s["finaleCard"] + 0.4, -4), (s["total"] - 1.6, -9), (s["total"] + 0.25, -60),
    ]
    tt = t_axis(N)
    db = np.interp(tt, [k[0] for k in keys], [k[1] for k in keys])
    return 10 ** (db / 20)


def build_sfx():
    bus = np.zeros((N, 2))
    for c in CUES["cues"]:
        k, t0, g = c["kind"], c["t"], c.get("gain", 1.0)
        p = c.get("pan", 0.0)
        if k == "line":
            sig = pan(line_glide(c.get("dur", 1.3), g), 0)
        elif k == "pluck":
            sig = pan(felt(c.get("note", 62), 3.2, 2600, g), p)
        elif k == "swell":
            sig = pan(swell(c.get("dur", 1.4), g), p)
        elif k == "impact":
            sig = pan(impact(g), 0)
        elif k == "shimmer":
            sig = pan(shimmer(c.get("dur", 1.6), g), p)
        elif k == "whoosh":
            sig = pan(whoosh(c.get("dur", 1.0), g), p)
        elif k == "shutter":
            sig = pan(shutter(g), p)
        elif k == "tick":
            sig = pan(tick(g, 0.05), p)
        elif k == "click":
            sig = pan(click(g), 0.1)
        elif k == "paper":
            sig = pan(paper(g), p)
        elif k == "accent":
            sig = pan(felt(c.get("note", 50), 3.6, 1800, g) + felt(c.get("note", 50) + 12, 3.6, 2400, g * 0.4), 0)
        elif k == "hit":
            sig = pan(hit(g), 0)
        elif k == "boom":
            sig = pan(boom(g), 0)
        elif k == "ping":
            sig = pan(ping(g), 0.15)
        else:
            continue
        place(bus, sig, t0)
    wet = reverb(bus, 0.22)
    return reverb(wet, 0.12, IR_LONG)


def master(x, target_peak=0.89):
    # gentle glue: soft-knee saturation, then peak-normalise
    x = np.tanh(x * 1.1) / np.tanh(1.1)
    peak = np.max(np.abs(x)) + 1e-9
    return x * (target_peak / peak)


def fade(x, fin=0.02, fout=1.2):
    n = len(x)
    e = np.ones(n)
    a = int(fin * SR)
    b = int(fout * SR)
    e[:a] = np.linspace(0, 1, a)
    e[-b:] = np.linspace(1, 0, b) ** 1.5
    return x * e[:, None]


def write(name, x):
    path = os.path.join(ROOT, "public", "audio", name)
    wavfile.write(path, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
    rms = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
    print(f"{name}: {len(x) / SR:.2f}s, rms {rms:.1f} dBFS, peak {20 * np.log10(np.max(np.abs(x)) + 1e-9):.1f} dBFS")


if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "public", "audio"), exist_ok=True)
    score = build_score()
    sfx = build_sfx()
    score_m = fade(master(score, 0.6))
    sfx_m = fade(master(sfx, 0.85), 0.0, 0.8)
    write("score.wav", score_m)
    write("sfx.wav", sfx_m)
    mix = master(score_m * 0.72 + sfx_m * 0.8, 0.89)
    write("mix.wav", mix)
