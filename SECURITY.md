# Security policy

This project is an early-preview static scanner. The v0.1 CLI reads source files but does not execute them. Do not assume it provides a complete security audit.

If you discover a security issue in Ghostproof itself, please use GitHub's private vulnerability reporting, if enabled, or contact the maintainer privately before sharing exploit details. Avoid public issues containing credentials, undisclosed vulnerabilities, or confidential code.

Security-sensitive design decisions include avoiding arbitrary execution of scanned repositories, respecting file boundaries, and separating unverified static candidates from reproduced vulnerabilities.
