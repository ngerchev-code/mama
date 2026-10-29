#!/bin/sh
# Копира приложението (www) в уеб версията за iPhone/компютър (docs/app).
set -e
cd "$(dirname "$0")/.."
rm -rf docs/app && mkdir -p docs/app && cp -R www/. docs/app/
echo "docs/app обновена"
