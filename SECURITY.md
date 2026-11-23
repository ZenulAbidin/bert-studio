# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub:
**Security → Report a vulnerability** on this repository
(<https://github.com/ZenulAbidin/bert-studio/security/advisories/new>).
Do not open a public issue for a security problem.

Include what you found, how to reproduce it, and the commit or image you
tested.

## Scope

BERT Studio is designed for trusted users on a private network.
[docs/security.md](docs/security.md) lists what it does and does not protect.
In particular, **custom tasks run arbitrary Python by design**, so "an API key
holder can run code on the server" is expected behaviour, not a vulnerability.
Reports that let someone *without* a key or login do anything beyond the
public endpoints are in scope, as are ways to read or forge sessions or keys.

## Supported versions

Fixes go to the `main` branch.
