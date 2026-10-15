import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'AGENTS.md',
  'CLAUDE.md',
  '.coderabbit.yaml',
  'docs/agent/bootstrap.md',
  'docs/agent/maintenance.md',
  'docs/agent/roles/reviewer.md',
  'docs/agent/roles/verifier.md',
  'docs/agent/roles/debugger.md',
  'docs/agent/roles/api-contract-reviewer.md',
  'docs/agent/roles/ui-accessibility-reviewer.md',
  'docs/agent/roles/route-reviewer.md',
  'docs/agent/roles/e2e-planner.md',
  'docs/index.md',
  'docs/architecture/components.md',
  'docs/architecture/component-patterns.md',
  'docs/architecture/app-structure.md',
  'docs/architecture/repo-structure.md',
  'docs/architecture/domain-ownership.md',
  'docs/architecture/routing-and-access.md',
  'docs/architecture/data-layer.md',
  'docs/architecture/design-system.md',
  'docs/architecture/design-system-components.md',
  'docs/architecture/styling-and-tokens.md',
  'docs/code-quality/index.md',
  'docs/code-quality/readability.md',
  'docs/code-quality/contracts.md',
  'docs/code-quality/component-logic.md',
  'docs/code-quality/maintainability.md',
  'docs/code-quality/review.md',
  'docs/conventions/commit.md',
  'docs/conventions/coding.md',
  'docs/conventions/package-management.md',
  'docs/workflows/api-integration.md',
  'docs/workflows/development.md',
  'docs/workflows/e2e-testing.md',
  'docs/workflows/feature-intake.md',
  'docs/workflows/local-development.md',
  'docs/workflows/performance.md',
  'docs/workflows/pr-review.md',
  'docs/workflows/seo.md',
  'docs/workflows/spec-writing.md',
  'docs/workflows/testing.md',
  'docs/workflows/turbo-generators.md',
  'docs/workflows/verification.md',
  'docs/troubleshooting/README.md',
  '.agents/guides/page-feature.md',
  '.agents/guides/api-integration.md',
  '.agents/guides/design-system-component.md',
  '.agents/guides/form-flow.md',
  '.agents/guides/testing.md',
  '.agents/flows/before-change.md',
  '.agents/flows/verification.md',
  '.agents/flows/handoff.md',
  'docs/decisions/README.md',
  '.agents/README.md',
  '.agents/templates/feature-spec.md',
  '.agents/templates/page.spec.md',
  '.agents/templates/component.spec.md',
  '.agents/templates/hook.spec.md',
  '.agents/templates/api-contract-map.md',
  '.agents/templates/decision.md',
  '.agents/templates/domain-context.md',
  '.agents/templates/troubleshooting.md',
  'apps/web/AGENTS.md',
  'apps/web/CLAUDE.md',
  'apps/admin/AGENTS.md',
  'apps/admin/CLAUDE.md',
  'packages/api-core/AGENTS.md',
  'packages/api-core/CLAUDE.md',
  'packages/design-system/AGENTS.md',
  'packages/design-system/CLAUDE.md',
];

const roleNames = [
  'reviewer',
  'verifier',
  'debugger',
  'api-contract-reviewer',
  'ui-accessibility-reviewer',
  'route-reviewer',
  'e2e-planner',
];
const skillNames = [
  'integrate-api',
  'verify-api-integration',
  'create-page-feature',
  'implement-form-flow',
  'create-generator',
  'create-ds-component',
  'create-app-component',
  'implement-from-figma',
  'gen-tests',
  'plan-e2e',
  'verify-e2e-smoke',
  'verify-changes',
  'verify-agent-docs',
  'verify-github-workflows',
  'review-changes',
  'review-code-quality',
  'review-architecture',
  'refactor-code',
  'diagnose-performance',
  'configure-openapi-types',
  'assess-api-contract',
  'verify-spec-sync',
  'prepare-feature-scope',
  'prepare-issue',
  'prepare-commit',
  'prepare-pull-request',
  'deliver-work',
  'review-pr',
];
const missingFiles = requiredFiles.filter((file) => !existsSync(resolve(root, file)));

if (missingFiles.length > 0) {
  throw new Error(
    `Missing agent documentation:\n${missingFiles.map((file) => `- ${file}`).join('\n')}`,
  );
}

const claudeEntry = readFileSync(resolve(root, 'CLAUDE.md'), 'utf8');
if (!claudeEntry.includes('@AGENTS.md') || !claudeEntry.includes('@docs/agent/bootstrap.md')) {
  throw new Error('CLAUDE.md must load AGENTS.md and docs/agent/bootstrap.md.');
}

const workspacePaths = [
  'apps/web',
  'apps/admin',
  'packages/api-core',
  'packages/design-system',
  'packages/bridge',
];

for (const workspacePath of workspacePaths) {
  const claudePath = `${workspacePath}/CLAUDE.md`;
  const claudeAdapter = readFileSync(resolve(root, claudePath), 'utf8').trim();

  if (claudeAdapter !== '@AGENTS.md') {
    throw new Error(`${claudePath} must only import its local AGENTS.md.`);
  }
}

for (const roleName of roleNames) {
  const rolePath = `docs/agent/roles/${roleName}.md`;
  const claudeAgentPath = `.claude/agents/bunch-${roleName}.md`;
  const codexAgentPath = `.codex/agents/bunch-${roleName}.toml`;

  for (const file of [claudeAgentPath, codexAgentPath]) {
    if (!existsSync(resolve(root, file))) {
      throw new Error(`Missing ${roleName} adapter: ${file}`);
    }

    if (!readFileSync(resolve(root, file), 'utf8').includes(rolePath)) {
      throw new Error(`${file} must reference ${rolePath}.`);
    }
  }
}

for (const skillName of skillNames) {
  const skillPath = `.agents/skills/${skillName}/SKILL.md`;
  if (!existsSync(resolve(root, skillPath))) {
    throw new Error(`Missing repo-scoped skill: ${skillPath}`);
  }

  const skill = readFileSync(resolve(root, skillPath), 'utf8');
  if (skill.includes('[TODO:')) {
    throw new Error(`${skillPath} contains unfinished skill template content.`);
  }

  const claudeSkillPath = `.claude/skills/${skillName}/SKILL.md`;
  if (!existsSync(resolve(root, claudeSkillPath))) {
    throw new Error(
      `Missing Claude Code skill adapter: ${claudeSkillPath}. Claude Code only discovers skills registered under .claude/skills/.`,
    );
  }

  if (readFileSync(resolve(root, claudeSkillPath), 'utf8') !== skill) {
    throw new Error(
      `${claudeSkillPath} must mirror ${skillPath} exactly. Link .claude/skills/${skillName} to .agents/skills/${skillName} instead of copying it.`,
    );
  }
}

console.log('Agent documentation structure is valid.');
