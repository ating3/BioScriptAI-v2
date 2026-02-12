# BioScriptAI v2.0 — Privacy & Security Specification (Screen Context)

Instruction set for handling privacy when capturing and processing screen context. Covers: default local processing, cloud opt-in, anonymized metadata, consent warnings, and caching. Implementers must follow these instructions.

---

## 1. Scope

This specification applies to:

- **Screen context capture:** Visible viewport content (PDF/HTML) when the sidebar is open.
- **Context buffer:** Scroll-aware text buffer used for QA and summarization.
- **LLM usage:** Local inference server and any optional cloud-backed inference.
- **Metadata:** Source URL, page/section identifiers, timestamps, and any data sent with context.

---

## 2. Instruction Set

### 2.1 Default: Local Context Processing

| ID | Instruction | Requirement |
|----|-------------|-------------|
| L1 | **Default to local-only.** All screen capture, text extraction, buffer management, and LLM inference MUST run on the user’s machine (browser + local inference server) unless the user has explicitly opted in to cloud acceleration. | MUST |
| L2 | **No silent cloud.** Do not send captured screen content, context buffer, or full-text excerpts to any remote server without explicit user consent. | MUST |
| L3 | **Local buffer only.** The scroll-aware context buffer MUST be held only in memory (or in extension-local storage under user-controlled settings). Do not sync the buffer to a remote service by default. | MUST |
| L4 | **Local LLM as default target.** When the user asks a question or requests summarization, the default and recommended endpoint MUST be the local LLM (e.g. `http://localhost:...`). Cloud endpoints MUST NOT be used unless the user has opted in. | MUST |

**Implementation note:** Store a setting e.g. `contextProcessingMode: "local" | "cloud"`. Default is `"local"`. Only switch to `"cloud"` after the user completes the cloud opt-in flow and acknowledges the consent warning.

---

### 2.2 User Opt-In for Cloud Acceleration

| ID | Instruction | Requirement |
|----|-------------|-------------|
| C1 | **Explicit opt-in only.** Cloud acceleration (sending context to a remote LLM or processing service) MUST be disabled by default and MUST require an explicit user action (e.g. toggle in Settings, or “Use cloud for faster answers” with Accept). | MUST |
| C2 | **Informed consent before first use.** Before any screen-derived context is sent to the cloud for the first time, the user MUST be shown a clear consent dialog that states: (a) what data will be sent (e.g. visible text excerpt), (b) where it will be sent (e.g. provider name/region), and (c) that they can turn cloud off at any time. | MUST |
| C3 | **Easy revocation.** The UI MUST provide a simple way to disable cloud acceleration (single toggle or link in options). When disabled, behavior MUST immediately revert to local-only (L1–L4). | MUST |
| C4 | **No cross-session persistence of cloud consent for sensitive data.** If the only stored consent is a simple “cloud on/off” flag, ensure the user can revoke it and that no cached cloud-processed content is treated as consent for new data. Optionally re-prompt after N days or after major version update. | SHOULD |

**Implementation note:** Use a dedicated settings screen or modal for “Privacy & data”; include “Process screen context in the cloud (faster, requires sending text to [Provider])” with checkbox + “Learn more” and “Accept” / “Cancel”. Store `cloudAccelerationEnabled: boolean` and `cloudConsentVersion` / `cloudConsentDate` for auditing.

---

### 2.3 Anonymized Metadata Handling

| ID | Instruction | Requirement |
|----|-------------|-------------|
| M1 | **Minimize metadata.** Collect only metadata necessary for functionality: e.g. source type (PDF vs HTML), document/section identifier for caching, scroll position, and timestamp. Do not collect or send: page URL, tab title, or user identifiers unless strictly required and disclosed. | MUST |
| M2 | **Anonymize before cloud.** If cloud is used, metadata sent with context MUST be anonymized: no full URLs, no tab titles, no session or user IDs. Use opaque identifiers (e.g. hash of URL or “document-1”) only if needed for caching or debugging, and ensure they cannot be linked back to the user or specific site. | MUST |
| M3 | **No PII in context.** Do not inject into the context string: user name, email, or other PII from the page or from the extension. If PII is detected (e.g. in pasted text), strip or warn before sending to any LLM (local or cloud). | MUST |
| M4 | **Metadata retention (local).** If metadata is stored locally (e.g. for cache keys), retain only as long as needed for caching (see Section 2.5). Do not build long-term profiles of visited pages. | SHOULD |

**Implementation note:** Define a small “context request” payload for cloud: e.g. `{ textExcerpt, sourceType: "pdf"|"html", sectionId?: string }`. Omit `url`, `tabTitle`, `userId`. Use a short-lived or hashed `documentId` only if required for cache keying.

---

### 2.4 Consent Warnings for Screen Inference

