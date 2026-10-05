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
shot berlin-bintang 1440 900 https://berlinbintang.nadmo.id/
shot dj-keyrin 1440 900 https://djkeyrin.nadmo.id/
shot oka-raditya 1440 900 https://okaraditya.nadmo.id/
shot anya-kaizy 1440 900 https://anyakaizy.nadmo.id/
shot dekhan-good 1440 900 https://dekhangood.nadmo.id/

# NADMO business portfolio work samples.
shot work-zuzu 1440 900 https://zuzu.nadmo.id/
shot work-brush-by-yuda 1440 900 https://brushbyyuda.nadmo.id/

# Featured business website previews.
shot business-roamink 1440 900 https://roamink.nadmo.id/
shot business-stayink 1440 900 https://stayink.nadmo.id/
shot business-bwd 1440 900 https://bookbwd.nadmo.id/
shot business-amsound 1440 900 https://amsound.nadmo.id/
shot business-balinightlifeconnect 1440 900 https://balinightlifeconnect.nadmo.id/
shot business-originalbali 1440 900 https://originalbali.nadmo.id/

for f in arda-moron bbya dwp saixko berlin-bintang dj-keyrin oka-raditya anya-kaizy dekhan-good work-zuzu work-brush-by-yuda business-roamink business-stayink business-bwd business-amsound business-balinightlifeconnect business-originalbali; do
  test -s "$OUT/$f.png"
done
