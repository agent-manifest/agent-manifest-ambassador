/**
 * The page has no test framework and no DOM in CI. What it does have is a set
 * of rules it used to state itself and now reads from the schema, and that is
 * exactly what is worth checking: that the reading works, and that it returns
 * the values the specification actually declares.
 *
 * app.js is loaded as text and its schema-reading helpers are evaluated on
 * their own, against the same bundle the browser loads. Nothing here simulates
 * the interview; a mock DOM would prove that a mock DOM works.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(fileURLToPath(new URL(rel, root)), 'utf8');

// The bundle the browser loads, evaluated the way the browser evaluates it.
const bundle = await read('vendor/agent-manifest-v1.0.js');
const sandbox = { globalThis: null, console };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(bundle, sandbox);

// The helpers from app.js, taken from the file itself so this test cannot drift
// away from what the page runs. Everything below `var chat =` needs a DOM.
const appSource = await read('app.js');
const helpers = appSource.slice(0, appSource.indexOf('var chat = document.getElementById'));
vm.runInContext(helpers, sandbox);
const { field, allowed, isAllowed, listAllowed, AgentManifest } = sandbox;

// Values that cross out of the vm carry that context's prototypes, so strict
// deep comparison would fail on identity rather than on content.
const plain = (value) => JSON.parse(JSON.stringify(value));

test('the bundle exposes the validator and the schema, and nothing else', () => {
  assert.deepEqual(Object.keys(AgentManifest).sort(), ['schema', 'source', 'validate']);
  assert.equal(AgentManifest.schema.$id, 'https://agent-manifest-spec.org/spec/v1.0/schema.json');
  assert.equal(AgentManifest.schema.title, 'Agent Manifest v1.0');
});

test('the bundled schema is the canonical one, by its own checksum record', () => {
  assert.equal(
    AgentManifest.source.canonical_url,
    'https://agent-manifest-spec.org/spec/v1.0/schema.json',
  );
  assert.equal(AgentManifest.source.schema_version, '1.0');
});

test('the enums the interview offers are the ones the schema declares', () => {
  assert.deepEqual(plain(allowed('owner', 'type')), ['individual', 'organization', 'system']);
  assert.deepEqual(plain(allowed('risk_profile', 'level')), ['low', 'medium', 'high']);
  assert.deepEqual(plain(allowed('audit_surface', 'logging')), ['none', 'basic', 'detailed']);
  assert.deepEqual(plain(allowed('audit_surface', 'reconstructability')), ['none', 'partial', 'full']);
});

test('membership and prompt text both come from the schema', () => {
  assert.equal(isAllowed('organization', ['owner', 'type']), true);
  assert.equal(isAllowed('corporation', ['owner', 'type']), false);
  assert.equal(listAllowed('risk_profile', 'level'), 'low, medium, high');
});

test('the bounds the interview enforces are the ones the schema declares', () => {
  assert.equal(field('autonomy', 'level').minimum, 0);
  assert.equal(field('autonomy', 'level').maximum, 3);
  assert.equal(field('purpose', 'primary_code').minLength, 2);
  assert.equal(field('purpose', 'primary_code').pattern, '^[a-z0-9._-]+$');
  assert.equal(field('stopping_authority', 'mechanism').minLength, 5);
  assert.equal(field('forbidden_actions').minItems, 1);
  assert.equal(field('forbidden_actions').items.minLength, 2);
});

test('app.js states no enum, bound or pattern of its own', () => {
  // The rules this page enforces are the schema's. If one of them is ever
  // typed back into this file, this test is where it should be noticed.
  const transcriptions = [
    /'individual'\s*,\s*'organization'/,
    /'low'\s*,\s*'medium'\s*,\s*'high'/,
    /'none'\s*,\s*'basic'\s*,\s*'detailed'/,
    /'none'\s*,\s*'partial'\s*,\s*'full'/,
    /level\s*<\s*0\s*\|\|\s*level\s*>\s*3/,
    /\^P\(\?!\$\)/,
  ];
  for (const pattern of transcriptions) {
    assert.equal(pattern.test(appSource), false, `app.js still transcribes ${pattern}`);
  }
});

// The interview builds a document field by field; the closing check is the
// published validator. These two cases are the ones that matter: a complete
// declaration passes, and an incomplete one is refused with the validator's own
// reasons rather than a message this page invented.
const COMPLETE = {
  manifest_version: '1.0',
  agent_id: 'example.ambassador-test',
  agent_name: 'Ambassador Test',
  agent_version: '1.0.0',
  owner: { type: 'organization', identifier: 'Example Org' },
  purpose: { primary_code: 'support', description: 'Answer basic product questions for end users.' },
  forbidden_actions: ['never delete user data'],
  autonomy: { level: 0 },
  risk_profile: { level: 'low' },
  data_handling: { stores_personal_data: false },
  stopping_authority: { stoppable_by: ['operator'], mechanism: 'runtime disable via admin console' },
  audit_surface: { logging: 'basic', reconstructability: 'partial' },
  contact: { email: 'ops@example.com' },
};

test('a complete declaration passes the closing check', () => {
  const result = AgentManifest.validate(COMPLETE);
  assert.equal(result.schemaValid, true);
  assert.deepEqual(plain(result.errors), []);
  assert.equal(result.schemaVersion, '1.0');
});

test('an incomplete declaration is refused with the validator\'s own reasons', () => {
  const incomplete = { ...COMPLETE };
  delete incomplete.contact;
  const result = AgentManifest.validate(incomplete);
  assert.equal(result.schemaValid, false);
  assert.deepEqual(plain(result.errors), [
    { path: '/contact', message: "must have required property 'contact'" },
  ]);
});

test('a declaration the old hand-written guard would have let through is refused', () => {
  // The guard checked that autonomy.level was a number. It was not checking
  // that it was one of the four levels the specification defines.
  const outOfRange = { ...COMPLETE, autonomy: { level: 9 } };
  const result = AgentManifest.validate(outOfRange);
  assert.equal(result.schemaValid, false);
  assert.deepEqual(plain(result.errors), [{ path: '/autonomy/level', message: 'must be <= 3' }]);
});
