#!/usr/bin/env bash
# Runs the browser scenarios of tests/harness.html in headless Chrome and checks each one's result.
#   bash tests/run-scenarios.sh <chrome binary> <site with two collections, from tests/fixture_site.py>
# Exits non-zero if any scenario throws or misses its expected result.
set -u
chrome="$1"; site="$2"; here="$(cd "$(dirname "$0")/.." && pwd)"; fail=0
run() {   # run <site root> <scenario> <text the result must contain>...
  local root="$1" s="$2"; shift 2
  local out; out=$("$chrome" --headless=new --disable-gpu --allow-file-access-from-files --user-data-dir="$(mktemp -d)" \
    --virtual-time-budget=20000 --dump-dom "file://$root/tests/harness.html?s=$s" 2>/dev/null)
  for want in "$@"; do
    if ! grep -qF -- "$want" <<<"$out"; then echo "FAIL $s: missing $want"; fail=1; return; fi
  done
  echo "ok   $s"
}
run "$here" persist '"persisted": true'
run "$here" carousel '"mistakeStillShown": true' '"pickedStillKept": true' \
  '"carousel": true' '"typedKept": true' '"flipped": true' \
  '"altHidesName": true' '"creditHidden": true' '"imgLoaded": true' '"wrapPrev": "4 / 4"' '"creditChanged": true'
run "$here" random '"stableOnRerender": true'
run "$here" credits '"sameFile": true' '"samePhotos": true' '"credited": 5'
run "$here" cardlink '"nameLink": true' '"back": true' '"stillFeedback": true' '"noBackLater": true'
run "$here" names '"matches": true' '"groupShown": true' '"missOrder": true' '"spelling": true' '"wrongSpecies": true' '"esClass": true' '"esCard": true' '"esReptiles": true' '"noEsInEnglish": true'
run "$here" studytree '"onlyClasses": true' '"reptileFromClass": true' '"reptiliaCard": true' '"kept": true' '"full": true'
run "$here" cualcar '"loaded": 4' '"carousels": 4' '"swipe": true' '"flipped": true' '"notPicked": true' '"picked": true' '"pickKept": true' '"altHides": true'
run "$here" comparecar '"carousels": 2' '"flippedBoth": true' '"creditsFollow": true' '"sameScreen": true'
run "$site" collections '"importOtherRefused": true' '"key": "visu-progress-v1:artropodos-prueba"' '"log": 1'
exit $fail
