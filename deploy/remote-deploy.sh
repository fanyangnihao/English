#!/usr/bin/env bash
set -Eeuo pipefail

RELEASE_ID="${1:?Release id is required}"
ARCHIVE="${2:?Release archive is required}"
DEPLOY_ROOT="${3:-/www/wwwroot/47.108.199.245}"
RELEASE_DIR="${DEPLOY_ROOT}/releases/${RELEASE_ID}"
PREVIOUS_RELEASE=""
NGINX_SITE="/www/server/panel/vhost/nginx/html_47.108.199.245.conf"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

cleanup() {
  rm -f "${ARCHIVE}"
}
trap cleanup EXIT

for command in node pnpm pm2 nginx systemctl tar curl; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "Missing required command: ${command}. Run deploy/bootstrap-server.sh first." >&2
    exit 1
  fi
done

if [[ "$(node -p 'Number(process.versions.node.split(".")[0])')" -lt 22 ]]; then
  echo "Node.js 22 or newer is required." >&2
  exit 1
fi

install -d -m 700 "${DEPLOY_ROOT}/shared"
if [[ ! -s "${DEPLOY_ROOT}/shared/.env" ]]; then
  if [[ -s "${DEPLOY_ROOT}/server/.env" ]]; then
    install -m 600 "${DEPLOY_ROOT}/server/.env" "${DEPLOY_ROOT}/shared/.env"
  else
    echo "Missing ${DEPLOY_ROOT}/shared/.env." >&2
    exit 1
  fi
fi

if ! grep -Eq '^[[:space:]]*VITE_MINIO_ENDPOINT[[:space:]]*=' "${DEPLOY_ROOT}/shared/.env"; then
  echo "VITE_MINIO_ENDPOINT=47.108.199.245" >>"${DEPLOY_ROOT}/shared/.env"
fi
chmod 600 "${DEPLOY_ROOT}/shared/.env"

if ! grep -Eq '^[[:space:]]*DATABASE_URL[[:space:]]*=' "${DEPLOY_ROOT}/shared/.env"; then
  echo "DATABASE_URL is missing from ${DEPLOY_ROOT}/shared/.env." >&2
  exit 1
fi

if [[ -L "${DEPLOY_ROOT}/current" ]]; then
  PREVIOUS_RELEASE="$(readlink -f "${DEPLOY_ROOT}/current")"
fi

install -d -m 755 "${DEPLOY_ROOT}/releases"
rm -rf "${RELEASE_DIR}"
install -d -m 755 "${RELEASE_DIR}"
tar -xzf "${ARCHIVE}" -C "${RELEASE_DIR}"
chmod 755 "${RELEASE_DIR}"
find "${RELEASE_DIR}/web" -type d -exec chmod 755 {} +
find "${RELEASE_DIR}/web" -type f -exec chmod 644 {} +

for required in \
  "${RELEASE_DIR}/web/index.html" \
  "${RELEASE_DIR}/server/package.json" \
  "${RELEASE_DIR}/server/dist/apps/server/apps/server/src/main.js" \
  "${RELEASE_DIR}/server/dist/apps/ai/apps/ai/src/main.js"; do
  if [[ ! -f "${required}" ]]; then
    echo "Release is incomplete: ${required}" >&2
    exit 1
  fi
done

if [[ -f "${RELEASE_DIR}/deploy/minio.service" ]]; then
  if [[ ! -s /www/minio/minio.env ]]; then
    if [[ -f /www/minio/start.sh ]]; then
      sed -n 's/^export MINIO_ROOT_/MINIO_ROOT_/p' /www/minio/start.sh >/www/minio/minio.env
    else
      echo "Missing /www/minio/minio.env." >&2
      exit 1
    fi
  fi
  chmod 600 /www/minio/minio.env
  install -m 644 "${RELEASE_DIR}/deploy/minio.service" /etc/systemd/system/minio.service
  systemctl daemon-reload
  systemctl enable minio

  if ! systemctl is-active --quiet minio; then
    pkill -x minio >/dev/null 2>&1 || true
    sleep 1
    systemctl start minio
  fi

  minio_ready=0
  for _ in {1..30}; do
    if curl -fsS http://127.0.0.1:9000/minio/health/live >/dev/null; then
      minio_ready=1
      break
    fi
    sleep 2
  done
  if [[ "${minio_ready}" -ne 1 ]]; then
    echo "MinIO is not healthy." >&2
    exit 1
  fi
