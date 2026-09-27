/**
 * Returns the directory for mock-target.
 * On Vercel / serverless runtimes, returns a writable path in os.tmpdir().
 */
export declare function getMockTargetRoot(): string;
/**
 * Writes all seed files to mock-target/, resetting any mutations the
 * remediation pipeline may have made on a previous run.
 */
export declare function seedMockTarget(targetDir?: string): string;
//# sourceMappingURL=seed.d.ts.map