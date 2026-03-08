# Workspace AGENTS Guide

## Scope

This workspace contains supporting files at the root, but the main application lives in `language-learning-automation/`.

Unless the user explicitly asks otherwise, treat `language-learning-automation/` as the primary project root for code and docs work.

## Preferred Working Style

Use a lead-developer workflow instead of a one-shot automation workflow.

Default loop:

1. Inspect the relevant feature and identify the files involved.
2. Propose two implementation plans with tradeoffs.
3. Implement the safer minimal-change option.
4. Validate and report remaining risks, edge cases, and next improvements.

When the user asks for code changes, prefer separating investigation, design, implementation, and validation across turns if that improves control.

## Scope Control

Keep changes narrow.

- State the intended file scope before editing when the scope is not already explicit.
- Prefer user-approved file lists such as `Only modify:` and `Do not modify:`.
- Do not rewrite unrelated code, generated output, or UI files unless the task requires it.

## Workspace Safety

- Do not edit media files such as `.mp4`, generated thumbnails, or audio unless requested.
- Do not edit `output/` artifacts unless the task is explicitly about generated outputs.
- Prefer storing durable project knowledge in `language-learning-automation/docs/`.

## Project-Specific Guidance

For work inside `language-learning-automation/`, also follow:

- `language-learning-automation/AGENTS.md`
- `language-learning-automation/docs/project-structure.md`
- `language-learning-automation/docs/codex-prompts.md`
