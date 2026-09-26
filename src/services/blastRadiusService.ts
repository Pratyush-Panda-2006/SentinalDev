import * as path from 'path';
import { Project, Node, SyntaxKind, SourceFile } from 'ts-morph';
import {
  BlastRadiusResult,
  BlastRadiusScore,
  CallGraphNode,
} from '../types/index';

// Maximum recursion depth when building the caller tree
const MAX_DEPTH = 3;

/**
 * Resolves the name of the nearest enclosing function/method/arrow for a node.
 */
function getEnclosingFunctionName(node: Node): string {
  const fn =
    node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) ??
    node.getFirstAncestorByKind(SyntaxKind.MethodDeclaration) ??
    node.getFirstAncestorByKind(SyntaxKind.ArrowFunction) ??
    node.getFirstAncestorByKind(SyntaxKind.FunctionExpression);

  if (!fn) return '<module>';

  if (Node.isFunctionDeclaration(fn) || Node.isMethodDeclaration(fn)) {
    return fn.getName() ?? '<anonymous>';
  }
  // ArrowFunction / FunctionExpression — try to get from variable declaration
  const varDecl = fn.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
  if (varDecl && Node.isVariableDeclaration(varDecl)) {
    return varDecl.getName();
  }
  return '<anonymous>';
}

/**
 * Builds a CallGraphNode tree for a symbol's references, up to MAX_DEPTH.
 * Uses a visited set to prevent infinite loops on cyclic call graphs.
 */
function buildCallTree(
  project: Project,
  symbolNode: Node,
  depth: number,
  visited: Set<string>
): CallGraphNode[] {
  if (depth > MAX_DEPTH) return [];

  if (!Node.isReferenceFindable(symbolNode)) return [];
  const references = symbolNode.findReferencesAsNodes();
  const children: CallGraphNode[] = [];

  for (const ref of references) {
    const sf = ref.getSourceFile();
    const filePath = sf.getFilePath();
    const line = ref.getStartLineNumber();
    const funcName = getEnclosingFunctionName(ref);
    const key = `${filePath}:${funcName}:${line}`;

    // Skip self-reference (definition site) and cycles
    if (ref === symbolNode) continue;
    if (visited.has(key)) continue;
    visited.add(key);

    // Recursively find callers of this caller
    const callerNode = ref;
    const subTree = buildCallTree(project, callerNode, depth + 1, visited);

    children.push({
      file: filePath,
      functionName: funcName,
      line,
      calledBy: subTree,
    });
  }

  return children;
}

/**
 * Derives a BlastRadiusScore from the number of impacted files.
 */
function scoreFromCount(count: number): BlastRadiusScore {
  if (count === 0) return 'LOW';
  if (count <= 3) return 'MED';
  return 'CRITICAL';
}

/**
 * Collects all files that have at least one reference to any changed symbol.
 */
function collectImpactedFiles(trees: CallGraphNode[]): string[] {
  const files = new Set<string>();

  function walk(nodes: CallGraphNode[]): void {
    for (const n of nodes) {
      files.add(n.file);
      walk(n.calledBy);
    }
  }

  walk(trees);
  return Array.from(files);
}

/**
 * Builds a flat list of "file:functionName" breaking signatures
 * from all leaf nodes in the call graph (deepest callers = highest risk).
 */
function collectBreakingSignatures(trees: CallGraphNode[]): string[] {
  const sigs: string[] = [];

  function walk(nodes: CallGraphNode[]): void {
    for (const n of nodes) {
      if (n.calledBy.length === 0) {
        sigs.push(`${n.file}:${n.functionName}`);
      } else {
        walk(n.calledBy);
      }
    }
  }

  walk(trees);
  return [...new Set(sigs)];
}

/**
 * Core blast radius analysis.
 *
 * @param changedFiles  Absolute paths to files whose exports may have changed.
 * @param projectRoot   Root of the project to analyse.
 */
export function analyzeBlastRadius(
  changedFiles: string[],
  projectRoot: string
): BlastRadiusResult {
  const project = new Project({
    tsConfigFilePath: undefined,
    compilerOptions: {
      strict: false,
      allowJs: true,
      skipLibCheck: true,
    },
    skipAddingFilesFromTsConfig: true,
  });

  // Add all TypeScript and JavaScript files under the project root,
  // skipping node_modules so ts-morph doesn't crawl the entire dependency tree.
  const projectGlob = path.join(projectRoot).replace(/\\/g, '/');
  project.addSourceFilesAtPaths([
    `${projectGlob}/**/*.ts`,
    `${projectGlob}/**/*.tsx`,
    `${projectGlob}/**/*.js`,
    `${projectGlob}/**/*.jsx`,
    `!${projectGlob}/**/node_modules/**`,
  ]);

  // Cap at 50 files for blast-radius analysis to avoid OOM on large repos.
  // Prioritise files that look like they contain exports (heuristic: not test/spec files).
  const MAX_BLAST_FILES = 50;
  const cappedFiles = changedFiles.length > MAX_BLAST_FILES
    ? changedFiles
        .filter(f => !/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f))
        .slice(0, MAX_BLAST_FILES)
    : changedFiles;

  if (changedFiles.length > MAX_BLAST_FILES) {
    console.warn(
      `[BlastRadius] Repo has ${changedFiles.length} files — capping analysis at ${MAX_BLAST_FILES} ` +
      `to prevent OOM. Results cover the most significant source files.`
    );
  }

  const allTrees: CallGraphNode[] = [];
  const visited = new Set<string>();

  for (const changedFile of cappedFiles) {
    let sf: SourceFile | undefined;

    try {
      sf = project.getSourceFileOrThrow(changedFile);
    } catch {
      // Try resolving relative to projectRoot
      const resolved = path.isAbsolute(changedFile)
        ? changedFile
        : path.resolve(projectRoot, changedFile);
      sf = project.getSourceFile(resolved);
    }

    if (!sf) continue;

    // Collect all exported symbol declaration nodes
    const exportedDecls = sf.getExportedDeclarations();

    for (const [, decls] of exportedDecls) {
      for (const decl of decls) {
        if (!Node.isReferenceFindable(decl)) continue;

        const subTree = buildCallTree(project, decl, 1, visited);
        allTrees.push(...subTree);
      }
    }
  }

  const impactedFiles = collectImpactedFiles(allTrees).filter(
    (f) => !changedFiles.includes(f)
  );

  return {
    changedFiles,
    impactedFiles,
    callGraphTree: allTrees,
    blastRadiusScore: scoreFromCount(impactedFiles.length),
    breakingSignatures: collectBreakingSignatures(allTrees),
  };
}
