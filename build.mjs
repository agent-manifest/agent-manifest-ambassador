/**
 * Build the one file this site does not write by hand, and the licence notices
 * that must travel with it.
 *
 * The Ambassador is a static page: HTML, CSS and a script, served as they are.
 * It stays that way. The single exception is the validator, which is not ours
 * to write — it is the published @agent-manifest/client, bundled here into a
 * plain script the page can load with a <script> tag.
 *
 * Why a bundle and not a CDN link: a CDN would make the page depend on a third
 * party being up and serving the bytes we expect. The artefact is committed, so
 * the site has no build step to be served, and CI rebuilds it from the pinned
 * dependency and fails if the committed file differs.
 *
 * The schema travels with it. Every enum, bound and pattern the interview
 * enforces is read from that schema at run time, so this page carries no
 * transcription of the specification that could quietly fall out of date.
 *
 * The bundle is other people's code under other licences (Apache-2.0, MIT,
 * BSD-3-Clause, CC0), and minification strips every notice from it. Those
 * licences ask that the notice accompany each copy, so the build also writes
 * vendor/THIRD_PARTY_NOTICES.txt: one entry per package that actually ended up
 * in the bundle, with the licence text as the package itself ships it.
 */
import { build } from 'esbuild';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const clientVersion = require('@agent-manifest/client/package.json').version;
const schemaVersion = require('@agent-manifest/schema/package.json').version;

const ENTRY = `
import { validate } from '@agent-manifest/client/validate';
import { schemaV1_0, SOURCE } from '@agent-manifest/schema';

// The whole surface this page is allowed to use. Anything else it needs, it
// reads out of the schema.
globalThis.AgentManifest = { validate, schema: schemaV1_0, source: SOURCE };
`;

const OUT = 'vendor/agent-manifest-v1.0.js';
const NOTICES = 'vendor/THIRD_PARTY_NOTICES.txt';

await writeFile('.build-entry.js', ENTRY);

const result = await build({
  entryPoints: ['.build-entry.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2019',
  outfile: OUT,
  banner: {
    js:
      `/* Built by build.mjs — do not edit.\n` +
      ` * @agent-manifest/client ${clientVersion}, @agent-manifest/schema ${schemaVersion}.\n` +
      ` * Rebuild with: npm ci && npm run build\n` +
      ` * Third-party licences: THIRD_PARTY_NOTICES.txt, next to this file.\n` +
      ` */`,
  },
  legalComments: 'none',
  metafile: true,
});

// Every package with at least one file in the bundle, read from esbuild's own
// record of its inputs rather than from a hand-kept list.
const packageDirs = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
  const at = input.lastIndexOf('node_modules/');
  if (at === -1) continue;
  const parts = input.slice(at + 'node_modules/'.length).split('/');
  const name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
  packageDirs.add(`${input.slice(0, at)}node_modules/${name}`);
}

const repositoryUrl = (repository) => {
  const raw = typeof repository === 'string' ? repository : repository?.url;
  if (!raw) return null;
  const url = /^[\w.-]+\/[\w.-]+$/.test(raw) ? `https://github.com/${raw}` : raw;
  return url.replace(/^git\+/, '').replace(/\.git$/, '');
};

const packages = [];
for (const dir of packageDirs) {
  const meta = JSON.parse(await readFile(`${dir}/package.json`, 'utf8'));
  const files = (await readdir(dir))
    .filter((f) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(f))
    .sort();
  if (files.length === 0) {
    throw new Error(`${meta.name} is bundled but ships no licence file`);
  }
  const texts = [];
  for (const f of files) {
    texts.push((await readFile(`${dir}/${f}`, 'utf8')).replace(/\r\n/g, '\n').trimEnd());
  }
  packages.push({ meta, texts });
}
packages.sort((a, b) => (a.meta.name < b.meta.name ? -1 : 1));

const RULE = '='.repeat(72);
let notices =
  `Third-party software in ${OUT}\n\n` +
  `That file is built by build.mjs from the npm packages listed below. They\n` +
  `are not covered by this repository's CC BY 4.0 licence: each is\n` +
  `distributed under its own licence, reproduced below as the package ships\n` +
  `it.\n\n` +
  `This file is written by build.mjs. Do not edit it; rebuild instead.\n\n`;
for (const { meta } of packages) {
  notices += `  ${meta.name} ${meta.version} (${meta.license})\n`;
}
for (const { meta, texts } of packages) {
  notices += `\n${RULE}\n${meta.name} ${meta.version}\nLicense: ${meta.license}\n`;
  const source = repositoryUrl(meta.repository);
  if (source) notices += `Source: ${source}\n`;
  notices += `${RULE}\n\n${texts.join('\n\n')}\n`;
}
await writeFile(NOTICES, notices);

const bytes = (await readFile(OUT)).length;
process.stdout.write(
  `${OUT}: ${bytes} bytes (client ${clientVersion}, schema ${schemaVersion})\n` +
    `${NOTICES}: ${packages.length} packages\n`,
);
