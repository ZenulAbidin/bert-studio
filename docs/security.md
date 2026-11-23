# Security notes

BERT Studio is meant for a trusted team on a private network. This page
describes what it protects, what it does not, and how to run it safely. To
report a vulnerability, see [SECURITY.md](../SECURITY.md).

## Who can do what

| Credential | Can |
|---|---|
| None | `GET /healthz`, `/status`, `/stats`, `/auth/check`, `/captcha`, and the login request |
| API key | Every other endpoint except key management, **including custom tasks** |
| Logged-in session | Everything, including creating and revoking API keys |

There is one login (`AUTH_USERNAME` / `AUTH_PASSWORD`), and every API key has
the same rights.

## Custom tasks run code on the server

`POST /custom-task` and `POST /custom-task/batch` execute the submitted Python
inside the backend process. A text filter rejects some `import` statements,
but it is not a sandbox and is easy to get around. Treat any API key or login
as **shell access to the backend container**: it can read the environment
(including `SESSION_SECRET` and the MongoDB connection string), the model
volume, and anything the container can reach on the network.

Consequences:

- Give API keys only to people and programs you trust with that access.
- Run the backend in a container, without extra capabilities, with only the
  volumes it needs.
- Do not put the backend on a network where it can reach systems it should
  not touch.

## Login and sessions

- The session is a signed cookie (`itsdangerous`, keyed by `SESSION_SECRET`).
  It is signed, not encrypted: the client can read its contents but cannot
  change them. Use a long random `SESSION_SECRET`; anyone who knows it can
  forge a session.
- The captcha slows down casual guessing only. There is no lockout or rate
  limit on login attempts, so use a long random password and keep the
  interface off the public internet.
- The cookie is `HttpOnly` and `SameSite=Lax`. It is not marked `Secure`, so
  serve the interface over TLS (or over an SSH tunnel) if it leaves the host.

## API keys

- Keys are 256-bit random values from `secrets.token_urlsafe(32)`.
- They are stored in MongoDB as plain text, so anyone with database access can
  read them. Keep MongoDB on an internal network only, as the Compose file
  does.
- Prefer the `Authorization: Bearer` header. Keys in `?api_key=` query
  strings end up in proxy and access logs.
- Revoke unused keys on the API Keys page.

## Settings endpoint

`GET /settings` returns the Hugging Face token saved through the web
interface to any API key holder. For a token that must stay hidden from key
holders, set `HF_TOKEN` in the environment instead (which, given custom
tasks, key holders can still read: see above).

## Network

- The Compose file publishes the backend and Caddy on 127.0.0.1 only and does
  not publish MongoDB. Keep it that way unless a firewall or authenticating
  proxy protects the port. [deployment.md](deployment.md#network-exposure)
  lists safe layouts.
- CORS is off by default. Add origins to `CORS_ORIGINS` only for browser
  applications that must call the API.
- There is no rate limiting. A client with a key can keep the GPU busy;
  that is the point for batch scoring, but plan for it on shared hosts.

## Models

- Loading a model from the Hub runs its tokenizer and configuration code from
  the Transformers library. Use models from publishers you trust, and prefer
  `safetensors` weights.
- Model ids and paths come from API callers, so a key holder can load any
  directory the container can read as a model.

## Checklist

- [ ] `SESSION_SECRET`, `AUTH_PASSWORD` and any `INTERNAL_SCORER_TOKEN` are
      long random values, and `backend/.env.local` is mode 0600
- [ ] Ports bind to 127.0.0.1 or a private interface
- [ ] TLS, or an SSH tunnel, for any access from another machine
- [ ] API keys only for trusted users and services; unused keys revoked
- [ ] MongoDB not reachable from outside the container network
- [ ] MongoDB volume and your own models are backed up
