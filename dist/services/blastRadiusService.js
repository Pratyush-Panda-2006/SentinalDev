"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeBlastRadius = analyzeBlastRadius;
const path = __importStar(require("path"));
const ts_morph_1 = require("ts-morph");
// Maximum recursion depth when building the caller tree
const MAX_DEPTH = 3;
/**
 * Resolves the name of the nearest enclosing function/method/arrow for a node.
 */
function getEnclosingFunctionName(node) {
    const fn = node.getFirstAncestorByKind(ts_morph_1.SyntaxKind.FunctionDeclaration) ??
        node.getFirstAncestorByKind(ts_morph_1.SyntaxKind.MethodDeclaration) ??
        node.getFirstAncestorByKind(ts_morph_1.SyntaxKind.ArrowFunction) ??
        node.getFirstAncestorByKind(ts_morph_1.SyntaxKind.FunctionExpression);
    if (!fn)
        return '<module>';
    if (ts_morph_1.Node.isFunctionDeclaration(fn) || ts_morph_1.Node.isMethodDeclaration(fn)) {
        return fn.getName() ?? '<anonymous>';
    }
    // ArrowFunction / FunctionExpression — try to get from variable declaration
    const varDecl = fn.getFirstAncestorByKind(ts_morph_1.SyntaxKind.VariableDeclaration);
    if (varDecl && ts_morph_1.Node.isVariableDeclaration(varDecl)) {
        return varDecl.getName();
    }
    return '<anonymous>';
}
/**
 * Builds a CallGraphNode tree for a symbol's references, up to MAX_DEPTH.
 * Uses a visited set to prevent infinite loops on cyclic call graphs.
 */
function buildCallTree(project, symbolNode, depth, visited) {
    if (depth > MAX_DEPTH)
        return [];
    if (!ts_morph_1.Node.isReferenceFindable(symbolNode))
        return [];
    const references = symbolNode.findReferencesAsNodes();
    const children = [];
    for (const ref of references) {
        const sf = ref.getSourceFile();
        const filePath = sf.getFilePath();
        const line = ref.getStartLineNumber();
        const funcName = getEnclosingFunctionName(ref);
        const key = `${filePath}:${funcName}:${line}`;
        // Skip self-reference (definition site) and cycles
        if (ref === symbolNode)
            continue;
        if (visited.has(key))
            continue;
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
function scoreFromCount(count) {
    if (count === 0)
        return 'LOW';
    if (count <= 3)
        return 'MED';
    return 'CRITICAL';
}
/**
 * Collects all files that have at least one reference to any changed symbol.
 */
function collectImpactedFiles(trees) {
    const files = new Set();
    function walk(nodes) {
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
function collectBreakingSignatures(trees) {
    const sigs = [];
    function walk(nodes) {
        for (const n of nodes) {
            if (n.calledBy.length === 0) {
                sigs.push(`${n.file}:${n.functionName}`);
            }
            else {
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
function analyzeBlastRadius(changedFiles, projectRoot) {
    const project = new ts_morph_1.Project({
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
        console.warn(`[BlastRadius] Repo has ${changedFiles.length} files — capping analysis at ${MAX_BLAST_FILES} ` +
            `to prevent OOM. Results cover the most significant source files.`);
    }
    const allTrees = [];
    const visited = new Set();
    for (const changedFile of cappedFiles) {
        let sf;
        try {
            sf = project.getSourceFileOrThrow(changedFile);
        }
        catch {
            // Try resolving relative to projectRoot
            const resolved = path.isAbsolute(changedFile)
                ? changedFile
                : path.resolve(projectRoot, changedFile);
            sf = project.getSourceFile(resolved);
        }
        if (!sf)
            continue;
        // Collect all exported symbol declaration nodes
        const exportedDecls = sf.getExportedDeclarations();
        for (const [, decls] of exportedDecls) {
            for (const decl of decls) {
                if (!ts_morph_1.Node.isReferenceFindable(decl))
                    continue;
                const subTree = buildCallTree(project, decl, 1, visited);
                allTrees.push(...subTree);
            }
        }
    }
    const impactedFiles = collectImpactedFiles(allTrees).filter((f) => !changedFiles.includes(f));
    return {
        changedFiles,
        impactedFiles,
        callGraphTree: allTrees,
        blastRadiusScore: scoreFromCount(impactedFiles.length),
        breakingSignatures: collectBreakingSignatures(allTrees),
    };
}
//# sourceMappingURL=blastRadiusService.js.map