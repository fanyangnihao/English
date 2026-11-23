# Production deployment

The existing server uses PM2 and the BT panel Nginx site. The deployment keeps
that structure:

```text
/www/wwwroot/47.108.199.245/
  current -> releases/<run-id>-<git-sha>
  releases/<run-id>-<git-sha>/
    deploy/
    packages/
    server/
    web/
  shared/.env
```

The Nginx site file is:

```text
/www/server/panel/vhost/nginx/html_47.108.199.245.conf
```

## 1. Bootstrap the server

The server already has Node.js 22, pnpm, PM2, Nginx, PostgreSQL, Redis, and
MinIO. To verify or reinstall the prerequisites:

```bash
scp -P 22 -r deploy root@47.108.199.245:/tmp/english-deploy
ssh -p 22 root@47.108.199.245 "bash /tmp/english-deploy/bootstrap-server.sh"
```

## 2. Configure the runtime environment

The first automated deployment copies the existing `server/.env` to
`shared/.env`. It also adds `VITE_MINIO_ENDPOINT=47.108.199.245` when that key
is missing.

The PM2 processes keep using the same PostgreSQL, Redis, and MinIO
configuration already configured on the server.

## 3. Configure GitHub Actions

Add these repository secrets under `Settings > Secrets and variables > Actions`:

```text
SSH_HOST=47.108.199.245
SSH_PORT=22
SSH_USER=root
SSH_PRIVATE_KEY=<contents of ~/.ssh/english_deploy>
SSH_KNOWN_HOSTS=<output of ssh-keyscan -H -p 22 47.108.199.245>
DEPLOY_PATH=/www/wwwroot/47.108.199.245
```

After the secrets are configured, every push to `main` builds and deploys the
application. The workflow can also be run manually from the Actions tab.

## 4. Operations

```bash
pm2 list
pm2 logs server
pm2 logs ai
nginx -t
```

The first deployment keeps the original Nginx file as
`html_47.108.199.245.conf.deploy-backup`. Each new release is extracted under
`releases/<run-id>-<git-sha>`. If the health check fails, `current` and the
Nginx configuration are restored and PM2 is restarted.
