# Platform compatibility

The regular CI suite runs on Ubuntu with Node.js 20, 22 and 24. The platform smoke matrix adds macOS and Windows with Node.js 22. It installs the pinned dependencies from the lockfile without lifecycle scripts, runs the CLI contract tests, and checks the npm packaging step with a dry run. No package is published.

These checks establish installation from a repository checkout and the tested CLI behavior on the specified CI runners only after CI passes. They do not establish global npm installation, all filesystem behavior on Windows, model recognition of installed agent skills, or full support for every operating-system version. The package remains private in package.json and is not published to npm. Actual host skill recognition still requires explicit invocation in the host application.
