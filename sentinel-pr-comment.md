## 🛡️ SentinelDev Pipeline Report

> **CVE Advisory** — `CVE-2024-DEMO01` · Package: `crypto-utils` `<2.0.0`
> Completed: `2026-09-27T09:21:02.504Z`

### 🟡 Risk Assessment: **MED**

| Metric | Value |
|---|---|
| Blast Radius Score | 🟡 **MED** |
| Call Sites Patched | `2` |
| Files Impacted | `1` |
| Breaking Signatures | `4` |
| Endpoints Synced | `1` |

---

### 🔧 CVE Remediation — `CVE-2024-DEMO01`

**Package:** `crypto-utils` · **1.2.0** → **2.0.0**

**Method replacements:**

- ~~`encryptMD5()`~~ → `encryptSHA256()`

**2** call site(s) refactored across **2** file(s):

- `reportService.ts`
- `userService.ts`

<details>
<summary>📄 View unified diff</summary>

```diff
===================================================================
--- a/src\reportService.ts	original
+++ b/src\reportService.ts	patched
@@ -10,9 +10,9 @@
  * Generates a cryptographic signature for a report payload.
  * Currently uses encryptMD5 — flagged by CVE-2024-DEMO01.
  */
 export function signReport(payload: string): string {
-  return encryptMD5(payload);
+  return encryptSHA256(payload);
 }
 
 /**
  * Builds and signs a report object.

===================================================================
--- a/src\userService.ts	original
+++ b/src\userService.ts	patched
@@ -10,9 +10,9 @@
  * Returns a stable hash for a given userId.
  * Currently uses encryptMD5 — flagged by CVE-2024-DEMO01.
  */
 export function hashUserId(userId: string): string {
-  return encryptMD5(userId);
+  return encryptSHA256(userId);
 }
 
 /**
  * Fetches a mock list of users with hashed IDs.
```

</details>

---

### 🟡 Blast Radius Analysis

**Score:** 🟡 `MED`

**Impacted files:**

- `api.ts`

<details>
<summary>⚠️ Breaking signatures (4)</summary>

| File | Function |
|---|---|
| `reportService.ts` | `signReport` |
| `reportService.ts` | `buildReport` |
| `userService.ts` | `hashUserId` |
| `userService.ts` | `getUsers` |

</details>

<details>
<summary>🌐 Call graph tree</summary>

- `reportService.ts` → `buildReport` *(line 24)*
    - `reportService.ts` → `signReport` *(line 13)*
- `api.ts` → `<module>` *(line 2)*
    - `api.ts` → `<anonymous>` *(line 48)*
      - `reportService.ts` → `buildReport` *(line 20)*
- `userService.ts` → `getUsers` *(line 29)*
    - `userService.ts` → `hashUserId` *(line 13)*
- `api.ts` → `<module>` *(line 1)*
    - `api.ts` → `<anonymous>` *(line 41)*
      - `userService.ts` → `getUsers` *(line 20)*

</details>

---

### 📋 OpenAPI Spec Sync

| Method | Path | Change |
|---|---|---|
| `POST` | `/report` | ✅ added |

<details>
<summary>📄 View schema diff</summary>

```diff
===================================================================
--- a/openapi.yaml	original
+++ b/openapi.yaml	patched
@@ -1,25 +1,23 @@
-openapi: "3.0.3"
+openapi: 3.0.3
 info:
   title: SentinelDev Mock API
-  version: "1.0.0"
+  version: 1.0.0
   description: >
-    Mock API for the SentinelDev demo testbed.
-    NOTE: POST /report is intentionally absent — DocuSync will detect and add it.
-
+    Mock API for the SentinelDev demo testbed. NOTE: POST /report is intentionally absent — DocuSync will detect and add
+    it.
 servers:
   - url: http://localhost:3000
     description: Local development server
-
 paths:
   /users:
     get:
       summary: List all users
       operationId: getUsers
       tags:
         - Users
       responses:
-        "200":
+        '200':
           description: A list of users with hashed IDs
           content:
             application/json:
               schema:
@@ -37,5 +35,14 @@
                           type: string
                           example: Alice
                         hashedId:
                           type: string
-                          example: "5f4dcc3b5aa765d61d8327de..."
+                          example: 5f4dcc3b5aa765d61d8327de...
+  /report:
+    post:
+      summary: POST /report
+      operationId: postreport
+      tags:
+        - report
+      responses:
+        '200':
+          description: Success
```

</details>

---

*Made with [IBM Bob](https://www.ibm.com/products/watsonx-code-assistant) · SentinelDev Autonomous Lifecycle Engine*