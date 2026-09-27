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
exports.remediateCVE = remediateCVE;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ts_morph_1 = require("ts-morph");
const diff_1 = require("diff");
/**
 * Core CVE remediation logic.
 *
 * For every TypeScript source file under projectRoot:
 *  1. Find all CallExpression nodes whose callee identifier matches a deprecated method.
 *  2. Rewrite the callee identifier only (arguments left untouched).
 *  3. Capture before/after text for unified diff generation.
 *  4. Save all changes to disk.
 */
async function remediateCVE(trigger) {
    const { projectRoot, deprecatedMethods, cveId, packageName } = trigger;
    const project = new ts_morph_1.Project({
        compilerOptions: {
            strict: false,
            allowJs: true,
            skipLibCheck: true,
        },
        skipAddingFilesFromTsConfig: true,
    });
    const projectGlob = path.join(projectRoot).replace(/\\/g, '/');
    project.addSourceFilesAtPaths([
        `${projectGlob}/**/*.ts`,
        `${projectGlob}/**/*.tsx`,
        `${projectGlob}/**/*.js`,
        `${projectGlob}/**/*.jsx`,
        `!${projectGlob}/**/node_modules/**`,
    ]);
    // Snapshot original file texts before any mutation
    const originalTexts = new Map();
    for (const sf of project.getSourceFiles()) {
        originalTexts.set(sf.getFilePath(), sf.getFullText());
    }
    let totalCallSites = 0;
    const affectedFilePaths = new Set();
    const patches = [];
    for (const sf of project.getSourceFiles()) {
        const filePath = sf.getFilePath();
        let fileEdited = false;
        // Gather all CallExpression nodes in this file
        const callExpressions = sf.getDescendantsOfKind(ts_morph_1.SyntaxKind.CallExpression);
        for (const callExpr of callExpressions) {
            const callee = callExpr.getExpression();
            // Case 1: simple identifier  — encryptMD5(...)
            if (ts_morph_1.Node.isIdentifier(callee)) {
                const name = callee.getText();
                if (name in deprecatedMethods) {
                    const safeName = deprecatedMethods[name];
                    callee.replaceWithText(safeName);
                    totalCallSites++;
                    fileEdited = true;
                }
            }
            // Case 2: property access  — utils.encryptMD5(...)
            if (ts_morph_1.Node.isPropertyAccessExpression(callee)) {
                const propName = callee.getName();
                if (propName in deprecatedMethods) {
                    const safeName = deprecatedMethods[propName];
                    callee.getNameNode().replaceWithText(safeName);
                    totalCallSites++;
                    fileEdited = true;
                }
            }
        }
        if (fileEdited) {
            affectedFilePaths.add(filePath);
        }
    }
    // Save all in-memory mutations to disk
    await project.save();
    // Build unified diffs from the saved files
    for (const filePath of affectedFilePaths) {
        const originalText = originalTexts.get(filePath) ?? '';
        const updatedText = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(projectRoot, filePath);
        const patch = (0, diff_1.createTwoFilesPatch)(`a/${relPath}`, `b/${relPath}`, originalText, updatedText, 'original', 'patched');
        patches.push(patch);
    }
    // Read current package version from mock-target/package.json
    let currentVersion = 'unknown';
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            currentVersion =
                pkg.dependencies?.[packageName] ?? pkg.version ?? 'unknown';
        }
        catch {
            // ignore parse errors
        }
    }
    return {
        cveId,
        packageName,
        currentVersion,
        targetVersion: '2.0.0',
        deprecatedMethods,
        callSitesRefactored: totalCallSites,
        affectedFiles: Array.from(affectedFilePaths),
        patch: patches.join('\n'),
    };
}
//# sourceMappingURL=cveRemediationService.js.map