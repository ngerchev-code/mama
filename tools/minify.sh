#!/bin/sh
# Минифицира собствения JS код (без vendor) в посочената папка.
set -e
DIR="$1"
for f in "$DIR"/*.js; do
  case "$(basename "$f")" in sw.js) continue;; esac
  npx --no-install terser "$f" --compress --mangle \
    --preamble "/* MAMA — My Amazing Market Area. © 2026 Николай Герчев. Всички права запазени. */" \
    -o "$f.min" && mv "$f.min" "$f"
done
echo "минифицирано: $DIR"
