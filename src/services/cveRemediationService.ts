import * as fs from 'fs';
import * as path from 'path';
import { Project, SyntaxKind, Node } from 'ts-morph';
import { createTwoFilesPatch } from 'diff';
import { CVEAdvisoryTrigger, CVERemediationPlan } from '../types/index';

interface CallSiteEdit {
  filePath: string;
  originalText: string;
}

/**
 * Core CVE remediation logic.
 *
 * For every TypeScript source file under projectRoot:
 *  1. Find all CallExpression nodes whose callee identifier matches a deprecated method.
 *  2. Rewrite the callee identifier only (arguments left untouched).
 *  3. Capture before/after text for unified diff generation.
 *  4. Save all changes to disk.
 */
export async function remediateCVE(
  trigger: CVEAdvisoryTrigger
): Promise<CVERemediationPlan> {
  const { projectRoot, deprecatedMethods, cveId, packageName } = trigger;

  const project = new Project({
    compilerOptions: {
      strict: false,
      allowJs: true,
      skipLibCheck: true,
    },
    skipAddingFilesFromTsConfig: true,
  });

  project.addSourceFilesAtPaths(path.join(projectRoot, '**/*.ts'));

  // Snapshot original file texts before any mutation
  const originalTexts = new Map<string, string>();
  for (const sf of project.getSourceFiles()) {
    originalTexts.set(sf.getFilePath(), sf.getFullText());
  }

  let totalCallSites = 0;
  const affectedFilePaths = new Set<string>();
  const patches: string[] = [];

  for (const sf of project.getSourceFiles()) {
    const filePath = sf.getFilePath();
    let fileEdited = false;

    // Gather all CallExpression nodes in this file
    const callExpressions = sf.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExpressions) {
      const callee = callExpr.getExpression();

      // Case 1: simple identifier  — encryptMD5(...)
      if (Node.isIdentifier(callee)) {
        const name = callee.getText();
        if (name in deprecatedMethods) {
          const safeName = deprecatedMethods[name];
          callee.replaceWithText(safeName);
          totalCallSites++;
          fileEdited = true;
        }
      }

      // Case 2: property access  — utils.encryptMD5(...)
      if (Node.isPropertyAccessExpression(callee)) {
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

    const patch = createTwoFilesPatch(
      `a/${relPath}`,
      `b/${relPath}`,
      originalText,
      updatedText,
      'original',
      'patched'
    );
    patches.push(patch);
  }

  // Read current package version from mock-target/package.json
  let currentVersion = 'unknown';
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
        dependencies?: Record<string, string>;
        version?: string;
      };
      currentVersion =
        pkg.dependencies?.[packageName] ?? pkg.version ?? 'unknown';
    } catch {
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
