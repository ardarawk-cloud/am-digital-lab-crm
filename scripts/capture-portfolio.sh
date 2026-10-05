#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
OUT="$ROOT/site/portfolio"
TMP_ZUZU="/tmp/nadmo-zuzu-preview"
mkdir -p "$OUT"
rm -rf "$TMP_ZUZU"

CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || true)"
if [ -z "$CHROME" ]; then
  echo "Chrome/Chromium not available on runner" >&2
  exit 1
fi

git clone --depth 1 --quiet https://github.com/ardarawk-cloud/Zuzu-Family-House.git "$TMP_ZUZU"
python3 -m http.server 8112 --bind 127.0.0.1 --directory "$TMP_ZUZU" >/tmp/nadmo-zuzu-http.log 2>&1 & ZUZU_PID=$!
trap 'kill $ZUZU_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 20); do
  if curl --fail --silent --max-time 2 http://127.0.0.1:8112/ >/dev/null; then break; fi
  sleep .5
done

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
shot berlin-bintang 1440 900 https://berlinbintang.nadmo.id/
shot dj-keyrin 1440 900 https://djkeyrin.nadmo.id/
shot oka-raditya 1440 900 https://okaraditya.nadmo.id/
shot anya-kaizy 1440 900 https://anyakaizy.nadmo.id/

# Business website portfolio samples.
shot work-zuzu 1440 900 http://127.0.0.1:8112/
shot work-brush-by-yuda 1440 900 https://brushbyyuda.nadmo.id/

# Featured business website previews.
shot business-roamink 1440 900 https://roamink.nadmo.id/
shot business-stayink 1440 900 https://stayink.nadmo.id/
shot business-bwd 1440 900 https://bookbwd.nadmo.id/
shot business-amsound 1440 900 https://amsound.nadmo.id/
shot business-balinightlifeconnect 1440 900 https://balinightlifeconnect.nadmo.id/
shot business-originalbali 1440 900 https://originalbali.nadmo.id/

for f in arda-moron bbya dwp saixko berlin-bintang dj-keyrin oka-raditya anya-kaizy business-roamink business-stayink business-bwd business-amsound business-balinightlifeconnect business-originalbali work-zuzu work-brush-by-yuda; do
  test -s "$OUT/$f.png"
done
