# Deployment

BERT Studio is three services: the backend (FastAPI, PyTorch, Transformers;
it also serves the built web interface), MongoDB (API keys and saved tasks)
and an optional Caddy proxy that puts the API under `/api/` for the web
interface. The [Quickstart](../README.md#quickstart) covers the default
Docker Compose setup; this page covers the choices around it.

## Image variants

The `Dockerfile` builds the frontend with Node.js, then installs the backend
on `python:3.10-slim`.

| Build | Command | Notes |
|---|---|---|
| CUDA (default) | `docker compose build` | PyTorch from PyPI, which bundles the CUDA libraries. Works on CPU too, but the image is several GB |
| CPU only | `TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu docker compose build` | Much smaller image; no GPU support |

Without Compose:

```bash
docker build -t bert-studio-backend --build-arg TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu .
```

`backend/requirements.txt` is not pinned, so a rebuild picks up the newest
PyTorch and Transformers. For a production host, build once, test, and keep
using that image tag rather than rebuilding on every deploy.

## GPU with Docker

Requirements on the host: an NVIDIA driver and the
[NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html).
Check that containers can see the card:

```bash
docker run --rm --gpus all ubuntu nvidia-smi
```

Then start BERT Studio with the GPU override and check the device:

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build
curl -s http://127.0.0.1:4794/healthz    # "inference_device": "cuda"
```

If `cuda_available` is `false`, the container does not see the GPU (driver,
toolkit or override file), or the image was built with the CPU-only index.

## Podman and systemd

Podman runs the same image. With Podman 4.4 or newer, a
[Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html)
file lets systemd manage the container. This example assumes the image
was built as `localhost/bert-studio-backend:latest`, MongoDB runs in a
container named `bert-mongo` on the same network, and the settings are in
`/etc/bert-studio/backend.env` (mode 0600).

```bash
podman network create bert-studio
podman volume create bert-studio-models
```

`/etc/containers/systemd/bert-backend.container`:

```ini
[Unit]
Description=BERT Studio backend

[Container]
Image=localhost/bert-studio-backend:latest
Pull=never
ContainerName=bert-backend
Network=bert-studio
Volume=bert-studio-models:/models
EnvironmentFile=/etc/bert-studio/backend.env
PublishPort=127.0.0.1:4794:4794
HealthCmd=python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4794/healthz', timeout=3)"
HealthInterval=30s
HealthStartPeriod=180s
HealthOnFailure=kill
Notify=healthy

[Service]
Restart=always
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl start bert-backend.service
```

With `Notify=healthy`, systemd marks the unit started only once `/healthz`
answers, so units ordered `After=bert-backend.service` (a batch scorer, for
example) start when the API is ready.

### GPU with Podman

The simplest way is CDI: install the NVIDIA Container Toolkit, generate the
spec once with `nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml`, and
add this to the `[Container]` section:

```ini
AddDevice=nvidia.com/gpu=all
```

Without CDI, pass the device nodes (`/dev/nvidia0`, `/dev/nvidiactl`,
`/dev/nvidia-uvm`, `/dev/nvidia-uvm-tools`) with one `AddDevice=` line each and
mount the host's `libcuda.so.1` into the container read-only. The nodes must
exist before the container starts; `nvidia-modprobe` creates them on hosts
where nothing else has used the GPU since boot.

To fail closed when the GPU disappears (after a driver update, for example)
instead of silently running on CPU, make the health check require CUDA:

```ini
HealthCmd=python -c "import json,urllib.request; d=json.load(urllib.request.urlopen('http://127.0.0.1:4794/healthz', timeout=3)); assert d['inference_device'] == 'cuda'"
```

## Network exposure

The backend has no rate limiting, and an API key or login can run code on
the server (see [security.md](security.md)). Recommended layouts, safest
first:

1. **Same host only.** Clients run on the server and use `127.0.0.1:4794`.
   This is the Compose default.
2. **Private network.** Publish the port on a private interface (a VPN, a
   container network, an internal VLAN) and firewall everything else.
3. **Behind a TLS reverse proxy** with its own authentication (client
   certificates, an SSO proxy, or HTTP basic authentication) in front of the
   BERT Studio login.

Over SSH, without opening any port:

```bash
ssh -N -L 4793:127.0.0.1:4793 -L 4794:127.0.0.1:4794 user@server
```

If you put the bundled Caddy on a public name, replace `http://:4793` in the
`Caddyfile` with the host name so Caddy obtains a certificate, and set
`CORS_ORIGINS` only if a browser application on another origin must call the
API.

## Data and backups

| Data | Where | Back up? |
|---|---|---|
| API keys, saved custom tasks | MongoDB volume `mongo_data` | Yes |
| Downloaded and local models | volume `model_cache`, mounted at `/models` | Your own fine-tuned models, yes; Hub downloads can be fetched again |
| Settings | `backend/.env.local` | Yes, and keep it private |

A MongoDB backup:

```bash
docker compose exec -T mongo mongodump --archive --gzip > bert-studio-mongo-$(date +%F).archive.gz
```

## Upgrading

```bash
git pull
docker compose build
docker compose up -d
```

Models in `/models` and data in MongoDB survive the rebuild. Check
`GET /healthz` afterwards, and on a GPU host that `inference_device` is still
`cuda`.