| ID | Instruction | Requirement |
|----|-------------|-------------|
| W1 | **First-use warning.** When screen inference is about to run for the first time (e.g. first time the user opens the sidebar on a supported page, or first time capture is triggered), show a short, clear notice that the extension will read the visible part of the page to provide context-aware answers. Offer “Allow” / “Don’t show again” and “Not now” (or “Disable”). | MUST |
| W2 | **Explanation of scope.** The notice MUST state that only the visible portion of the current page is used, that processing is local by default, and that no data is sent to the cloud unless the user opts in. | MUST |
| W3 | **Persistent preference.** Store the user’s choice (allow / disable screen inference) and do not show the first-use warning again for that choice. If the user chose “Not now,” prompt again on next sidebar open (or after N opens) until a final choice is made. | SHOULD |
| W4 | **Cloud warning.** When the user enables cloud acceleration, show a second warning that screen-derived text will be sent to a remote service, with a short summary of the provider and a link to the provider’s privacy policy. Require explicit Accept. | MUST |

**Implementation note:** Use a small banner or modal in the sidebar (see Section 3 for sample copy). Store `screenInferenceConsent: "allowed" | "disabled" | "pending"` and `cloudConsentShownAt` (timestamp).

---

### 2.5 Caching Standard Sections for Speed

| ID | Instruction | Requirement |
|----|-------------|-------------|
| S1 | **Cache only what’s needed.** Cache content or identifiers only to improve performance (e.g. avoid re-extracting the same section, or re-embedding the same paragraph). Do not use the cache for analytics or profiling. | MUST |
| S2 | **Local cache only by default.** Cached text or derived data (e.g. embeddings) MUST be stored only on the user’s device (e.g. in-memory, or in extension local storage) unless the user has opted in to cloud and the cache is explicitly for cloud acceleration. | MUST |
| S3 | **Short retention.** Limit retention of cached content: e.g. clear or expire cache when the tab is closed, when the user navigates away, or after a maximum TTL (e.g. 24 hours). Do not retain indefinitely. | MUST |
| S4 | **Cache keys without PII.** Cache keys MUST NOT include full URLs, user identifiers, or other PII. Use hashes or opaque IDs (e.g. hash of normalized URL + section index) so that cache cannot be used to reconstruct browsing history. | MUST |
| S5 | **Clear cache on revoke.** When the user disables screen inference or disables cloud acceleration, clear any cached screen-derived content and metadata associated with that mode. | SHOULD |

**Implementation note:** Implement a small cache: key = `hash(sourceType + sectionId + firstFewWords)` or similar; value = extracted text or embedding; max entries (e.g. 50); evict on tab close or TTL (e.g. 24h).

---

## 3. Sample UI Warnings

Use the following copy (or equivalent) in the extension UI. Adjust provider name and links as needed.

---

### 3.1 First-use: Screen inference

**Heading:**  
**Screen context for better answers**

**Body:**  
BioScriptAI can use the **visible part of this page** to answer your questions and summarize content. This is done **on your device by default**; nothing is sent to the cloud unless you turn on “Cloud acceleration” in settings.

- Only the text you can see is used.  
- You can turn this off anytime in Settings.

**Actions:**  
- **[Allow]** — enable screen context  
- **[Not now]** — skip for now (we’ll ask again later)  
- **[Don’t use screen context]** — disable and don’t ask again  

---

### 3.2 Cloud acceleration opt-in

**Heading:**  
**Use cloud for faster answers?**

**Body:**  
If you turn on cloud acceleration, **excerpts of the visible page text** will be sent to a processing service (e.g. [Provider name]) to generate answers. This can be faster than using a local model.

- What we send: a short text excerpt from what’s on screen (no URLs or personal data).  
- You can turn this off anytime in Settings → Privacy.  
- [Link to provider’s privacy policy]

**Actions:**  
- **[Accept and turn on]**  
- **[Cancel]**  

---

### 3.3 Reminder when enabling cloud (short)

**Banner or inline (e.g. under the cloud toggle):**  
“Turning this on will send visible page text to [Provider] for processing. [Privacy policy link]. You can disable it anytime in Settings.”

---

### 3.4 Settings labels (suggested)

- **Screen context:** “Use visible page content to answer questions (local by default).”  
- **Cloud acceleration:** “Send text excerpts to the cloud for faster answers (optional). Requires consent.”  
- **Clear cache:** “Clear cached page content (stored only on this device).”

---

## 4. Compliance Checklist

| # | Check |
|---|--------|
| 1 | Default context processing is local only (L1–L4). |
| 2 | Cloud is opt-in only; no screen context sent to cloud before consent (C1–C2). |
| 3 | Consent and cloud warnings use the sample copy (or equivalent) and are shown at the right time (W1–W4). |
| 4 | Metadata sent with context is anonymized; no URLs/PII (M1–M3). |
| 5 | Cache is local by default, short-lived, and keyed without PII (S1–S5). |
| 6 | User can revoke screen inference and cloud at any time (C3, W1). |

---

## 5. Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | — | Initial security specification and sample UI warnings. |

---

**File:** `docs/PRIVACY_SECURITY_SPEC.md` — Implement screen-context capture and cloud features in line with this spec; use the sample warnings in the extension UI.
