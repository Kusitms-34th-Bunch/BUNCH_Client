# Future workflow templates

These files are intentionally outside `.github/workflows`, so GitHub Actions does not run them.

- `performance-audit.yml`: Run a Lighthouse audit against a deployed URL.
- `chromatic.yml`: Publish design-system Storybook only after a Chromatic project token is configured.
- `vercel-deploy.yml`: Deploy either the web or admin app after Vercel projects and secrets are configured.
- `codeql.yml`: Run CodeQL static security analysis. Activate it after the repository becomes public (private repositories need GitHub Advanced Security).

Move a template into `.github/workflows` only after completing the secrets listed in that template.
