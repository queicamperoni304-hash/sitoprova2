#!/bin/sh
# Pubblica FitVais su Cloudflare Pages.
# Uso: ./deploy.sh
set -e

cartella=$(cd "$(dirname "$0")" && pwd)
cd "$cartella"

echo "Pubblico FitVais da $cartella"
npx wrangler pages deploy . --project-name=fitvais
