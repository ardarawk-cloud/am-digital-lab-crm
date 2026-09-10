#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
OUT="$ROOT/site/portfolio"
TMP="/tmp/amdl-portfolio-source"
mkdir -p "$OUT"
rm -rf "$TMP"
mkdir -p "$TMP"

CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || true)"
if [ -z "$CHROME" ]; then
  echo "Chrome/Chromium not available on runner" >&2
  exit 1
fi

echo "Using browser: $CHROME"

git clone --depth 1 --quiet https://github.com/ardarawk-cloud/ACC-OS-X.git "$TMP/acc-os-x"
git clone --depth 1 --quiet https://github.com/ardarawk-cloud/Zuzu-Family-House.git "$TMP/zuzu"
git clone --depth 1 --quiet https://github.com/ardarawk-cloud/ACC-Builder-Apk.git "$TMP/builder"

python3 -m http.server 8111 --bind 127.0.0.1 --directory "$TMP/acc-os-x" >/tmp/amdl-acc-http.log 2>&1 & P1=$!
python3 -m http.server 8112 --bind 127.0.0.1 --directory "$TMP/zuzu" >/tmp/amdl-zuzu-http.log 2>&1 & P2=$!
python3 -m http.server 8113 --bind 127.0.0.1 --directory "$TMP/builder" >/tmp/amdl-builder-http.log 2>&1 & P3=$!
trap 'kill $P1 $P2 $P3 2>/dev/null || true' EXIT

wait_url(){
  local url="$1"
  for _ in $(seq 1 20); do
    if curl --fail --silent --max-time 2 "$url" >/dev/null; then return 0; fi
    sleep .5
  done
  echo "Preview server did not become ready: $url" >&2
  return 1
}

wait_url http://127.0.0.1:8111/
wait_url http://127.0.0.1:8112/
wait_url http://127.0.0.1:8113/apps/oracly/

shot(){
  local name="$1" width="$2" height="$3" url="$4"
  local target="$OUT/$name.png"
  rm -f "$target"
  "$CHROME" \
    --headless=new \
    --disable-gpu \
    --no-sandbox \
    --hide-scrollbars \
    --force-device-scale-factor=1 \
    --window-size="$width,$height" \
    --virtual-time-budget=3500 \
    --screenshot="$target" \
    "$url" >/tmp/amdl-chrome-$name.log 2>&1
  test -s "$target"
  echo "Captured $name: $(wc -c < "$target") bytes"
}

# Actual project UIs rendered from their current source.
shot acc-os-x 1440 900 http://127.0.0.1:8111/
shot zuzu-family-house 1440 900 http://127.0.0.1:8112/
shot am-studio-music 430 900 http://127.0.0.1:8113/apps/am-studio-music-distribution/
shot oracly 430 900 http://127.0.0.1:8113/apps/oracly/
shot ai-mashup 430 900 http://127.0.0.1:8113/apps/ai-mashup-bootleg-studio/

# CRM is already live; capture the real production login UI rather than a fabricated mockup.
shot amdl-crm 1440 900 https://am-digital-lab-crm.ardarawk.workers.dev/

for f in acc-os-x amdl-crm zuzu-family-house am-studio-music oracly ai-mashup; do
  test -s "$OUT/$f.png"
done
