# 10块到10万：八大游戏对数氪金曲线
Link: https://www.bilibili.com/video/BV1dvnB6sE6m
**From ¥10 to ¥100,000 — the log-scale spending curve of 8 games**

A 5½-minute (331.9 s, 1920×1080 @ 30 fps) bilingual (中文 / English) explainer video,
rendered entirely from code: every frame is drawn on an HTML canvas, captured with
headless Chrome, and encoded with ffmpeg. The soundtrack is mixed in Python from the
game soundtracks plus sound effects built from recorded acoustic instruments.

The video compares what ¥10 → ¥100,000 actually buys in eight games, plotted on a
logarithmic money axis:

| Round | Matchup |
|-------|---------|
| 1 | 原神 Genshin Impact vs 恋与深空 Love and Deepspace |
| 2 | 逆水寒 Justice Online vs 无尽冬日 Whiteout Survival |
| 3 | 王者荣耀 Honor of Kings vs 三角洲行动 Delta Force |
| 4 | 黑神话：悟空 Black Myth: Wukong vs 欢乐斗地主 Happy Landlord |
| Finale | All eight "consumer value curves" on one chart |

![cover](cover/thumbnail.jpg)

## Repository layout

| Path | Purpose |
|------|---------|
| `data/script.js` | Narration, shot list and timing (the single source of truth for the edit) |
| `data/cues.json` | Generated timeline + SFX cue list (output of `tools/export_cues.mjs`) |
| `data/clips.json` | Frame count of each gameplay clip in `assets/clips/` |
| `render/index.html` | Canvas page that headless Chrome loads; exposes `init()` / `renderAt(t)` |
| `render/engine.js` | Drawing engine: timeline, palette, text, stickers, charts, subtitles |
| `render/scenes.js` | Per-shot scene code (S01 … S36) |
| `tools/server.mjs` | Tiny static file server for the render page |
| `tools/render.mjs` | Parallel renderer: N Chrome workers → ffmpeg segments → concat |
| `tools/stills.mjs` | Render individual frames for checking (`node tools/stills.mjs out/check 12 60.5`) |
| `tools/export_cues.mjs` | Runs the timeline headlessly and writes `data/cues.json` |
| `tools/mix.py` | Soundtrack mixer: music bed per round + SFX layer + ducking → `out/mix_raw.wav` |
| `tools/energy.py` | Helper: print per-second loudness of audio files (used for aligning music drops) |
| `tools/cover.mjs` | Renders the YouTube thumbnail from `cover/cover.html` |
| `assets/clips/` | Gameplay footage as JPEG frame sequences |
| `assets/icons/`, `assets/emoji/` | Game icons and emoji stickers |
| `assets/fonts/` | Noto Sans SC, Poppins, Smiley Sans (all SIL OFL) |
| `assets/music/` | Soundtrack sources (mp3) |
| `vcsl/` | Instrument samples used for SFX (subset of VCSL, CC0, stored as mp3) |
| `subtitles/` | Final bilingual `.srt` |
| `cover/` | Thumbnail source and rendered 1280×720 PNG/JPG |
| `docs/storyboard.md` | Full storyboard and fact-check notes for the script (中文) |

## Requirements

- **Node.js ≥ 18** (tested with 24) — `npm install` pulls Puppeteer and its headless Chrome
- **Python ≥ 3.10** with `numpy`, `scipy`, `soundfile` (libsndfile ≥ 1.1 for mp3 support)
- **ffmpeg** on `PATH`, or set `FFMPEG=/path/to/ffmpeg`

```bash
npm install
python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
```

## Build the video

```bash
# 1. timeline + SFX cues (rerun after editing data/script.js or render/scenes.js)
npm run cues

# 2. soundtrack → out/mix_raw.wav  (≈6 min, CPU heavy)
python tools/mix.py

# 3. picture → out/video_noaudio.mp4   (args: out.mp4 [workers] [t0] [t1] [scale])
node tools/render.mjs out/video_noaudio.mp4 24

# 4. mux picture + sound
ffmpeg -i out/video_noaudio.mp4 -i out/mix_raw.wav -map 0:v -map 1:a \
       -c:v copy -c:a aac -b:a 320k -shortest out/final.mp4
```

Handy shortcuts while editing:

```bash
npm run preview                               # half-resolution full preview → out/preview.mp4
node tools/render.mjs out/part.mp4 8 120 150  # render only 120–150 s
node tools/stills.mjs out/check 2 60 200      # still frames → out/check_2.00.jpg …
npm run cover                                 # thumbnail → cover/thumbnail.{png,jpg}
```

Everything written to `out/` is build output and is git-ignored.

## Notes

- **Audio is stored as mp3** to keep the repo small. The original WAVs (up to 85 MB each)
  are over GitHub's comfortable size limit. A full mix from the mp3 sources lands within
  0.1 dB of the original WAV mix, with SFX timing identical.
- **VCSL subset**: percussion folders are kept whole (the mixer picks samples by index),
  while for pitched instruments (piano, harp, kalimba, glock, marimba, tubular bells,
  vibraphone) only the samples the current cue list actually uses are included. If you add
  new notes, fetch the full library from
  [sgossner/VCSL](https://github.com/sgossner/VCSL) and convert it with
  `ffmpeg -i in.wav -c:a libmp3lame -q:a 2 out.mp3`.
- **Final video** is not in the repo (≈350 MB). Rebuild it with the steps above, or attach
  it to a GitHub Release.

## Credits & licensing

- Code in this repository: yours to license (add a `LICENSE` file before publishing).
- Fonts: [Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC),
  [Poppins](https://fonts.google.com/specimen/Poppins),
  [Smiley Sans 得意黑](https://github.com/atelier-anchor/smiley-sans) — SIL Open Font License.
- Instrument samples: [Versilian Community Sample Library (VCSL)](https://github.com/sgossner/VCSL) — CC0.
- Game footage, icons and game soundtracks are © their respective publishers
  (miHoYo/HoYoverse, Papergames, NetEase, Century Games, Tencent, Game Science), and the
  user BGM 「ようこそ喫茶紅魔館へ」 is © 狐の工作室. They are included for commentary
  purposes only and are **not** covered by this repository's license.
