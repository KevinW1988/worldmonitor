// #5231 — static dependency-contract guard for the zero/single-npm-install
// Docker seed-bundle containers.
//
// These containers install (at most) the tsx loader — no scripts/package.json,
// no root node_modules. Everything their entry script reaches — the bundle
// runner, member scripts, scripts/ helpers, and (for resilience-validation)
// the ../server/*.ts modules loaded through tsx — must resolve using node:
// builtins and files the Dockerfile actually COPYs. ESM resolves a module's
// full static import closure eagerly, so ONE bad edge anywhere in that
// closure crashes the cron with ERR_MODULE_NOT_FOUND even if the importing
// code path never runs.
//
// That is exactly how #5229 broke seed-bundle-resilience-validation:
// server/_shared/usage.ts (deep in the closure via redis.ts) gained a static
// import of ./rate-limit, whose own static imports pull @upstash/ratelimit —
// declared only in the ROOT package.json, absent from the container. The
// seeder never calls the rate limiter; it crashed anyway, at resolution time.
//
// The guard enforces three container invariants, per container, with the
// COPY roots and installed-package set DERIVED from each Dockerfile (so the
// test cannot drift from the image contract):
//   1. every relative import in the reachable graph resolves on disk;
//   2. every resolved file lives inside the container's COPY roots (a module
//      that resolves in the repo but is never COPY'd — e.g. api/ — is the
//      same production crash);
//   3. every bare specifier (static import OR require) is a node builtin or
//      an installed package.
//
// Scope notes (kept deliberately aligned with the crash mechanics):
//  - `import type` / `export type` edges are skipped (tsx erases them).
//  - Comments are stripped (structure-preserving tokenizer) before edge
//    extraction, so commented-out imports and JSDoc `@typedef {import(...)}`
//    text are not edges, while string/template contents are preserved.
//  - Dynamic import() literals are followed only when they resolve into a
//    container's dynamic-follow roots (server/ for resilience-validation —
//    the members execute those unconditionally; loading the scorers IS their
//    job). Unresolvable or computed dynamic imports are out of scope.
//  - createRequire(...)('<spec>') chains are treated as require edges —
//    _seed-utils.mjs eagerly createRequire()s _proxy-utils.cjs at module top
//    level, so that CJS closure loads at seeder startup.
//
// The final describe block is a self-test: it builds a synthetic module tree
// in a tmpdir with one planted violation of each class and asserts the
// walker still catches them — so a regex/walker regression fails loudly
// instead of silently blinding the guard.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// --- Dockerfile contract derivation ----------------------------------------

// Directory-level COPY sources (`COPY <dir>/ ./<dir>/`) define where imports
// may resolve; the `npm install` RUN line defines the bare-specifier budget.
// Deriving both here means adding a package to the image or a new COPY root
// updates the guard automatically — and removing one makes the guard fail
// loudly instead of silently passing on a contract the image no longer meets.
function parseDockerfileContract(dockerfileName) {
  const src = readFileSync(join(root, dockerfileName), 'utf-8');

  const copyRoots = [];
  for (const m of src.matchAll(/^COPY\s+([A-Za-z0-9._-]+)\/\s+\.\//gm)) {
    copyRoots.push(m[1]);
  }

  const installedPackages = new Set();
  const installLines = [...src.matchAll(/^RUN\s+npm\s+install\b[^\n]*/gm)];
  for (const [line] of installLines) {
    for (const m of line.matchAll(/\s((?:@[a-z0-9._-]+\/)?[a-z0-9._-]+)@[\d^~]/g)) {
      installedPackages.add(m[1]);
    }
  }
  if (installLines.length > 0) {
    assert.ok(
      installedPackages.size > 0,
      `${dockerfileName} has an npm install line but no parseable package@version tokens — update the parser with the Dockerfile refactor`,
    );
  }
  // tsx is the ESM loader, wired via NODE_OPTIONS — code importing tsx
  // directly would be a smell this guard should surface, so it does not
  // count toward the bare-specifier budget.
  installedPackages.delete('tsx');

  return { copyRoots, installedPackages };
}

// --- Source preparation and edge extraction ---------------------------------

// Structure-preserving comment strip. A state machine, not regexes: naive
// regex stripping misreads `/*` inside comment text or strings (a comment
// mentioning `@upstash/*` swallowed everything to the next `*/`, silently
// deleting real imports from extraction) and misreads `//` inside string
// literals. Comments are removed exactly; string/template contents and line
// structure are preserved. Known limit: a bare `//` inside a regex literal's
// character class would be misread — no such shape exists in the walked
// graphs, and the deep-node canaries below backstop it.
function stripComments(src) {
  let out = '';
  let state = 'code'; // code | line | block | squote | dquote | template
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; i += 2; continue; }
      if (c === '/' && n === '*') { state = 'block'; i += 2; continue; }
      if (c === "'") state = 'squote';
      else if (c === '"') state = 'dquote';
      else if (c === '`') state = 'template';
      out += c; i += 1; continue;
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; out += c; }
      i += 1; continue;
    }
    if (state === 'block') {
      if (c === '*' && n === '/') { state = 'code'; i += 2; continue; }
      if (c === '\n') out += c;
      i += 1; continue;
    }
    // Inside a string or template literal: pass through, honor escapes.
    if (c === '\\') { out += c + (n ?? ''); i += 2; continue; }
    if ((state === 'squote' && c === "'") || (state === 'dquote' && c === '"') || (state === 'template' && c === '`')) {
      state = 'code';
    }
    out += c; i += 1;
  }
  return out;
}

