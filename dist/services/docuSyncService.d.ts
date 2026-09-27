import { SpecSyncResult } from '../types/index';
/**
 * Core DocuSync logic.
 *
 * @param changedFiles  Absolute paths to route source files to scan.
 * @param projectRoot   Root of the project (contains openapi.yaml).
 */
export declare function syncDocs(changedFiles: string[], projectRoot: string): Promise<SpecSyncResult>;
//# sourceMappingURL=docuSyncService.d.ts.map