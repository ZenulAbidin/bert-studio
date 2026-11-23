# Contributing

Thanks for helping. Bug reports, documentation fixes and pull requests are all
welcome.

## Reporting a bug

Open an issue with the bug report template. Include the commit or image you
run, CPU or GPU, the request you sent (without your API key) and the response
or log output. For security problems, follow [SECURITY.md](SECURITY.md)
instead.

## Making a change

1. Open an issue first for anything larger than a small fix, so we can agree
   on the approach.
2. Keep each pull request to one change. Small pull requests get reviewed
   quickly.
3. Run the checks before pushing:

   ```bash
   python3 -m compileall -q backend examples
   python3 -m unittest discover -s examples
   npm ci && npm run build
   ```

4. If you change an endpoint, update [docs/api-reference.md](docs/api-reference.md)
   in the same pull request.
5. Never commit `backend/.env.local`, API keys, tokens or model weights.

## Code style

- Python: PEP 8, type hints on new functions, standard library where it is
  enough.
- TypeScript: follow the existing ESLint configuration (`npm run lint`).
- Commit messages: a short imperative subject line ("Fix model download
  progress"), then a blank line and the reason for the change.

## Development setup

See [Development setup](README.md#development-setup) in the README.

By contributing you agree that your contribution is licensed under the
[MIT License](LICENSE).
