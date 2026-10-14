import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ignoredPathPatterns = [
  /^\.yarn\//,
  /^\.pnp\./,
  /^yarn\.lock$/,
  /^coverage\//,
  /^storybook-static\//,
  /\/storybook-static\//,
  /\.(png|jpe?g|gif|webp|svg|ico|snap)$/,
];

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const parseArguments = (argumentsList) => {
  const options = { dryRun: true };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === '--') continue;
    if (argument === '--comments') options.commentsPath = argumentsList[++index];
    else if (argument === '--pr') options.pr = argumentsList[++index];
    else if (argument === '--publish') options.dryRun = false;
    else if (argument === '--dry-run') options.dryRun = true;
    else fail(`지원하지 않는 옵션입니다: ${argument}`);
  }

  if (!options.commentsPath) fail('--comments <payload.json>이 필요합니다.');
  if (!options.pr) fail('--pr <번호 또는 GitHub PR URL>이 필요합니다.');

  return options;
};

const loadTokenFile = () => {
  const environmentPath = resolve('.env.pr-review');
  if (!existsSync(environmentPath)) return;

  for (const rawLine of readFileSync(environmentPath, 'utf8').split(/\r?\n/)) {
    const match = rawLine.trim().match(/^GH_TOKEN\s*=\s*(.*)$/);
    if (!match || process.env.GH_TOKEN) continue;
    process.env.GH_TOKEN = match[1].trim().replace(/^['"]|['"]$/g, '');
  }
};

const parsePrReference = (reference) => {
  const urlMatch = reference.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/);
  if (urlMatch) return { owner: urlMatch[1], repository: urlMatch[2], number: Number(urlMatch[3]) };

  if (!/^\d+$/.test(reference))
    fail('PR 번호 또는 https://github.com/OWNER/REPO/pull/NUMBER 형식을 사용하세요.');

  let remoteUrl;
  try {
    remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
  } catch {
    fail('origin remote를 찾을 수 없습니다. PR URL을 전달하세요.');
  }

  const remoteMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (!remoteMatch) fail('GitHub origin remote를 해석할 수 없습니다. PR URL을 전달하세요.');

  return { owner: remoteMatch[1], repository: remoteMatch[2], number: Number(reference) };
};

const readPayload = (commentsPath) => {
  if (!existsSync(commentsPath)) fail(`리뷰 payload 파일을 찾을 수 없습니다: ${commentsPath}`);

  let payload;
  try {
    payload = JSON.parse(readFileSync(commentsPath, 'utf8'));
  } catch {
    fail('리뷰 payload는 올바른 JSON이어야 합니다.');
  }

  if (
    typeof payload.body !== 'string' ||
    !payload.body.includes('## Summary') ||
    !payload.body.includes('## Code Review')
  ) {
    fail('payload.body에는 ## Summary와 ## Code Review 섹션이 필요합니다.');
  }

  const comments = Array.isArray(payload.comments) ? payload.comments : [];
  const normalizedComments = comments.flatMap((comment) => {
    if (!comment?.path || !comment?.body) fail('각 inline comment에는 path와 body가 필요합니다.');
    if (ignoredPathPatterns.some((pattern) => pattern.test(comment.path))) return [];
    if (!Number.isInteger(comment.line) || !['LEFT', 'RIGHT'].includes(comment.side)) {
      fail(`${comment.path}의 inline comment에는 line과 LEFT 또는 RIGHT side가 필요합니다.`);
    }

    return [{ path: comment.path, line: comment.line, side: comment.side, body: comment.body }];
  });

  return { body: payload.body, comments: normalizedComments };
};

const githubRequest = async (token, method, path, body) => {
  const response = await fetch(`https://api.github.com/${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'bunch-pr-review',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${method} ${path} 요청이 실패했습니다. status=${response.status}`);
  }

  return response.json();
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  const target = parsePrReference(options.pr);
  const payload = readPayload(options.commentsPath);

  if (options.dryRun) {
    console.log(`Dry run: ${target.owner}/${target.repository} PR #${target.number}`);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  loadTokenFile();
  if (!process.env.GH_TOKEN)
    fail('게시하려면 GH_TOKEN 또는 gitignore된 .env.pr-review의 GH_TOKEN이 필요합니다.');

  const pullRequest = await githubRequest(
    process.env.GH_TOKEN,
    'GET',
    `repos/${target.owner}/${target.repository}/pulls/${target.number}`,
  );

  await githubRequest(
    process.env.GH_TOKEN,
    'POST',
    `repos/${target.owner}/${target.repository}/pulls/${target.number}/reviews`,
    {
      body: payload.body,
      comments: payload.comments,
      commit_id: pullRequest.head.sha,
      event: 'COMMENT',
    },
  );

  console.log(
    `PR #${target.number}에 ${payload.comments.length}개의 inline review comment를 게시했습니다.`,
  );
};

await main();