// Extract import edges from one source file (comments already stripped).
function extractEdges(src) {
  const staticSpecs = [];
  const dynamicSpecs = [];
  const requireSpecs = [];

  // import ... from '...' (multi-line safe; skips `import type`)
  for (const m of src.matchAll(/^[ \t]*import\s+(?!type\s)[^'";]*?\bfrom\s*['"]([^'"]+)['"]/gms)) {
    staticSpecs.push(m[1]);
  }
  // side-effect: import '...'
  for (const m of src.matchAll(/^[ \t]*import\s*['"]([^'"]+)['"]/gm)) {
    staticSpecs.push(m[1]);
  }
  // export { ... } from '...' / export * from '...' (skips `export type`)
  for (const m of src.matchAll(/^[ \t]*export\s+(?!type\b)(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/gms)) {
    staticSpecs.push(m[1]);
  }
  // dynamic import('...') literals
  for (const m of src.matchAll(/\bimport\(\s*['"]([^'"]+)['"]/g)) {
    dynamicSpecs.push(m[1]);
  }
  // require('...') literals (plain require in .cjs, or a createRequire-bound
  // local named require)
  for (const m of src.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    requireSpecs.push(m[1]);
  }
  // createRequire(import.meta.url)('...') — immediately-invoked form; the
  // plain require regex cannot see it (no lowercase `require(` substring)
  for (const m of src.matchAll(/\bcreateRequire\([^)]*\)\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    requireSpecs.push(m[1]);
  }
  return { staticSpecs, dynamicSpecs, requireSpecs };
}

function isBare(spec) {
  return !spec.startsWith('.') && !spec.startsWith('/');
}

// Resolve a relative specifier the way node+tsx would inside the container.
function resolveRelative(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.mts`,
    `${base}.js`,
    `${base}.mjs`,
    `${base}.cjs`,
    join(base, 'index.ts'),
    join(base, 'index.js'),
    join(base, 'index.mjs'),
  ];
  // TS-style: an explicit .js specifier may map to a .ts source.
  if (spec.endsWith('.js')) candidates.push(base.replace(/\.js$/, '.ts'));
  if (spec.endsWith('.mjs')) candidates.push(base.replace(/\.mjs$/, '.mts'));
  return candidates.find((p) => existsSync(p) && statSync(p).isFile()) ?? null;
}

// --- The walk ----------------------------------------------------------------

// Walk the container-reachable graph from `rootFiles` under `contract`:
//   contract.repoRoot        — absolute path imports may not escape reporting-wise
//   contract.copyRootDirs    — absolute dirs the image COPYs (containment set)
//   contract.dynamicRootDirs — absolute dirs dynamic import() literals are
//                              followed into (executed-unconditionally set)
//   contract.installedPackages — bare-specifier budget beyond node builtins
// Returns violations/unresolved (each with the import chain from a root) and
// the visited set for reachability assertions.
function walkContainerGraph(rootFiles, contract) {
  const parent = new Map();
  const visited = new Set();
  const queue = [...rootFiles];
  const violations = [];
  const unresolved = [];

  const chainOf = (file) => {
    const chain = [];
    for (let f = file; f; f = parent.get(f)) chain.unshift(relative(contract.repoRoot, f));
    return chain.join('\n    -> ');
  };

  const inside = (dirs, p) => dirs.some((d) => p.startsWith(d + sep));

  const followRelative = (file, spec) => {
    const resolved = resolveRelative(file, spec);
    if (!resolved) {
      unresolved.push(`'${spec}' imported from\n    ${chainOf(file)}`);
      return;
    }
    if (!inside(contract.copyRootDirs, resolved)) {
      violations.push(
        `'${spec}' resolves in the repo but OUTSIDE the container COPY set (${relative(contract.repoRoot, resolved)}) via\n    ${chainOf(file)}`,
      );
      return;
    }
    if (!visited.has(resolved) && !parent.has(resolved)) parent.set(resolved, file);
    queue.push(resolved);
  };

  const checkBare = (file, spec, how) => {
    const pkg = spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/');
    if (!isBuiltin(spec) && !contract.installedPackages.has(pkg)) {
      violations.push(`'${spec}' ${how} via\n    ${chainOf(file)}`);
    }
  };

  while (queue.length > 0) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    if (extname(file) === '.json') continue; // data, no imports

    const src = stripComments(readFileSync(file, 'utf-8'));
    const { staticSpecs, dynamicSpecs, requireSpecs } = extractEdges(src);

    for (const spec of staticSpecs) {
      if (isBare(spec)) checkBare(file, spec, 'statically imported');
      else followRelative(file, spec);
    }
    for (const spec of requireSpecs) {
      // A top-level require in a walked file loads eagerly at startup (e.g.
      // _seed-utils.mjs createRequire()s _proxy-utils.cjs at module scope),
      // so bare requires get the same budget check as static imports. The
      // walked graph is require-clean today; if a genuinely-lazy bare
      // require ever appears, exempt that one site explicitly.
      if (isBare(spec)) checkBare(file, spec, 'require()d');
      else followRelative(file, spec);
    }
    for (const spec of dynamicSpecs) {
      if (isBare(spec)) continue; // lazy; cannot classify statically
      const resolved = resolveRelative(file, spec);
      if (resolved && inside(contract.dynamicRootDirs, resolved)) {
        if (!visited.has(resolved) && !parent.has(resolved)) parent.set(resolved, file);
        queue.push(resolved);
      }
    }
  }

  return { violations, unresolved, visited };
}

// --- Container contracts under guard ----------------------------------------

// minVisited is a tight sanity floor against a silently-shrunken walk (a
// dropped edge class shrinks the graph without producing violations or
// unresolved entries); deepNodes pin the load-bearing modules explicitly.
// Current actual counts (2026-07-12): resilience-validation 35, portwatch 9.
const CONTAINERS = [
  {
    name: 'seed-bundle-resilience-validation',
    dockerfile: 'Dockerfile.seed-bundle-resilience-validation',
    bundleScript: 'seed-bundle-resilience-validation.mjs',
    minMembers: 3,
    mustIncludeMember: 'validate-resilience-sensitivity.mjs',
    dynamicRoots: ['server'],
    minVisited: 32,
    deepNodes: [
      'scripts/_bundle-runner.mjs',
      'scripts/_proxy-utils.cjs',
      'server/_shared/redis.ts',
      'server/_shared/usage.ts',
      'server/_shared/client-ip.ts',
    ],
  },
  {
    name: 'seed-bundle-portwatch-port-activity',
    dockerfile: 'Dockerfile.seed-bundle-portwatch-port-activity',
    bundleScript: 'seed-bundle-portwatch-port-activity.mjs',
    minMembers: 1,
    mustIncludeMember: 'seed-portwatch-port-activity.mjs',
    dynamicRoots: [],
    minVisited: 8,
    deepNodes: ['scripts/_bundle-runner.mjs', 'scripts/_proxy-utils.cjs'],
  },
];

const scriptsDir = join(root, 'scripts');

function buildContract(container) {
  const { copyRoots, installedPackages } = parseDockerfileContract(container.dockerfile);
  assert.ok(
    copyRoots.includes('scripts'),
    `${container.dockerfile}: no 'COPY scripts/ ...' line parsed — Dockerfile format changed; update parseDockerfileContract`,
  );
  return {
    repoRoot: root,
    copyRootDirs: copyRoots.map((d) => join(root, d)),
    dynamicRootDirs: container.dynamicRoots.map((d) => join(root, d)),
    installedPackages,
  };
}

function walkRootsFor(container) {
  const bundleSrc = readFileSync(join(scriptsDir, container.bundleScript), 'utf-8');
  const members = [...bundleSrc.matchAll(/script:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(
    members.length >= container.minMembers,
    `${container.bundleScript}: expected >=${container.minMembers} member scripts, found ${members.length} — bundle definition or the member regex drifted`,
  );
  assert.ok(
    members.includes(container.mustIncludeMember),
    `${container.bundleScript}: expected member ${container.mustIncludeMember} missing — bundle definition or the member regex drifted`,
  );
  // The entry script's own closure (-> _bundle-runner.mjs) resolves FIRST in
  // the container (it is the CMD), before any member spawns — walk it too.
  const roots = [join(scriptsDir, container.bundleScript), ...members.map((m) => join(scriptsDir, m))];
  for (const r of roots) {
    assert.ok(existsSync(r), `walk root missing on disk: ${relative(root, r)}`);
  }
  return roots;
}

for (const container of CONTAINERS) {
  describe(`${container.name} container import graph (#5231)`, () => {
    const contract = buildContract(container);
    const { violations, unresolved, visited } = walkContainerGraph(walkRootsFor(container), contract);

    it('every relative import resolves on disk', () => {
      assert.deepEqual(
        unresolved,
        [],
        `unresolvable relative import(s) — these crash the cron with ERR_MODULE_NOT_FOUND:\n\n  ${unresolved.join('\n\n  ')}`,
      );
    });

    it('reaches no bare specifier or COPY-set escape the container cannot resolve', () => {
      assert.deepEqual(
        violations,
        [],
        `import(s) reachable from ${container.name} that its container cannot resolve ` +
          `(${container.dockerfile} defines the COPY roots and the installed-package budget). ESM resolves ` +
          `these eagerly, so the cron crashes with ERR_MODULE_NOT_FOUND even if the importing code never ` +
          `runs. Break the import chain (extract a dependency-free module) or change the container image:\n\n  ${violations.join('\n\n  ')}`,
      );
    });

    it('walk reaches the load-bearing deep nodes (walker-regression canary)', () => {
      for (const node of container.deepNodes) {
        assert.ok(
          visited.has(join(root, node)),
          `${node} not visited — an edge class was silently dropped from the walk (visited ${visited.size} files)`,
        );
      }
      assert.ok(
        visited.size >= container.minVisited,
        `graph walk shrank — visited only ${visited.size} modules (floor ${container.minVisited}); ` +
          `if files were legitimately removed, update minVisited alongside the change`,
      );
    });
  });
}

// --- Guard self-test: the walker must still catch each violation class ------

describe('import-graph guard self-test (synthetic fixtures)', () => {
  let fixRoot;
  let result;

  before(() => {
    fixRoot = mkdtempSync(join(tmpdir(), 'wm-import-graph-guard-'));
    const write = (rel, content) => {
      const p = join(fixRoot, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, content);
    };

    write(
      'scripts/entry.mjs',
      [
        "import './helper.mjs';",
        "import 'node:fs';",
        "// import './commented-out.mjs'",
        "import { createRequire } from 'node:module';",
        "const load = createRequire(import.meta.url)('./util.cjs');",
        "const scorer = import('../srv/scorer.ts');",
        '',
      ].join('\n'),
    );
    write(
      'scripts/helper.mjs',
      [
        'import {',
        '  aThing,',
        '  bThing,',
        "} from './deep/multi.mjs';",
        "import type { Phantom } from 'phantom-types-pkg';",
        "import '@evil/bare-pkg';",
        '',
      ].join('\n'),
    );
    write('scripts/deep/multi.mjs', "import { esc } from '../../api/outside.js';\nexport const aThing = 1;\nexport const bThing = 2;\n");
    write('scripts/util.cjs', "const p = require('node:path');\nconst bad = require('bad-npm-cjs');\nmodule.exports = { p, bad };\n");
    write('srv/scorer.ts', "import gone from './gone';\nexport default gone;\n");
    write('api/outside.js', 'export const esc = true;\n');

    result = walkContainerGraph([join(fixRoot, 'scripts/entry.mjs')], {
      repoRoot: fixRoot,
      copyRootDirs: [join(fixRoot, 'scripts'), join(fixRoot, 'srv')],
      dynamicRootDirs: [join(fixRoot, 'srv')],
      installedPackages: new Set(),
    });
  });

  after(() => {
    rmSync(fixRoot, { recursive: true, force: true });
  });

  it('flags a bare npm static import (the #5229 class)', () => {
    assert.ok(
      result.violations.some((v) => v.includes("'@evil/bare-pkg' statically imported")),
      `missing bare-import violation; got:\n${result.violations.join('\n')}`,
    );
  });

  it('flags a bare require() in an eagerly-loaded CJS closure', () => {
    assert.ok(
      result.violations.some((v) => v.includes("'bad-npm-cjs' require()d")),
      `missing bare-require violation (createRequire edge not followed?); got:\n${result.violations.join('\n')}`,
    );
  });

  it('flags a relative import that resolves outside the COPY roots', () => {
    assert.ok(
      result.violations.some((v) => v.includes('OUTSIDE the container COPY set') && v.includes('api')),
      `missing COPY-set containment violation; got:\n${result.violations.join('\n')}`,
    );
  });

  it('reports an unresolvable relative import (through the dynamic-follow root)', () => {
    assert.ok(
      result.unresolved.some((u) => u.includes("'./gone'")),
      `missing unresolved entry (dynamic follow into srv/ broken?); got:\n${result.unresolved.join('\n')}`,
    );
  });

  it('follows multi-line imports and skips comments and type-only imports', () => {
    assert.ok(result.visited.has(join(fixRoot, 'scripts/deep/multi.mjs')), 'multi-line import edge not followed');
    assert.ok(
      !result.violations.some((v) => v.includes('phantom-types-pkg')),
      'import type must not count as an edge',
    );
    assert.ok(
      ![...result.visited].some((f) => f.includes('commented-out')),
      'commented-out import must not be walked',
    );
  });
});
