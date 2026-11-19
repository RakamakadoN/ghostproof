# GHOSTPROOF Agent Skill

This repository ships an instruction-only [Agent Skills](https://agentskills.io/specification) integration for assistants that can access a trusted Ghostproof CLI checkout. It does not install the CLI, execute unknown target repositories, or enable external-project E2/E3 verification.

## Included skills

| Host | Repo-local skill | Invoke |
| --- | --- | --- |
| OpenAI Codex CLI / IDE | [`.agents/skills/ghostproof/SKILL.md`](../.agents/skills/ghostproof/SKILL.md) | `$ghostproof` or select it in `/skills` |
| Claude Code | [`.claude/skills/ghostproof/SKILL.md`](../.claude/skills/ghostproof/SKILL.md) | `/ghostproof` or automatic selection by task |

The two files are deliberately identical. `npm test` ensures they stay synchronized. Availability and invocation depend on the installed host version and settings. A repository-scoped skill is not automatically registered in the ChatGPT web app.

## Use in this repository

```bash
git clone https://github.com/RakamakadoN/ghostproof.git
cd ghostproof
npm ci --ignore-scripts
npm test
```

Start the assistant **from the repository directory** so its repo-local skill path is discoverable. In a tool-enabled host, ask:

> Use ghostproof to scan the src directory. Report E0 findings and any skipped coverage; do not execute target code.

Or, from any project, set the engine location in the agent's shell environment (example below assumes an existing checkout):

```bash
export GHOSTPROOF_HOME="$HOME/ghostproof"
node "$GHOSTPROOF_HOME/bin/ghostproof.mjs" scan "/absolute/path/to/my-project" --format json
```

`GHOSTPROOF_HOME` is an environment variable for the CLI's location, **not** the path of the project under review.

## Personal installation for other projects

From a **trusted checkout** of this repository, copy the skill into the host's personal skill directory:

```bash
mkdir -p "$HOME/.agents/skills/ghostproof"
cp .agents/skills/ghostproof/SKILL.md "$HOME/.agents/skills/ghostproof/SKILL.md"

mkdir -p "$HOME/.claude/skills/ghostproof"
cp .claude/skills/ghostproof/SKILL.md "$HOME/.claude/skills/ghostproof/SKILL.md"
```

Only run the corresponding two commands for the host you use. If the host does not detect a new skill, reload skills or restart the session. **Copying the skill alone does not install its Node.js engine**: keep the verified Ghostproof checkout and its dependencies available separately. The package is not published to npm and `npx ghostproof` is not an installation method.

## What an agent must not claim

- `scan` produces **E0 candidates**, not a verified project bug or security certification.
- `experiment GP001/GP002` reproduces language mechanisms in Ghostproof-owned fixtures (E1).
- `proof BW001` / `verify` apply **only** to the repository-owned BW001 sample (E2/E3), not arbitrary third-party code.
- The skill never authorizes an agent to install dependencies, run scripts in a target, post findings publicly, or execute an untrusted test without the user's separate permission.

Read [the proof protocol](PROOF_PROTOCOL.md) for definitions, scope, and reporting requirements.

## v0.5 host smoke and pinned study

```bash
cd ~/ghostproof
npm run smoke:skills
node ./bin/ghostproof.mjs study --format json
```

The smoke check compares the personal Codex and Claude SKILL.md files against the repository. It does not prove model activation. Open a new Codex session and explicitly request `$ghostproof`; open a new Claude Code session and invoke `/ghostproof`. Ask for a read-only scan of `~/ghostproof/src` and inspect its scanned-file count.

The pinned study downloads only two approved public files at exact Git revisions, validates their Git blob hashes, and emits E0 findings without executing downloaded source. Details: [PINNED_STUDY.md](PINNED_STUDY.md).
