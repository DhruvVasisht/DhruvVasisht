import { readFile } from 'node:fs/promises';

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repository || !token)
  throw new Error('GitHub repository and token are required.');

async function request(path, options = {}) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/${path}`,
    {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
    },
  );
  if (!response.ok)
    throw new Error(`GitHub ${path} returned ${response.status}.`);
  return response.json();
}

const { default_branch: targetBranch } = await request('');
const ref = encodeURIComponent(targetBranch);
const branch = await request(`git/ref/heads/${ref}`);
const previous = await request(`git/commits/${branch.object.sha}`);
const files = [
  'snake.svg',
  'snake-dark.svg',
  'snake-static.svg',
  'snake-static-dark.svg',
];
const tree = await request('git/trees', {
  method: 'POST',
  body: JSON.stringify({
    base_tree: previous.tree.sha,
    tree: await Promise.all(
      files.map(async (path) => ({
        path: `assets/contributions/${path}`,
        mode: '100644',
        type: 'blob',
        content: await readFile(`assets/contributions/${path}`, 'utf8'),
      })),
    ),
  }),
});

if (tree.sha === previous.tree.sha) {
  console.log('Contribution graph is already current.');
} else {
  const commit = await request('git/commits', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Update contribution graph',
      tree: tree.sha,
      parents: [previous.sha],
    }),
  });
  await request(`git/refs/heads/${ref}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  console.log(
    `Published ${files.length} contribution images to ${targetBranch}.`,
  );
}