fi

ln -sfn "${DEPLOY_ROOT}/shared/.env" "${RELEASE_DIR}/server/.env"
cd "${RELEASE_DIR}"
pnpm install --prod --filter "@en/server..." --frozen-lockfile --ignore-scripts
pnpm --dir server exec prisma migrate deploy

if [[ ! -f "${NGINX_SITE}.deploy-backup" ]]; then
  cp -p "${NGINX_SITE}" "${NGINX_SITE}.deploy-backup"
fi

ln -sfn "${RELEASE_DIR}" "${DEPLOY_ROOT}/current.next"
mv -Tf "${DEPLOY_ROOT}/current.next" "${DEPLOY_ROOT}/current"

install -m 644 "${RELEASE_DIR}/deploy/nginx.conf" "${NGINX_SITE}"
if ! nginx -t; then
  cp -p "${NGINX_SITE}.deploy-backup" "${NGINX_SITE}"
  if [[ -n "${PREVIOUS_RELEASE}" ]]; then
    ln -sfn "${PREVIOUS_RELEASE}" "${DEPLOY_ROOT}/current.next"
    mv -Tf "${DEPLOY_ROOT}/current.next" "${DEPLOY_ROOT}/current"
  fi
  exit 1
fi

pm2 delete server ai >/dev/null 2>&1 || true
pm2 start "${RELEASE_DIR}/deploy/ecosystem.config.cjs" --update-env
pm2 save
nginx -s reload

healthy=0
for _ in {1..30}; do
  if curl -fsS http://127.0.0.1:3000/api/v1 >/dev/null &&
    curl -fsS http://127.0.0.1:3001/ai/v1 >/dev/null; then
    healthy=1
    break
  fi
  sleep 2
done

if [[ "${healthy}" -ne 1 ]]; then
  echo "Health check failed." >&2
  pm2 logs server --lines 80 --nostream >&2 || true
  pm2 logs ai --lines 80 --nostream >&2 || true
  cp -p "${NGINX_SITE}.deploy-backup" "${NGINX_SITE}"
  nginx -s reload || true

  if [[ -n "${PREVIOUS_RELEASE}" && "${PREVIOUS_RELEASE}" != "${RELEASE_DIR}" ]]; then
    echo "Rolling back to ${PREVIOUS_RELEASE}." >&2
    ln -sfn "${PREVIOUS_RELEASE}" "${DEPLOY_ROOT}/current.next"
    mv -Tf "${DEPLOY_ROOT}/current.next" "${DEPLOY_ROOT}/current"
    pm2 delete server ai >/dev/null 2>&1 || true
    pm2 start "${RELEASE_DIR}/deploy/ecosystem.config.cjs"
    pm2 save
  else
    echo "Restoring the pre-automation PM2 processes." >&2
    pm2 delete server ai >/dev/null 2>&1 || true
    pm2 start "${DEPLOY_ROOT}/server/dist/apps/server/apps/server/src/main.js" \
      --name server --cwd "${DEPLOY_ROOT}/server" -i 2
    pm2 start "${DEPLOY_ROOT}/server/dist/apps/ai/apps/ai/src/main.js" \
      --name ai --cwd "${DEPLOY_ROOT}/server"
    pm2 save
    rm -f "${DEPLOY_ROOT}/current"
  fi
  exit 1
fi

mapfile -t releases < <(
  find "${DEPLOY_ROOT}/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' |
    sort -nr |
    cut -d' ' -f2-
)
kept=0
for path in "${releases[@]}"; do
  kept=$((kept + 1))
  if [[ "${kept}" -gt 3 && "${path}" != "${RELEASE_DIR}" ]]; then
    rm -rf "${path}"
  fi
done

echo "Deployment ${RELEASE_ID} completed."
