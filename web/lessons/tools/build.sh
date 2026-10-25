#!/bin/sh
# Builds each lesson into a standalone HTML page in web/lessons/dist/.
# Usage: sh web/lessons/tools/build.sh
cd "$(dirname "$0")/.." || exit 1
mkdir -p dist
build(){ sed "s/__TITLE__/$2/" head.html > "dist/$1.html"; { echo '<script>'; echo 'window.SERIES=[["2 · Multiplayer game","game.html"],["3 · Reading app","storage.html"],["4 · Food delivery app","compute.html"],["5 · Banking app","security.html"],["6 · Ticket sale","routing.html"]];'; cat "data/$1.js"; cat narrate.js; cat engine.js; echo '</script>'; } >> "dist/$1.html"; }
build streaming "How a Streaming App Runs on AWS"
build game "How a Multiplayer Game Travels"
build storage "Where a Reading App Keeps Its Books"
build compute "How a Food Delivery App Computes"
build security "How a Banking App Stays Secure"
build routing "How a Ticket Sale Routes Its Fans"
[ -d audio ] && mkdir -p dist/audio && cp audio/*.mp3 dist/audio/ 2>/dev/null
echo "built into $(pwd)/dist"
