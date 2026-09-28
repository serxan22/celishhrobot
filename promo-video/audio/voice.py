"""
The narrator: a male voice introducing the website, line by line, on the
film's clock. Uses Kokoro (open-weight neural TTS, Apache-2.0) locally via
kokoro-onnx; model files from github.com/thewh1teagle/kokoro-onnx releases.

Writes public/audio/vo.wav and audio/vo.json (each line's start, end, text),
which score.py reads to duck the music under the voice.

    pip install kokoro-onnx soundfile
    python3 audio/voice.py [--models=/path/to/kokoro-models] [--voice=am_michael]

Every line is the site's own wording where the site has words for it
(the motto, § 01, § 02, § 03, § 04, § 06, § 07). A human voice artist can
replace vo.wav line for line using audio/vo.json as the cue sheet.
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SR = 48000

arg = {a.split("=")[0][2:]: a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--") and "=" in a}
MODELS = arg.get("models", os.environ.get("KOKORO_MODELS", "/home/user/tts"))
VOICE = arg.get("voice", "am_michael")
SPEED = float(arg.get("speed", "0.9"))

SEC = json.load(open(os.path.join(HERE, "cues.json")))["sections"]
S = {k: SEC[k]["start"] for k in ["identity", "threshold", "events", "seminars", "blog", "newsroom", "team", "record", "mobile", "finale"]}

# (start in seconds, text). Starts are tied to the scenes they narrate.
LINES = [
    (S["identity"] + 0.95, "ADA Law Society."),
    (S["identity"] + 2.5, "Founded in twenty nineteen at ADA University."),
    (S["threshold"] + 0.6, "Our new home online: your gateway to the legal world."),
    (S["threshold"] + 4.25, "Law is learned in lecture halls, understood in argument."),
    (S["events"] + 1.9, "Competitions argued before a full bench. Debates that run for weeks."),
    (S["events"] + 6.35, "Every final, on the record."),
    (S["seminars"] + 0.5, "A seminar is a small room, and a hard question."),
    (S["blog"] + 1.75, "The Law Blog: case notes and commentary, written in the language each author thinks in."),
    (S["blog"] + 8.8, "Read it. Question it."),
    (S["newsroom"] + 0.7, "The newsroom keeps the record of everything the Society does."),
    (S["team"] + 0.4, "And behind it, the people: a board and four committees. Thirty students. One Society."),
    (S["record"] + 0.4, "Since twenty nineteen, the record has only grown."),
    (S["mobile"] + 0.3, "Now, on every screen, in English, Azerbaijani and Russian."),
    (S["finale"] + 1.45, "Come and argue with us."),
    (S["finale"] + 3.7, "ADA Law Society dot com."),
]

# ADA is said as a word, "Ada" (island, in Azerbaijani), not as letters, and
# with an open first vowel rather than the English name's "AY-da".
PRONOUNCE = {"ˈeɪdə": "ˈɑːdə"}


def main():
    from kokoro_onnx import Kokoro

    k = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
    total = SEC["total"] + 0.25
    bus = np.zeros(int(total * SR))
    record = []
    hp = butter(2, 70 / (SR / 2), btype="high", output="sos")
    for i, (start, text) in enumerate(LINES):
        nxt = LINES[i + 1][0] if i + 1 < len(LINES) else total - 0.3
        speed = SPEED
        for _ in range(4):
            ph = k.tokenizer.phonemize(text, "en-us")
            for a, b in PRONOUNCE.items():
                ph = ph.replace(a, b)
            audio, sr = k.create(ph, voice=VOICE, speed=speed, is_phonemes=True)
            audio = trim(audio, sr)
            dur = len(audio) / sr
            if start + dur <= nxt - 0.12 or speed >= 1.08:
                break
            speed = min(1.08, speed * ((dur + 0.15) / (nxt - start)))  # fit the window
        x = resample_poly(audio.astype(np.float64), SR, sr)
        x = sosfilt(hp, x)
        # even out lines: each to the same speech level
        rms = np.sqrt(np.mean(x[np.abs(x) > 0.02] ** 2)) + 1e-9
        x = x * (0.11 / rms)
        i0 = int(start * SR)
        bus[i0:i0 + len(x)] += x[: max(0, len(bus) - i0)]
        record.append({"start": round(start, 3), "end": round(start + len(x) / SR, 3), "speed": round(speed, 3), "text": text})
        print(f"{start:6.2f}–{start + len(x) / SR:6.2f}s  x{speed:.2f}  {text}")
        if start + len(x) / SR > nxt:
            print(f"   ! overlaps the next line by {start + len(x) / SR - nxt:.2f}s")
    # a touch of the room, so the voice sits in the film rather than on it
    room = np.convolve(bus, np.exp(-np.arange(int(0.35 * SR)) / (0.08 * SR)) * 0.0009, mode="full")[: len(bus)]
    x = bus + room
    x = np.tanh(x * 1.6) / 1.6  # gentle limiting
    peak = np.max(np.abs(x)) + 1e-9
    x = x * (0.84 / peak)
    stereo = np.stack([x, x], axis=1)
    os.makedirs(os.path.join(ROOT, "public", "audio"), exist_ok=True)
    sf.write(os.path.join(ROOT, "public", "audio", "vo.wav"), stereo, SR, subtype="PCM_16")
    json.dump({"voice": VOICE, "lines": record}, open(os.path.join(HERE, "vo.json"), "w"), indent=2)
    print(f"vo.wav: {len(x) / SR:.2f}s, voice {VOICE}")


def trim(a, sr, thresh=0.008):
    idx = np.where(np.abs(a) > thresh)[0]
    if not len(idx):
        return a
    lo = max(0, idx[0] - int(0.02 * sr))
    hi = min(len(a), idx[-1] + int(0.12 * sr))
    out = a[lo:hi].copy()
    f = int(0.012 * sr)
    out[:f] *= np.linspace(0, 1, f)
    out[-f:] *= np.linspace(1, 0, f)
    return out


if __name__ == "__main__":
    main()
