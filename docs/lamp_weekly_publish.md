# Lamp Weekly Publish Workflow

Prepare seven days at a time in `lamp/week_manifest.json`.

For each day, fill:

- `date`
- `title`
- `country`
- `category`
- `quote`
- `live_url`
- `video`
- `audio`

Put videos in `lamp/video/` and audio files in `lamp/mp3/`, then point each manifest row at the exact file.

Daily publish command:

```bash
python3 scripts/publish_lamp_week.py --date 2026-06-03 --commit --push
```

What it does:

- Reads the matching date from `lamp/week_manifest.json`
- Converts MP4 to browser-friendly fast-start format before upload
- Uploads the MP4 and MP3 to R2
- Updates `assets/data/lamp.json`
- Commits and pushes the site update when `--commit --push` is included

Check a day without uploading or changing `lamp.json`:

```bash
python3 scripts/publish_lamp_week.py --date 2026-06-03 --check
```
