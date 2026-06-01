from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import hmac
import json
import mimetypes
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILES = [
    PROJECT_ROOT / ".env",
    Path("/Volumes/macos/518history.md"),
]
LAMP_JSON = PROJECT_ROOT / "assets" / "data" / "lamp.json"
VIDEO_DIR = PROJECT_ROOT / "lamp" / "video"
MP3_DIR = PROJECT_ROOT / "lamp" / "mp3"


def load_env_file(path: Path) -> list[str]:
    loaded = []
    if not path.exists():
        return loaded
    for raw_line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        export_match = re.search(r"\bexport\s+(R2_[A-Z0-9_]+\s*=.+)$", line)
        if export_match:
            line = export_match.group(1).strip()
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not re.fullmatch(r"R2_[A-Z0-9_]+", key):
            continue
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value
            loaded.append(key)
    return loaded


def env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def signing_key(secret: str, date_stamp: str, region: str, service: str) -> bytes:
    k_date = hmac.new(("AWS4" + secret).encode(), date_stamp.encode(), hashlib.sha256).digest()
    k_region = hmac.new(k_date, region.encode(), hashlib.sha256).digest()
    k_service = hmac.new(k_region, service.encode(), hashlib.sha256).digest()
    return hmac.new(k_service, b"aws4_request", hashlib.sha256).digest()


def r2_put_object(local_path: Path, object_key: str) -> str:
    account_id = env("R2_ACCOUNT_ID")
    bucket = env("R2_BUCKET")
    access_key = env("R2_ACCESS_KEY_ID")
    secret_key = env("R2_SECRET_ACCESS_KEY")
    public_base_url = env("R2_PUBLIC_BASE_URL").rstrip("/")
    region = "auto"
    service = "s3"
    host = f"{account_id}.r2.cloudflarestorage.com"
    encoded_key = "/".join(urllib.parse.quote(part) for part in object_key.split("/"))
    canonical_uri = f"/{bucket}/{encoded_key}"
    endpoint = f"https://{host}{canonical_uri}"
    payload = local_path.read_bytes()
    payload_hash = hashlib.sha256(payload).hexdigest()
    now = dt.datetime.now(dt.UTC)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    content_type = mimetypes.guess_type(local_path.name)[0] or "application/octet-stream"
    canonical_headers = (
        f"content-type:{content_type}\n"
        f"host:{host}\n"
        f"x-amz-content-sha256:{payload_hash}\n"
        f"x-amz-date:{amz_date}\n"
    )
    signed_headers = "content-type;host;x-amz-content-sha256;x-amz-date"
    canonical_request = "\n".join(["PUT", canonical_uri, "", canonical_headers, signed_headers, payload_hash])
    credential_scope = f"{date_stamp}/{region}/{service}/aws4_request"
    string_to_sign = "\n".join([
        "AWS4-HMAC-SHA256",
        amz_date,
        credential_scope,
        hashlib.sha256(canonical_request.encode()).hexdigest(),
    ])
    signature = hmac.new(
        signing_key(secret_key, date_stamp, region, service),
        string_to_sign.encode(),
        hashlib.sha256,
    ).hexdigest()
    authorization = (
        "AWS4-HMAC-SHA256 "
        f"Credential={access_key}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )
    request = urllib.request.Request(
        endpoint,
        data=payload,
        method="PUT",
        headers={
            "Authorization": authorization,
            "Content-Type": content_type,
            "x-amz-content-sha256": payload_hash,
            "x-amz-date": amz_date,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            if response.status not in (200, 201):
                raise RuntimeError(f"Unexpected R2 status {response.status}")
    except urllib.error.HTTPError as error:
        raise RuntimeError(error.read().decode("utf-8", errors="replace")) from error
    return f"{public_base_url}/{object_key}"


def latest_file(folder: Path, suffixes: tuple[str, ...]) -> Path | None:
    files = [path for path in folder.iterdir() if path.is_file() and path.suffix.lower() in suffixes]
    if not files:
        return None
    return max(files, key=lambda path: path.stat().st_mtime)


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload The Lamp daily MP4/MP3 to Cloudflare R2 and update lamp.json.")
    parser.add_argument("--date", default=dt.date.today().isoformat(), help="Publish date, for example 2026-06-01.")
    parser.add_argument("--video", type=Path, help="MP4 file. Defaults to newest file in lamp/video.")
    parser.add_argument("--audio", type=Path, help="MP3 file. Defaults to newest file in lamp/mp3.")
    parser.add_argument("--title", default="Sunrise over Lofoten")
    parser.add_argument("--country", default="Norway")
    parser.add_argument("--quote", default="The world is already awake.")
    parser.add_argument("--live-url", default="https://www.skylinewebcams.com/en/webcam/norge/nordland/lofoten/reine.html")
    parser.add_argument("--poster", default="assets/img/still-water.webp")
    parser.add_argument("--category", default="Sunrise")
    parser.add_argument("--env-file", type=Path)
    parser.add_argument("--no-upload", action="store_true", help="Update lamp.json with local paths only.")
    args = parser.parse_args()

    loaded_env = []
    if args.env_file:
        loaded_env.extend(load_env_file(args.env_file))
    else:
        for env_file in DEFAULT_ENV_FILES:
            loaded_env.extend(load_env_file(env_file))

    video = args.video or latest_file(VIDEO_DIR, (".mp4", ".mov", ".webm"))
    audio = args.audio or latest_file(MP3_DIR, (".mp3", ".m4a", ".aac"))
    if not video:
        raise SystemExit(f"No video file found in {VIDEO_DIR}")
    if not audio:
        raise SystemExit(f"No audio file found in {MP3_DIR}")

    video = video.resolve()
    audio = audio.resolve()
    date_prefix = args.date.replace("-", "/")
    video_key = f"lamp/video/{date_prefix}/{video.name}"
    audio_key = f"lamp/mp3/{date_prefix}/{audio.name}"
    if args.no_upload:
        video_url = str(video.relative_to(PROJECT_ROOT)) if video.is_relative_to(PROJECT_ROOT) else str(video)
        audio_url = str(audio.relative_to(PROJECT_ROOT)) if audio.is_relative_to(PROJECT_ROOT) else str(audio)
    else:
        video_url = r2_put_object(video, video_key)
        audio_url = r2_put_object(audio, audio_key)

    lamp_data = {
        "title": args.title,
        "country": args.country,
        "date": args.date,
        "video": video_url,
        "audio": audio_url,
        "poster": args.poster,
        "live_url": args.live_url,
        "quote": args.quote,
        "category": args.category,
        "recording_note": "This is a recording.",
    }
    LAMP_JSON.write_text(json.dumps(lamp_data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"uploaded": not args.no_upload, "loaded_env_keys": loaded_env, "lamp": lamp_data}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
