#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

APP_ROOT="/www/wwwroot/47.108.199.245"

dnf install -y ca-certificates curl gzip nginx tar

NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
fi

if [[ "${NODE_MAJOR}" -lt 22 ]]; then
  curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
  dnf install -y nodejs
fi

corepack enable
corepack prepare pnpm@10.26.1 --activate

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2@7.0.3
fi

install -d -m 755 "${APP_ROOT}"
install -d -m 755 "${APP_ROOT}/releases"
install -d -m 700 "${APP_ROOT}/shared"

if [[ ! -s "${APP_ROOT}/shared/.env" ]]; then
  if [[ -s "${APP_ROOT}/server/.env" ]]; then
    install -m 600 "${APP_ROOT}/server/.env" "${APP_ROOT}/shared/.env"
  else
    echo "Missing ${APP_ROOT}/server/.env." >&2
    exit 1
  fi
fi

if ! grep -Eq '^[[:space:]]*VITE_MINIO_ENDPOINT[[:space:]]*=' "${APP_ROOT}/shared/.env"; then
  echo "VITE_MINIO_ENDPOINT=47.108.199.245" >>"${APP_ROOT}/shared/.env"
fi
chmod 600 "${APP_ROOT}/shared/.env"

if systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-service=http
  firewall-cmd --permanent --add-service=https
  firewall-cmd --permanent --add-port=9000/tcp
  firewall-cmd --reload
fi

systemctl enable --now nginx
nginx -t
nginx -s reload

echo "Bootstrap complete."
echo "Node: $(node --version)"
echo "pnpm: $(pnpm --version)"
echo "PM2: $(pm2 --version)"
