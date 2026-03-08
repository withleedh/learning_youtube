# Admin Workbench Architecture

## Goal

Build an episode-centered admin workbench that lets a human review and improve:

- topic candidates
- script candidates
- generated images
- generated audio
- render previews
- shorts outputs

The system must support approval, partial regeneration, version history, and team review without forcing a full re-run from the beginning.

The workbench is the primary entry point for production use.
The legacy CLI remains available for internal batch runs, backfills, and debugging.

## Why The Current Flow Is Not Enough

The current pipeline is optimized for one-shot execution:

1. topic selection
2. script generation
3. image generation
4. TTS generation
5. longform render
6. shorts render

That flow is good for automation, but poor for human quality control because:

- there is no approval checkpoint
- later stages may mutate earlier artifacts
- assets are stored by timestamped output folders instead of durable episode identity
- partial regeneration is awkward

## Target Architecture

Use a split control-plane structure.

```text
Admin UI
  -> API layer
    -> job queue
      -> generation workers
        -> existing script / image / tts / render modules

Metadata DB
  -> episode status
  -> revisions
  -> assets
  -> jobs
  -> reviews

File storage
  -> binary assets and JSON artifacts
```

## Team Workflow Model

This workbench is built for multi-role review, not just single-user generation.

Recommended roles:

- producer: creates episode and chooses scope
- content reviewer: approves topic and script
- asset reviewer: checks images and audio
- editor: approves render preview and final output

Key rule:

- downstream stages must not auto-advance without an explicit approval state

## Episode-Centered Storage

Store work by stable episode id, not timestamp folder alone.

Recommended layout:

```text
data/
  episodes/
    <channelId>/
      <episodeId>/
        episode.json
        stages/
          topic/
            v001/
              metadata.json
              candidates.json
              approved.json
          script/
            v001/
              metadata.json
              candidates/
              approved-script.json
          image/
            v001/
              metadata.json
              manifest.json
              scene_001.png
              scene_002.png
          tts/
            v001/
              metadata.json
              manifest.json
              audio/
          render/
            v001/
              metadata.json
              preview.mp4
              final.mp4
          shorts/
            v001/
              metadata.json
              manifest.json
              outputs/
        reviews/
        jobs/
```

Notes:

- binary files stay on disk
- DB stores pointers and state
- each stage is versioned independently
- approved artifacts are explicit, not implied

## Stage Model

Primary stages:

1. `topic`
2. `script`
3. `image`
4. `tts`
5. `render`
6. `shorts`

Per-stage review state:

- `draft`
- `pending_review`
- `approved`
- `changes_requested`
- `stale`

Common workflow:

1. generate candidates
2. review candidates
3. approve one version
4. unlock next stage

If an upstream stage changes, downstream approved stages become `stale`.

Example:

- approved script changes
- image, tts, render, shorts become `stale`
- previous binaries remain for reference

## UI Structure

The admin workbench should be an application separate from Remotion preview roots.

Core screens:

- dashboard
  - channel summary
  - episodes by stage
  - approval queue
- episode workspace
  - topic tab
  - script tab
  - image tab
  - audio tab
  - render tab
  - shorts tab
- asset compare view
  - side-by-side image compare
  - audio compare with text
  - preview compare for render candidates
- jobs monitor
  - queued, running, failed, completed jobs
- settings
  - channel defaults
  - model/provider settings

Episode workspace layout:

- left rail: stage navigation and status
- center: candidate list and preview surface
- right rail: metadata, prompt snapshot, reviewer notes, actions

## API Responsibilities

The API should not generate assets directly in request/response.

It should:

- create episodes
- enqueue jobs
- fetch stage candidates
- approve or reject versions
- mark downstream stages stale
- return file metadata and signed/local paths

Representative endpoints:

- `POST /episodes`
- `GET /episodes/:episodeId`
- `POST /episodes/:episodeId/stages/topic/generate`
- `POST /episodes/:episodeId/stages/script/:version/approve`
- `POST /episodes/:episodeId/stages/image/:version/regenerate`
- `POST /episodes/:episodeId/stages/tts/:version/regenerate`
- `POST /episodes/:episodeId/stages/render/preview`
- `GET /jobs/:jobId`

## Worker Responsibilities

Workers wrap existing generation modules and operate on explicit stage versions.

Worker rules:

- never overwrite an approved version in place
- write artifacts into a new version directory
- record prompt snapshot and model/provider metadata
- report progress in job records

## Reuse Of Existing Code

The current codebase already has reusable domain logic.

Direct integration candidates:

- `src/script/generator.ts`
- `src/image/generator.ts`
- `src/tts/generator.ts`
- `src/pipeline/index.ts`
- render helpers in `src/pipeline/index.ts` and `scripts/render-video.ts`

These modules should gradually become worker-facing services instead of only CLI-facing steps.

## Recommended Implementation Strategy

Do not build the full UI and backend in one shot.

### Phase 1: Foundation

- add episode/stage/version domain model
- add file layout helpers
- add architecture doc
- define stale/approval rules

### Phase 2: Control Plane

- add metadata DB
- add API server
- add job table and worker queue
- adapt existing generation functions to write into episode stage versions

### Phase 3: Admin UI

- dashboard
- episode workspace
- asset review actions
- job monitoring

### Phase 4: Advanced Review

- side-by-side compare
- prompt history
- reviewer comments
- assignment and audit trail
- publish checklist

## First UI Slice Recommendation

When UI work starts, do not begin with the full dashboard.

Start with one vertical slice:

1. episode list
2. episode detail
3. topic candidate generation
4. topic approval
5. script generation trigger

That gives a usable approval loop early without blocking on image, audio, and render tooling.

## Non-Negotiable Rules

- no downstream auto-approval
- no in-place overwrite of approved assets
- no silent mutation of script during shorts generation
- every generated artifact must record its source stage version
- every approval must be reversible by creating a newer version, not rewriting history
