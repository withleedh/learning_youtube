# Project AGENTS Guide

## Project Identity

This project is a language-learning video automation system built around:

- channel configuration in `channels/`
- generation pipelines in `src/pipeline/`, `src/script/`, `src/tts/`, `src/image/`
- Remotion rendering in `src/Root.tsx`, `src/ComparisonRoot.tsx`, and `src/SurvivalRoot.tsx`

Read `docs/project-structure.md` first when the task touches unfamiliar parts of the codebase.

## Standard Work Loop

For non-trivial tasks, use this sequence by default:

1. Inspect the feature first.
2. Explain the current architecture briefly.
3. Propose two implementation options with tradeoffs.
4. Choose the safer minimal-change option.
5. Implement only within the approved scope.
6. Run validation.
7. Report changed files, risks, and next steps.

If the user explicitly wants direct execution, keep the same discipline internally and still preserve minimal scope.

## Scope Rules

Prefer tight file boundaries.

- If the user provides an allowed file list, stay inside it.
- If the user does not provide a file list and the task is ambiguous, identify the planned file scope before editing.
- Do not modify unrelated UI, assets, or automation files while fixing logic in another layer.
- Do not broaden a change from one format to all formats unless the user asks for that generalization.

## Editing Priorities

Prefer editing these sources over patching generated artifacts:

- business logic: `src/`
- channel behavior: `channels/`
- documentation: `docs/`
- tests: colocated `*.test.ts`, `*.test.tsx`, `*.property.test.ts`

Avoid editing these unless the task directly targets them:

- `output/`
- `public/` preview payloads
- `assets/` binary files
- `reference/` research snapshots
- `node_modules/`

## High-Value Entry Points

Start here for most tasks:

- `package.json`: scripts and runtime entry points
- `src/pipeline/cli.ts`: CLI entry
- `src/pipeline/index.ts`: end-to-end pipeline orchestration
- `src/script/generator.ts`: script generation entry
- `src/script/pipeline/orchestrator.ts`: multi-step script pipeline
- `src/config/loader.ts`: channel config loading
- `channels/*.json`: per-channel behavior
- `src/Root.tsx`: default Remotion root
- `src/ComparisonRoot.tsx`: comparison format
- `src/SurvivalRoot.tsx`: survival format

## Validation Expectations

After code changes, run only the smallest useful validation first, then expand if needed.

Typical options:

- `npm run test`
- `npm run lint`
- `npm run pipeline -- --channel <channel>`
- `npm run start`
- targeted script or Vitest execution for the touched area

If validation is skipped or blocked, say so explicitly.

## Prompting Pattern

If you need a reusable user prompt, prefer this structure:

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
- <fill this in>
```

See `docs/codex-prompts.md` for more task-specific templates.
