#!/usr/bin/env python3
"""Create a BERT Studio API key without the web interface.

Useful on headless servers. Run it where the backend's environment is set,
for example inside the backend container:

    docker compose exec backend python backend/create_api_key.py

The key is printed once on stdout. Store it somewhere safe; it cannot be
shown again (revoke it on the API Keys page and create a new one instead).
"""

import secrets
import sys

from mongodb_database import mongodb_manager


def main() -> int:
    key = secrets.token_urlsafe(32)
    key_id = mongodb_manager.create_api_key(key)
    print(f"created API key {key_id}", file=sys.stderr)
    print(key)
    return 0


if __name__ == "__main__":
    sys.exit(main())
