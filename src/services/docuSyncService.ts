import * as fs from 'fs';
import * as path from 'path';
import { Project, SyntaxKind, Node } from 'ts-morph';
import * as yaml from 'js-yaml';
import { createTwoFilesPatch } from 'diff';
import { Trigger, SpecSyncResult, EndpointChange } from '../types/index';

// HTTP methods we recognise as Express-style route registrations
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

interface DiscoveredEndpoint {
  method: string;
  path: string;
}

// Minimal OpenAPI path-item schema types
interface OpenApiOperation {
  summary?: string;
  operationId?: string;
  tags?: string[];
  responses: Record<string, { description: string }>;
}

interface OpenApiPathItem {
  [method: string]: OpenApiOperation;
}

interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  paths: Record<string, OpenApiPathItem>;
  [key: string]: unknown;
}

/**
 * Scans TypeScript source files for Express-style route registrations.
 *
 * Recognises patterns:
 *   app.get('/path', handler)
 *   router.post('/path', handler)
 *   get('/path', handler)    ← bare function call (as in mock api.ts)
 */
function discoverEndpoints(
  sourceFilePaths: string[],
  projectRoot: string
): DiscoveredEndpoint[] {
  const project = new Project({
    compilerOptions: { strict: false, allowJs: true, skipLibCheck: true },
    skipAddingFilesFromTsConfig: true,
  });

  project.addSourceFilesAtPaths(sourceFilePaths);
  // Also add all TS/JS files for import resolution, excluding node_modules
  const projectGlob = path.join(projectRoot).replace(/\\/g, '/');
  project.addSourceFilesAtPaths([
    `${projectGlob}/**/*.ts`,
    `${projectGlob}/**/*.tsx`,
    `${projectGlob}/**/*.js`,
    `${projectGlob}/**/*.jsx`,
    `!${projectGlob}/**/node_modules/**`,
  ]);

  const endpoints: DiscoveredEndpoint[] = [];

  for (const sf of project.getSourceFiles()) {
    if (!sourceFilePaths.includes(sf.getFilePath())) continue;

    const callExprs = sf.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExprs) {
      const expr = callExpr.getExpression();
      let methodName: string | undefined;

      // Pattern: app.get(...) / router.post(...)
      if (Node.isPropertyAccessExpression(expr)) {
        const prop = expr.getName().toLowerCase();
        if (HTTP_METHODS.has(prop)) {
          methodName = prop;
        }
      }

      // Pattern: get(...) / post(...)  — bare function call
      if (Node.isIdentifier(expr)) {
        const name = expr.getText().toLowerCase();
        if (HTTP_METHODS.has(name)) {
          methodName = name;
        }
      }

      if (!methodName) continue;

      // First argument must be a string literal (the path)
      const args = callExpr.getArguments();
      if (args.length === 0) continue;

      const firstArg = args[0];
      if (!Node.isStringLiteral(firstArg)) continue;

      const routePath = firstArg.getLiteralValue();
      endpoints.push({ method: methodName.toUpperCase(), path: routePath });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return endpoints.filter((ep) => {
    const key = `${ep.method}:${ep.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Generates a stub OpenAPI path item for a newly discovered endpoint.
 */
function makeStubPathItem(method: string, routePath: string): OpenApiPathItem {
  const operationId =
    method.toLowerCase() +
    routePath
      .replace(/\//g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .replace(/^_+/, '');

  return {
    [method.toLowerCase()]: {
      summary: `${method} ${routePath}`,
      operationId,
      tags: [routePath.split('/')[1] ?? 'default'],
      responses: {
        '200': { description: 'Success' },
      },
    },
  };
}

/**
 * Updates the README's ## API Endpoints section (or creates it).
 */
function patchReadme(
  readmePath: string,
  discoveredEndpoints: DiscoveredEndpoint[]
): string {
  const originalContent = fs.existsSync(readmePath)
    ? fs.readFileSync(readmePath, 'utf-8')
    : '';

  const tableHeader = '| Method | Path | Description |\n|---|---|---|';
  const tableRows = discoveredEndpoints
    .map((ep) => `| \`${ep.method}\` | \`${ep.path}\` | Auto-synced by DocuSync |`)
    .join('\n');

  const newSection = `## API Endpoints\n\n${tableHeader}\n${tableRows}\n`;

  let updatedContent: string;

  const sectionRegex = /## API Endpoints[\s\S]*?(?=\n## |\n---|\n$|$)/;
  if (sectionRegex.test(originalContent)) {
    updatedContent = originalContent.replace(sectionRegex, newSection);
  } else {
    updatedContent = originalContent.trimEnd() + '\n\n' + newSection;
  }

  fs.writeFileSync(readmePath, updatedContent, 'utf-8');

  return createTwoFilesPatch(
    'a/README.md',
    'b/README.md',
    originalContent,
    updatedContent,
    'original',
    'patched'
  );
}

/**
 * Core DocuSync logic.
 *
 * @param changedFiles  Absolute paths to route source files to scan.
 * @param projectRoot   Root of the project (contains openapi.yaml).
 */
export async function syncDocs(
  changedFiles: string[],
  projectRoot: string
): Promise<SpecSyncResult> {
  const specPath = path.join(projectRoot, 'openapi.yaml');

  // If the project has no openapi.yaml, generate a minimal stub so the
  // pipeline can still run against external repos that don't ship one.
  const originalYaml = fs.existsSync(specPath)
    ? fs.readFileSync(specPath, 'utf-8')
    : '';

  const repoName = path.basename(projectRoot);

  let spec: OpenApiSpec;
  if (originalYaml) {
    // yaml.load() returns null for empty/whitespace/comment-only files,
    // and may return a non-object for malformed YAML.  Guard both cases.
    const parsed = yaml.load(originalYaml);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      spec = parsed as OpenApiSpec;
    } else {
      // File existed but was empty or unparseable — synthesise a stub
      spec = {
        openapi: '3.0.3',
        info: { title: repoName, version: '0.0.0', description: 'Auto-generated by SentinelDev DocuSync' },
        paths: {},
      };
    }
  } else {
    spec = {
      openapi: '3.0.3',
      info: { title: repoName, version: '0.0.0', description: 'Auto-generated by SentinelDev DocuSync' },
      paths: {},
    };
  }

  // Ensure required top-level fields are always present
  if (!spec.openapi) spec.openapi = '3.0.3';
  if (!spec.info)    spec.info    = { title: repoName, version: '0.0.0' };
  if (!spec.paths)   spec.paths   = {};

  // Discover all endpoints from the source files.
  // If no specific files were changed, scan all .ts files under src/.
  // discoverEndpoints resolves globs via ts-morph's addSourceFilesAtPaths,
  // so we need to pass the glob directly — not as a path inside an array
  // of literal file paths.
  let filesToScan: string[];
  if (changedFiles.length > 0) {
    filesToScan = changedFiles;
  } else {
    // Expand globs manually so discoverEndpoints receives real absolute file paths.
    // Scan the whole project root (not just src/) to support any layout.
    const { Project: GlobProject } = require('ts-morph') as typeof import('ts-morph');
    const gp = new GlobProject({ skipAddingFilesFromTsConfig: true });
    const projectGlob = path.join(projectRoot).replace(/\\/g, '/');
    gp.addSourceFilesAtPaths([
      `${projectGlob}/**/*.ts`,
      `${projectGlob}/**/*.tsx`,
      `${projectGlob}/**/*.js`,
      `${projectGlob}/**/*.jsx`,
      `!${projectGlob}/**/node_modules/**`,
    ]);
    filesToScan = gp.getSourceFiles().map((sf) => sf.getFilePath());
  }

  const discovered = discoverEndpoints(filesToScan, projectRoot);

  const endpointChanges: EndpointChange[] = [];
  const updatedEndpoints: string[] = [];

  for (const ep of discovered) {
    const specPath_ = ep.path; // avoid shadowing outer specPath
    const existing = spec.paths[specPath_];

    if (!existing) {
      // Endpoint is entirely new — add stub
      spec.paths[specPath_] = makeStubPathItem(ep.method, ep.path);
      endpointChanges.push({
        method: ep.method,
        path: ep.path,
        changeKind: 'added',
      });
      updatedEndpoints.push(`${ep.method} ${ep.path}`);
    } else if (!existing[ep.method.toLowerCase()]) {
      // Path exists but this method is missing
      existing[ep.method.toLowerCase()] = makeStubPathItem(ep.method, ep.path)[
        ep.method.toLowerCase()
      ];
      endpointChanges.push({
        method: ep.method,
        path: ep.path,
        changeKind: 'added',
      });
      updatedEndpoints.push(`${ep.method} ${ep.path}`);
    }
  }

  const updatedYaml = yaml.dump(spec, { lineWidth: 120, noRefs: true });
  fs.writeFileSync(specPath, updatedYaml, 'utf-8');

  const schemaDiff = createTwoFilesPatch(
    'a/openapi.yaml',
    'b/openapi.yaml',
    originalYaml,
    updatedYaml,
    'original',
    'patched'
  );

  // Patch README
  const readmePath = path.join(projectRoot, 'README.md');
  const readmePatch = patchReadme(readmePath, discovered);

  return {
    updatedEndpoints,
    endpointChanges,
    schemaDiff,
    specPath,
    readmePatch,
  };
}
