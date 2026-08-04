![Status](https://img.shields.io/badge/status-operational-1a1917?style=flat-square)
![Schema](https://img.shields.io/badge/schema-v1.0-1a1917?style=flat-square)
![License](https://img.shields.io/badge/license-CC%20BY%204.0-lightgrey?style=flat-square)
[![Live](https://img.shields.io/badge/live-agent--manifest.github.io-1a1917?style=flat-square)](https://agent-manifest.github.io/agent-manifest-ambassador/)

# Agent Manifest Ambassador v0.1

Public generator for Agent Manifest v1.0 declarations.

-----

## What this is

The Ambassador is a public, browser-based conversational generator. It guides a user through structured declaration questions and produces a v1.0-compliant `manifest.json`.

The generated manifest can be copied, downloaded, or submitted directly to the Diplomat registration gateway from the same interface.

-----

## What this is not

- **Not an enforcement layer.** The Ambassador generates declarations; it does not constrain how a declared agent then behaves.
- **Not a runtime.** It does not execute, observe, or supervise any agent.
- **Not a compliance evaluator.** It does not score, certify, or audit submitted declarations.
- **Not an adoption claim.** Generating a manifest is not endorsement of the declaring system.

-----

## What it produces

A v1.0-compliant `manifest.json` containing the required declaration fields:

- agent identity (`agent_id`, `agent_name`, `agent_version`, `manifest_version`)
- ownership (`owner.type`, `owner.identifier`)
- purpose (`purpose.primary_code`, `purpose.description`)
- forbidden actions
- autonomy level
- risk profile
- data handling commitments
- stopping authority
- audit surface
- contact

Output conforms to the published JSON Schema at https://agent-manifest-spec.org/spec/v1.0/schema.json.

The strings you write into `forbidden actions` are free text: v1.0 defines no
vocabulary for them, and no rule for matching them against anything. See
[Known limits of v1.0](https://agent-manifest-spec.org/STABILITY.html#known-limits-of-v10)
before settling on a style.

### The schema, and where it comes from

This page used to carry the schema's rules written out by hand — the autonomy
range, the enums, the field patterns and lengths, and a closing check that
re-implemented validation in JavaScript. None of that is here any more.

`vendor/agent-manifest-v1.0.js` is built from the published
[`@agent-manifest/schema`](https://www.npmjs.com/package/@agent-manifest/schema)
and [`@agent-manifest/client`](https://www.npmjs.com/package/@agent-manifest/client)
packages, pinned to exact versions. Every rule the interview enforces is read
from that schema at run time, and the closing check is the published validator —
the same one the Diplomat runs on submission, so this page cannot accept a
declaration the next step will reject for a reason it never knew about.

The site is still static files: the artefact is committed, so nothing is built
to serve it. Rebuild it with `npm ci && npm run build`; CI rebuilds it from the
pinned dependencies and fails if the committed file differs by a byte. It is not
loaded from a CDN — a third party serving different bytes would change what this
page accepts, silently.

-----

## Submission flow

The Ambassador is one step in the ecosystem's declaration pipeline:

```
Ambassador  →  Diplomat  →  Dataset  →  Registry / Discovery
```

- **Ambassador** — the user generates a manifest interactively
- **Diplomat** — validates the submission against the full v1.0 JSON Schema and rejects duplicate `agent_id`s
- **Dataset** — stores accepted manifests append-only; its issue-based submission workflow validates against the same schema
- **Registry / Discovery** — the canonical `.well-known` endpoint surfaces recorded manifests to external consumers

-----

## Flow

The Ambassador walks a user through declaration stages:

1. Identity
2. Purpose
3. Forbidden actions
4. Autonomy
5. Governance
6. Compliance

Output: downloadable `.json` manifest conforming to https://agent-manifest-spec.org/spec/v1.0/schema.json.

-----

## Live tool

https://agent-manifest.github.io/agent-manifest-ambassador/

-----

## Canonical links

- **Specification** — https://agent-manifest-spec.org
- **Schema (v1.0)** — https://agent-manifest-spec.org/spec/v1.0/schema.json
- **Diplomat (registration gateway)** — https://agent-manifest-diplomat.vercel.app/api/register

-----

## Related

- Specification DOI: [10.5281/zenodo.18833956](https://doi.org/10.5281/zenodo.18833956)
- Diplomat repository: https://github.com/agent-manifest/agent-manifest-diplomat
- Validator: [agent-manifest-cli](https://github.com/agent-manifest/agent-manifest-cli) — full v1.0 schema validation

-----

## License

CC BY 4.0. See [`LICENSE`](./LICENSE).

---

**Part of the [Agent Manifest](https://agent-manifest-spec.org) ecosystem**

[Spec](https://github.com/agent-manifest/agent-manifest) ·
[Registry](https://github.com/agent-manifest/agent-manifest-registry) ·
[Dataset](https://github.com/agent-manifest/agent-manifest-dataset) ·
[Ambassador](https://github.com/agent-manifest/agent-manifest-ambassador) ·
[Diplomat](https://github.com/agent-manifest/agent-manifest-diplomat) ·
[Boundary Handshake](https://github.com/agent-manifest/boundary-handshake) ·
[∈ Principle](https://github.com/agent-manifest/e-principle)

CC BY 4.0
