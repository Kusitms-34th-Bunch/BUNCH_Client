# Future workflow templates

These files are intentionally outside `.github/workflows`, so GitHub Actions does not run them.

- `performance-audit.yml`: Run a Lighthouse audit against a deployed URL.
- `storybook-deploy.yml`: Deploy design-system Storybook to GitHub Pages. Activate it after the repository becomes public and Pages Source is set to GitHub Actions.
- `vercel-deploy.yml`: Deploy either the web or admin app after Vercel projects and secrets are configured.
- `codeql.yml`: Run CodeQL static security analysis. Activate it after the repository becomes public (private repositories need GitHub Advanced Security).

Move a template into `.github/workflows` only after completing the secrets listed in that template.
