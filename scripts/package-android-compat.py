"""Create a compatibility manifest that lets an older Android runtime
download the current web bundle and migrate itself onto the new runtime feed."""
import json
import pathlib
import sys
import hashlib

if len(sys.argv) != 2:
    raise SystemExit("Usage: package-android-compat.py <legacy-runtime>")

legacy_runtime = sys.argv[1].strip()
if not legacy_runtime or any(c not in "0123456789abcdef" for c in legacy_runtime):
    raise SystemExit("Legacy runtime must be lowercase hexadecimal.")

root = pathlib.Path(__file__).resolve().parent.parent
app = root / "android-app"
info = json.loads((app / "bundle-info.json").read_text())
release = app / "release"
archive = release / f"{info['version']}.zip"

if not archive.exists():
    raise SystemExit(f"Bundle not found: {archive}")

out = release / "compat" / legacy_runtime
out.mkdir(parents=True, exist_ok=True)

manifest = {
    "schema": 1,
    "appId": "com.familybook.app",
    "runtime": legacy_runtime,
    "version": info["version"],
    "url": (
        "https://github.com/escobarsapparel-star/family-book/releases/download/"
        f"android-web-{legacy_runtime}/{archive.name}"
    ),
    "checksum": hashlib.sha256(archive.read_bytes()).hexdigest(),
}

(out / "latest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Prepared compatibility feed {legacy_runtime} -> {info['runtime']} ({info['version']})")
