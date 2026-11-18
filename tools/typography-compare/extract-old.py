"""Extract the committed (HEAD) Noto Sans Devanagari 2.006 woff2 as the 'before' baseline for the comparison page."""
import subprocess, pathlib

root = pathlib.Path(__file__).resolve().parents[2]
out = pathlib.Path(__file__).resolve().parent / "fonts"
out.mkdir(exist_ok=True)
raw = subprocess.run(
    ["git", "show", "HEAD:src/fonts/noto-sans-devanagari-devanagari-wght-normal.woff2"],
    cwd=root, capture_output=True, check=True,
).stdout
(out / "noto-2.006-devanagari.woff2").write_bytes(raw)
(out / "noto-2.007-devanagari.woff2").write_bytes((root / "src/fonts/noto-sans-devanagari-devanagari-wght-normal.woff2").read_bytes())
print("ok", len(raw))
