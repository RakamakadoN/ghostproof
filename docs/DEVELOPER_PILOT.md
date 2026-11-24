# Ghostproof developer usability pilot

**Protocol v0.1 — 2026-11-24. Status: PROPOSED / NOT RUN.**

## Question

Does Ghostproof v0.6.0 help developers review ordinary JavaScript/TypeScript asynchronous-code correctness more efficiently than manual review, without increasing incorrect conclusions? This is a usability pilot, not a security assessment or real-world detection benchmark.

## Fixed starting point

Use Ghostproof revision `fde170267f08967f13c7af5658167e64ff540d23` ([source](https://github.com/RakamakadoN/ghostproof/commit/fde170267f08967f13c7af5658167e64ff540d23)). Its [post-merge CI](https://github.com/RakamakadoN/ghostproof/actions/runs/45406249022) passed. Prior internal regression results do not count as independent participant data.

## Design, registered before recruitment

- Target six to ten consenting developers who did not implement the tool. Record broad experience bands only. Participation is optional and unpaid unless separately agreed.
- A facilitator who is not a participant prepares two small, equivalent-difficulty sets of repository-owned or deliberately shareable synthetic code-review tasks. Each set includes ordinary async-completion examples, correct code, and ambiguous examples whose application contract cannot be established by inspection alone. Freeze inputs, answer rubric, and content hashes before any participant sees them.
- Each participant reviews one set manually and the other with Ghostproof. Counterbalance task set and condition order across participants (four combinations), using a preassigned allocation. No participant sees the same task twice; no facilitator hints or reference answers before both sessions end.
- Allow the same editor and documentation access in both conditions. Do not introduce other automated review tools in either condition. Record Node version and setup time separately. The assisted condition uses the read-only scan command only; no scanned code is executed.
- Cap each session at 20 minutes. Record unfinished tasks and setup failures rather than excluding them. Independent rubric scoring should hide the condition where feasible; have a second reviewer resolve disagreements without changing the frozen rubric.
- Use the [worksheet](DEVELOPER_PILOT_WORKSHEET.md). Collect only consented anonymous aggregate observations, not private repositories, source excerpts, credentials, or undisclosed findings.

## Measurements and proposed decision gate

Primary: paired elapsed review time, counting unfinished sessions at the cap; correctness score (correct identification and interpretation of task outcomes divided by all assigned tasks; unfinished tasks score zero); number of E0 candidates incorrectly called confirmed defects.

Secondary: setup success/time, completed tasks, perceived usefulness (1–5), and qualitative friction. Report all denominators and missing observations by condition. Compare participant-level paired time changes and aggregate correctness; publish individual anonymous paired values only if participants explicitly consent and reidentification risk is low.

**Provisional pilot signal:** at least six completed pairs; median paired review time at least 20% lower with assistance; assisted correctness no lower than manual correctness; zero incorrect E0-to-confirmed claims in the assisted condition. Otherwise record mixed, negative or inconclusive results as appropriate. These are preselected product decision thresholds, not statistical significance criteria. A small self-selected pilot cannot establish population-wide benefit.

## Boundaries

Only E0 syntax candidates are produced by scanning. An ambiguous example is not a confirmed project defect. No external project execution, external E2/E3 proof, public vulnerability reporting, telemetry, or automatic upload is part of this pilot. The facilitator and participants must avoid confidential materials. Any consented feedback should be sanitized before public sharing.

## Exit

Freeze the protocol, collect observations, score with the predeclared rubric, and publish a dated aggregate report including negative results and limitations. Do not change detector rules or expand the scope during a pilot. If independent participants or an independent rubric scorer are unavailable, mark the pilot NOT RUN or INCONCLUSIVE rather than substituting author-generated tests.
