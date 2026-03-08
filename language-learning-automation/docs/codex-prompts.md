# Codex Prompt Templates

Use these as copy-paste templates for controlled work. Replace the placeholders before sending.

## 1. Feature Investigation

```text
Inspect this feature first.
Find the files involved in <feature>.
Explain the current architecture briefly.
Do not write code yet.
```

## 2. Two-Plan Design Review

```text
Based on your findings, propose 2 implementation plans for <goal>.
Show the tradeoffs, risks, and expected file changes.
Do not write code yet.
```

## 3. Minimal-Change Implementation

```text
Implement the safer option with minimal changes only.

Constraints:
- minimal diff only
- do not rewrite unrelated code
- do not change public API unless necessary

Only modify:
- <file 1>
- <file 2>
- <test file>

Do not modify:
- <blocked file or folder>
```

## 4. Validation Pass

```text
Run validation for the changes you made.
List failing edge cases, remaining risks, and what should be improved next.
Do not make more code changes unless validation fails.
```

## 5. Bug Triage Before Fixing

```text
Investigate this bug first: <bug description>

Tasks:
1. find the most likely root cause
2. identify the minimal files to change
3. propose 2 fixes with tradeoffs

Do not write code yet.
```

## 6. Refactor With Guardrails

```text
Refactor only the targeted area for clarity.

Goals:
- improve readability
- preserve behavior
- keep the public API unchanged

Allowed files:
- <file list>

Do not modify:
- UI files
- config files
- unrelated tests

Run targeted validation after the refactor.
```

## 7. Test-First Change

```text
Before implementation:
1. inspect the current behavior
2. identify missing test coverage
3. add or update tests for <behavior>
4. then implement the minimal code change required

Allowed files:
- <source file>
- <test file>
```

## 8. Narrow Pipeline Change

```text
Inspect the pipeline stage involved in <stage or bug>.
Limit the change to the narrowest possible layer.

Only modify:
- src/pipeline/<file>
- src/script/<file>
- tests related to that layer

Do not modify:
- Remotion compositions
- channel JSON files
- assets

Show the planned scope before writing code.
```

## 9. Documentation Sync

```text
Update the docs for <feature or workflow>.

Requirements:
- document the current behavior, not the intended behavior
- keep the docs concise
- add links to the main entry files

Only modify:
- docs/<doc>.md
- README.md

Do not modify code.
```

## 10. Full Controlled Workflow

```text
Before writing code:

1. inspect relevant files
2. explain current architecture briefly
3. propose 2 implementation options
4. choose the safer minimal-change option
5. implement only within the allowed scope
6. run lint, tests, and build
7. report changed files, risks, and next steps

Constraints:
- minimal diff only
- do not rewrite unrelated code
- do not change public API unless necessary

Allowed files:
- <put files here>

Do not modify:
- <put files or folders here>
```

## Recommended Usage

For this repository, the most effective order is usually:

1. investigation
2. design
3. implementation
4. validation

If you are unsure about the scope, add an explicit `Only modify:` list before asking for implementation.
