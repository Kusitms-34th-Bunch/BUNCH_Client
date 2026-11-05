# Future workflow templates

These files are intentionally outside `.github/workflows`, so GitHub Actions does not run them.

- `performance-audit.yml`: Run a Lighthouse audit against a deployed URL.
- `vercel-deploy.yml`: Deploy either the web or admin app after Vercel projects and secrets are configured.

Move a template into `.github/workflows` only after completing the secrets listed in that template.
