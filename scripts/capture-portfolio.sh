#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
OUT="$ROOT/site/portfolio"
mkdir -p "$OUT"

CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || true)"
if [ -z "$CHROME" ]; then
  echo "Chrome/Chromium not available on runner" >&2
  exit 1
fi

shot(){
  local name="$1" width="$2" height="$3" url="$4"
  local target="$OUT/$name.png"
  rm -f "$target"
  "$CHROME"     --headless=new     --disable-gpu     --no-sandbox     --hide-scrollbars     --force-device-scale-factor=1     --window-size="$width,$height"     --virtual-time-budget=3500     --screenshot="$target"     "$url" >/tmp/amdl-chrome-$name.log 2>&1
  test -s "$target"
  echo "Captured $name: $(wc -c < "$target") bytes"
}

# Public personal-branding samples only.
shot arda-moron 1440 900 https://ardamoron.nadmo.id/
shot bbya 1440 900 https://bbya.nadmo.id/
shot dwp 1440 900 https://dwp.nadmo.id/
shot saixko 1440 900 https://saixko.nadmo.id/

for f in arda-moron bbya dwp saixko; do
  test -s "$OUT/$f.png"
done
