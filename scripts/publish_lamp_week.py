from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from upload_lamp_media_to_r2 import DEFAULT_ENV_FILES, LAMP_JSON, PROJECT_ROOT, load_env_file, r2_put_object


MANIFEST = PROJECT_ROOT / "lamp" / "week_manifest.json"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "lamp"


def project_path(value: str) -> Path:
    path = Path(value)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    return path.resolve()


def load_manifest(path: Path) -> list[dict]:
    if not path.exists():
        raise SystemExit(f"Missing manifest: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    days = data.get("days")
    if not isinstance(days, list):
        raise SystemExit(f"{path} must contain a top-level days list.")
    return days


def day_for_date(days: list[dict], date: str) -> dict:
    matches = [day for day in days if day.get("date") == date]
    if not matches:
        raise SystemExit(f"No lamp manifest entry for {date}. Add it to {MANIFEST}.")
    if len(matches) > 1:
        raise SystemExit(f"Multiple lamp manifest entries for {date}. Keep only one.")
    return matches[0]


def require_text(day: dict, key: str) -> str:
    value = str(day.get(key, "")).strip()
    if not value:
        raise SystemExit(f"Manifest entry {day.get('date')} is missing {key}.")
    return value


def require_file(day: dict, key: str) -> Path:
    value = require_text(day, key)
    path = project_path(value)
    if not path.is_file():
        raise SystemExit(f"Manifest entry {day.get('date')} {key} file not found: {path}")
    return path


def make_faststart_mp4(video: Path, title: str, date: str) -> Path:
    if video.suffix.lower() != ".mp4":
        return video
    output = Path(tempfile.gettempdir()) / f"{slugify(title)}_{date.replace('-', '')}.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(video), "-c", "copy", "-movflags", "+faststart", str(output)],
        check=True,
    )
    return output


def git_commit_and_push(message: str, push: bool) -> None:
    subprocess.run(["git", "-C", str(PROJECT_ROOT), "add", str(LAMP_JSON.relative_to(PROJECT_ROOT))], check=True)
    diff = subprocess.run(
        ["git", "-C", str(PROJECT_ROOT), "diff", "--cached", "--quiet"],
        check=False,
    )
    if diff.returncode == 0:
        print("No lamp.json changes to commit.")
    else:
        subprocess.run(["git", "-C", str(PROJECT_ROOT), "commit", "-m", message], check=True)
    if push:
        subprocess.run(["git", "-C", str(PROJECT_ROOT), "push", "origin", "main"], check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish one day from lamp/week_manifest.json.")
    parser.add_argument("--date", default=dt.date.today().isoformat(), help="Date to publish, for example 2026-06-02.")
    parser.add_argument("--manifest", type=Path, default=MANIFEST)
    parser.add_argument("--no-upload", action="store_true", help="Update lamp.json with local paths only.")
    parser.add_argument("--check", action="store_true", help="Validate the manifest entry and MP4 fast-start step without writing lamp.json.")
    parser.add_argument("--no-faststart", action="store_true", help="Skip MP4 fast-start remux before upload.")
    parser.add_argument("--commit", action="store_true", help="Commit the lamp.json update.")
    parser.add_argument("--push", action="store_true", help="Push main after committing.")
    args = parser.parse_args()

    day = day_for_date(load_manifest(args.manifest), args.date)
    title = require_text(day, "title")
    country = require_text(day, "country")
    category = require_text(day, "category")
    quote = require_text(day, "quote")
    live_url = require_text(day, "live_url")
    video = require_file(day, "video")
    audio = require_file(day, "audio")

    for env_file in DEFAULT_ENV_FILES:
        load_env_file(env_file)

    upload_video = video if args.no_faststart else make_faststart_mp4(video, title, args.date)
    if args.check:
        print(json.dumps({
            "date": args.date,
            "title": title,
            "video": str(video),
            "prepared_video": str(upload_video),
            "audio": str(audio),
            "ready": True,
        }, indent=2, ensure_ascii=False))
        return

    date_prefix = args.date.replace("-", "/")
    video_key = f"lamp/video/{date_prefix}/{upload_video.name}"
    audio_key = f"lamp/mp3/{date_prefix}/{audio.name}"

    if args.no_upload:
        video_url = str(video.relative_to(PROJECT_ROOT)) if video.is_relative_to(PROJECT_ROOT) else str(video)
        audio_url = str(audio.relative_to(PROJECT_ROOT)) if audio.is_relative_to(PROJECT_ROOT) else str(audio)
    else:
        video_url = r2_put_object(upload_video, video_key)
        audio_url = r2_put_object(audio, audio_key)

    lamp_data = {
        "title": title,
        "country": country,
        "date": args.date,
        "video": video_url,
        "audio": audio_url,
        "poster": day.get("poster", "assets/img/still-water.webp"),
        "live_url": live_url,
        "quote": quote,
        "category": category,
        "recording_note": day.get("recording_note", "This is a recording."),
    }
    LAMP_JSON.write_text(json.dumps(lamp_data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"uploaded": not args.no_upload, "lamp": lamp_data}, indent=2, ensure_ascii=False))

    if args.commit or args.push:
        git_commit_and_push(f"Publish {args.date} lamp media", args.push)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        sys.exit(error.returncode)
