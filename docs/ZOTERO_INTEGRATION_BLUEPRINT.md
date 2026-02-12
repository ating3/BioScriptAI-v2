# BioScriptAI — Zotero API Integration Blueprint

Script blueprint and WindSurf prompt for integrating Zotero Web API v3 into the BioScriptAI Chrome extension. Covers: save current paper, add metadata, organize by project (collections), create/rename/delete projects, and export citations (APA, MLA, BibTeX).

**Base URL:** `https://api.zotero.org`  
**Auth:** API key with write access; header `Zotero-API-Key: <key>` or `Authorization: Bearer <key>`  
**Docs:** [Zotero Web API v3](https://www.zotero.org/support/dev/web_api/v3/start)

---

## 1. API Interaction Steps (Summary)

| Feature | Method | Endpoint / params | Notes |
|--------|--------|-------------------|--------|
| **Auth / user** | GET | `/keys/<key>` | Validate key; get user ID from response. |
| **Save current paper** | POST | `/users/<userID>/items` | Body: array of item JSON (from template or built from title/authors/DOI). |
| **Add/update metadata** | PATCH or PUT | `/users/<userID>/items/<itemKey>` | PATCH for partial update; need `If-Unmodified-Since-Version`. |
| **List collections (projects)** | GET | `/users/<userID>/collections` or `/collections/top` | Top-level = projects. |
| **Create project** | POST | `/users/<userID>/collections` | Body: `[{ "name": "Project Name", "parentCollection": false }]`. |
| **Rename project** | PUT | `/users/<userID>/collections/<collectionKey>` | Body: full collection `data` with new `name`. |
| **Delete project** | DELETE | `/users/<userID>/collections/<collectionKey>` | Header: `If-Unmodified-Since-Version: <version>`. |
| **Organize paper in project** | PATCH | `/users/<userID>/items/<itemKey>` | Body: `{ "collections": ["<collectionKey>"] }`. |
| **Export APA** | GET | `/users/<userID>/items?...&format=bib&style=apa` | Or by collection: `.../collections/<key>/items?format=bib&style=apa`. |
| **Export MLA** | GET | Same with `style=modern-language-association`. | MLA style name in Zotero repo. |
| **Export BibTeX** | GET | `.../items?format=bibtex&limit=...` | Or `.../collections/<key>/items?format=bibtex&limit=...`. |

---

## 2. Authentication and User ID

**Step 1 — Validate API key and get user ID:**

```
GET https://api.zotero.org/keys/<API_KEY>
Headers:
  Zotero-API-Key: <API_KEY>
  (or omit header and use key in URL for this call only)
```

**Example response (200 OK):**
```json
{
  "key": "P9NiFoyLeZu2bZNvvuQPDWsd",
  "userID": 475425,
  "username": "jdoe",
  "access": {
    "user": {
      "library": true,
      "files": true,
      "write": true
    }
  }
}
```

Store `userID` for all subsequent requests. Use `users/<userID>` in paths. For group libraries use `groups/<groupID>`.

---

## 3. Save Current Paper

**Step 2 — Get item template (optional, for correct fields):**

```
GET https://api.zotero.org/users/<userID>/items/new?itemType=journalArticle
Headers: Zotero-API-Key: <KEY>
```

**Example response:** JSON with `data` containing empty `journalArticle` template (title, creators, DOI, etc.).

**Step 3 — Create item (save paper):**

```
POST https://api.zotero.org/users/<userID>/items
Headers:
  Zotero-API-Key: <KEY>
  Content-Type: application/json
  If-Unmodified-Since-Version: <libraryVersion>   (or Zotero-Write-Token for create)
Body: [ { "itemType": "journalArticle", "title": "...", "creators": [...], "DOI": "...", "collections": ["<collectionKey>"] } ]
```

**Example request body:**
```json
[
  {
    "itemType": "journalArticle",
    "title": "CRISPR off-target effects in primary human cells",
    "creators": [
      { "creatorType": "author", "firstName": "Jane", "lastName": "Smith" },
      { "creatorType": "author", "firstName": "John", "lastName": "Doe" }
    ],
    "DOI": "10.1038/s41586-021-03234-5",
    "abstractNote": "Optional abstract.",
    "collections": ["BCDE3456"]
  }
]
```

**Example response (200 OK):**
```json
{
  "success": { "0": "X42A7DEE" },
  "unchanged": {},
  "failed": {}
}
```
Use returned item key `X42A7DEE` for updates and adding to collections.

---

## 4. Add / Update Metadata

**Step 4 — Update existing item (add or change metadata):**

First get current item:
```
GET https://api.zotero.org/users/<userID>/items/<itemKey>
```

Then partial update:
```
PATCH https://api.zotero.org/users/<userID>/items/<itemKey>
Headers:
  Zotero-API-Key: <KEY>
  Content-Type: application/json
  If-Unmodified-Since-Version: <itemVersion>
Body: { "title": "New title", "creators": [...], "DOI": "10.1234/..." }
```

**Example response:** `204 No Content`; new version in `Last-Modified-Version` header.

---

## 5. Organize by Project (Collections)

**Step 5 — List top-level collections (projects):**

```
GET https://api.zotero.org/users/<userID>/collections/top
Headers: Zotero-API-Key: <KEY>
```

**Example response (200 OK):**
```json
[
  {
    "key": "9KH9TNSJ",
    "version": 128,
    "library": { "type": "user", "id": 475425, "name": "" },
    "data": {
      "key": "9KH9TNSJ",
      "name": "CRISPR Project",
      "parentCollection": false,
      "relations": {}
    },
    "meta": { "numCollections": 0, "numItems": 12 }
  }
]
```

**Step 6 — Add item to collection (organize paper in project):**

```
PATCH https://api.zotero.org/users/<userID>/items/<itemKey>
Headers: If-Unmodified-Since-Version: <itemVersion>
Body: { "collections": ["9KH9TNSJ", "OTHER_KEY"] }
```
Item will be in exactly these collections (replace list to add/remove).

---

## 6. Create / Rename / Delete Projects

**Step 7 — Create project (collection):**

```
POST https://api.zotero.org/users/<userID>/collections
Headers:
  Zotero-API-Key: <KEY>
  Content-Type: application/json
  If-Unmodified-Since-Version: <libraryVersion>
Body: [ { "name": "New Project Name", "parentCollection": false } ]
```

**Example response (200 OK):**
```json
{
  "successful": { "0": "DM2F65CA" },
  "unchanged": {},
  "failed": {}
}
```
Use `DM2F65CA` as the new collection key.

**Step 8 — Rename project:**

```
GET https://api.zotero.org/users/<userID>/collections/<collectionKey>
 then
PUT https://api.zotero.org/users/<userID>/collections/<collectionKey>
Headers: If-Unmodified-Since-Version: <collectionVersion>
Body: { "key": "<collectionKey>", "version": <version>, "name": "New Name", "parentCollection": false }
```

**Step 9 — Delete project:**

```
DELETE https://api.zotero.org/users/<userID>/collections/<collectionKey>
Headers: If-Unmodified-Since-Version: <collectionVersion>
```

**Example response:** `204 No Content`.

---

## 7. Export Citations (APA, MLA, BibTeX)

**Step 10 — Export as formatted bibliography (APA or MLA):**

```
GET https://api.zotero.org/users/<userID>/items?format=bib&style=apa&limit=150
  or for a single collection:
GET https://api.zotero.org/users/<userID>/collections/<collectionKey>/items?format=bib&style=apa&limit=150
Headers: Zotero-API-Key: <KEY>
```

- **APA:** `style=apa`
- **MLA:** `style=modern-language-association` (Zotero style repository name)

**Example response (200 OK):** XHTML body with formatted references, e.g.:
```html
<div class="csl-bib-body">
  <div class="csl-entry">Smith, J., &amp; Doe, J. (2021). CRISPR off-target effects in primary human cells. <i>Nature</i>, 123(4), 567–589. https://doi.org/10.1038/...</div>
</div>
```

**Step 11 — Export as BibTeX:**

```
GET https://api.zotero.org/users/<userID>/items?format=bibtex&limit=150
  or
GET https://api.zotero.org/users/<userID>/collections/<collectionKey>/items?format=bibtex&limit=150
Headers: Zotero-API-Key: <KEY>
```

**Example response (200 OK):** Plain text, e.g.:
```bibtex
@article{smith2021crispr,
  title = {CRISPR off-target effects in primary human cells},
  author = {Smith, Jane and Doe, John},
  journal = {Nature},
  year = {2021},
  volume = {123},
  number = {4},
  pages = {567--589},
  doi = {10.1038/s41586-021-03234-5}
}
```

---

## 8. Script Blueprint (Pseudocode)

```text
# === Configuration ===
BASE_URL = "https://api.zotero.org"
apiKey = from extension storage (user enters in options)
userID = from storage or fetch via GET /keys/<key>

# === 1. Save current paper ===
function saveCurrentPaper(metadata, collectionKeys = []):
    metadata = { title, authors[], DOI?, abstract?, url? }
    body = buildJournalArticleItem(metadata, collectionKeys)
    POST BASE_URL/users/{userID}/items
    Headers: Zotero-API-Key, Content-Type: application/json, If-Unmodified-Since-Version
    return response.success["0"]  # item key

# === 2. Add/update metadata ===
function updatePaperMetadata(itemKey, metadata):
    version = GET BASE_URL/users/{userID}/items/{itemKey} -> data.version
    PATCH BASE_URL/users/{userID}/items/{itemKey}
    Headers: If-Unmodified-Since-Version: version
    Body: metadata (partial: title, creators, DOI, etc.)

# === 3. Organize by project ===
function addPaperToProject(itemKey, collectionKey):
    version = GET item -> version
    PATCH .../items/{itemKey}
    Body: { collections: [collectionKey, ...existing] }  # merge with current collections

function removePaperFromProject(itemKey, collectionKey):
    current = GET item -> data.collections
    PATCH .../items/{itemKey}
    Body: { collections: current.filter(k => k !== collectionKey) }

# === 4. Projects (collections) CRUD ===
function listProjects():
    GET BASE_URL/users/{userID}/collections/top
    return array of { key, name, version, numItems }

function createProject(name):
    libraryVersion = GET .../items?limit=1 -> Last-Modified-Version
    POST .../collections
    Body: [{ name, parentCollection: false }]
    return response.successful["0"]

function renameProject(collectionKey, newName):
    col = GET .../collections/{collectionKey}
    PUT .../collections/{collectionKey}
    Body: { key, version: col.version, name: newName, parentCollection: false }

function deleteProject(collectionKey):
    col = GET .../collections/{collectionKey}
    DELETE .../collections/{collectionKey}
    Headers: If-Unmodified-Since-Version: col.version

# === 5. Export citations ===
function exportCitations(format, collectionKey = null):
    # format in { "apa", "mla", "bibtex" }
    path = collectionKey
        ? .../collections/{collectionKey}/items
        : .../users/{userID}/items
    if format == "bibtex":
        GET path?format=bibtex&limit=150
        return response as text
    else:
        style = (format == "apa") ? "apa" : "modern-language-association"
        GET path?format=bib&style={style}&limit=150
        return response as text (XHTML)
```

---

## 9. Error Handling and Versions

- **412 Precondition Failed:** Item or collection was modified elsewhere. Re-GET the resource and retry with new `version` / `If-Unmodified-Since-Version`.
- **409 Conflict:** Library locked (sync in progress). Retry after delay.
- **403 Forbidden:** Invalid or read-only API key. Prompt user to create a key with write access.
- **429 / Backoff:** Respect `Retry-After` or `Backoff` header; exponential backoff if missing.
- Always store `Last-Modified-Version` from responses for the next write (or use `Zotero-Write-Token` for one-off creates).

---

## 10. WindSurf Prompt (Copy-Paste)

Use the following prompt in WindSurf to implement the Zotero integration in the BioScriptAI Chrome extension.

```markdown
Implement Zotero Web API v3 integration for the BioScriptAI Chrome extension.

**Context:** The extension has a sidebar with a "Workspace" (saved papers and projects). We want to sync with the user's Zotero library: save the current paper, add metadata, organize papers by project (Zotero collections), manage projects (create/rename/delete), and export citations.

**Requirements:**

1. **Authentication**
   - User enters API key in extension options (chrome.storage). Key must have write access.
   - On first use, validate key with GET https://api.zotero.org/keys/<key> and store userID for all requests.
   - Use header: Zotero-API-Key: <key>. Base URL: https://api.zotero.org.

2. **Save current paper**
   - From the sidebar or context bar: "Save to Zotero" with current paper metadata (title, authors, DOI from the paper context loader or user input).
   - POST /users/<userID>/items with a journalArticle (or book/journalArticle by type) item. Support optional collection keys to add to project(s) immediately.
   - Use If-Unmodified-Since-Version from last GET of /users/<userID>/items?limit=1 or Zotero-Write-Token for create.
   - Return the new item key and show success in the UI.

3. **Add/update metadata**
   - Allow editing title, authors, DOI for an existing item (identified by item key or by matching DOI/title in local cache).
   - GET the item, then PATCH /users/<userID>/items/<itemKey> with partial JSON. Handle 412 by re-fetching and retrying.

4. **Organize papers by project**
   - "Projects" = Zotero top-level collections. List via GET /users/<userID>/collections/top.
   - "Add to project" = PATCH item with collections array including the chosen collection key.
   - Show which project(s) each saved paper belongs to (from item.data.collections).

5. **Create / rename / delete projects**
   - Create: POST /users/<userID>/collections with [{ name, parentCollection: false }]. Need library version from GET items or collections.
   - Rename: GET collection, PUT with same key/version and new name.
   - Delete: DELETE /users/<userID>/collections/<key> with If-Unmodified-Since-Version.
   - Update sidebar Workspace "Projects" list after each change and optionally refetch collection list from Zotero.

6. **Export citations**
   - Offer export in APA, MLA, and BibTeX.
   - APA/MLA: GET .../items?format=bib&style=apa or style=modern-language-association (and optionally .../collections/<key>/items for current project). Limit 150. Return is XHTML for bib.
   - BibTeX: GET .../items?format=bibtex&limit=150 (or by collection). Return plain text.
   - Provide "Copy to clipboard" and/or "Download .bib / .html" in the sidebar for the current project or entire library.

**Implementation notes:**
   - Use a single Zotero service module (e.g. zoteroApi.js or zotero.ts) with functions for: validateKey, getUserId, saveItem, updateItem, listCollections, createCollection, updateCollection, deleteCollection, addItemToCollection, exportBib, exportBibtex.
   - Store apiKey and userID in chrome.storage.local; cache collection list with a short TTL or invalidate on create/rename/delete.
   - All requests are from the extension (service worker or sidebar); use fetch() with CORS (Zotero API allows browser origins). Handle 403, 409, 412, 429 and show user-friendly messages in the UI.
   - Follow the script blueprint and example requests/responses in docs/ZOTERO_INTEGRATION_BLUEPRINT.md.
```

---

## 11. Example Responses (Quick Reference)

| Action | Response |
|--------|----------|
| Validate key | `200` + `{ userID, access }` |
| Save paper (POST items) | `200` + `{ success: { "0": "<itemKey>" } }` |
| Update item (PATCH) | `204 No Content` |
| List collections | `200` + array of `{ key, data: { name }, meta: { numItems } }` |
| Create collection | `200` + `{ successful: { "0": "<collectionKey>" } }` |
| Delete collection | `204 No Content` |
| Export bib (APA/MLA) | `200` + XHTML body |
| Export BibTeX | `200` + text/plain BibTeX |

---

**File:** `docs/ZOTERO_INTEGRATION_BLUEPRINT.md` — Use with the Zotero API integration component in ARCHITECTURE.md and the sidebar Workspace (projects + saved papers).
