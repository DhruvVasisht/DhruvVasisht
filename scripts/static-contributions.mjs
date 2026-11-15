import { readFile, writeFile } from 'node:fs/promises';

for (const theme of ['', '-dark']) {
  const source = await readFile(
    `assets/contributions/snake${theme}.svg`,
    'utf8',
  );
  const root = source.match(/<svg\b[^>]*>/)?.[0];
  if (!root) throw new Error('The contribution SVG has no root element.');

  const colors = Object.fromEntries(
    [...source.matchAll(/(--[a-z0-9]+):([^;}]+)/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
  const levels = Object.fromEntries(
    [...source.matchAll(/\.c\.([a-z0-9]+)\{fill:var\((--c\d)\)/g)].map(
      (match) => [match[1], match[2]],
    ),
  );
  const cells = [...source.matchAll(/<rect\b[^>]*\/>/g)]
    .map(([rect]) => {
      const classes = rect.match(/class="([^"]+)"/)?.[1].split(' ') ?? [];
      if (classes[0] !== 'c') return null;
      const fill = colors[levels[classes[1]] ?? '--ce'];
      if (!fill) throw new Error('A contribution level has no color.');
      return rect.replace(
        /class="[^"]+"/,
        `width="12" height="12" fill="${fill}"`,
      );
    })
    .filter(Boolean);

  if (cells.length < 360 || cells.length > 371) {
    throw new Error(`Unexpected contribution calendar length: ${cells.length}`);
  }
  const svg = `${root}<title>Dhruv Vasisht's GitHub contributions over the past year</title>${cells.join('')}</svg>`;
  await writeFile(`assets/contributions/snake-static${theme}.svg`, svg);
  console.log(
    `Created ${theme || 'light'} static calendar with ${cells.length} days.`,
  );
}
