# Changelog

## 0.6.0 — release candidate (2026-11-24)

- Correct explicit scan-only CLI option handling (#8) and help/README contracts (#9).
- Validate programmatic scan limits and boundary inputs (#10).
- Add 19 synthetic E0 quality tests (#11).
- Reject malformed UTF-8 evidence JSON (#12).
- Establish a synthetic scanner performance baseline (#13).
- Add macOS/Windows installation and CLI smoke checks (#14).
- Compare pinned before/after contract scenarios (#15): 12/40 to 40/40; selected syntax expectations unchanged at 8/8.
- Keep scan/study schema 0.5, bundled BW001 evidence 0.3 and verification result 0.4. Preserve the historical BW001 tool metadata used in exact replay.

This is an engineering preview, not a new detector accuracy or external-project proof claim. The package remains private and unpublished on npm. Release-candidate CI is required before declaring the release ready.

## 0.5.0

Pinned public E0 study and agent-host file smoke checks. Existing bundled evidence compatibility retained.
