# Verification Report

Date: 2026-07-17 (Asia/Taipei)

## Implemented

- Consolidated Practice and Infinity into Training settings.
- Added timed (80 seconds) and untimed Training pace options.
- Added random and saved-board sources with a unified normalized board shape.
- Added target-letter and abundance filters for both board sources.
- Unified new-word green and repeated-word yellow feedback.
- Enabled word-definition lookup and one-second path preview only in untimed Training.
- Locked pointer input during the one-second path preview.
- Kept result badges inert in timed Training and all event modes.
- Added and expanded Vitest coverage for the new behavior.

## Checks Passed

- TypeScript: `tsc --noEmit`
- Vitest: 10 files, 93 tests passed
- Next.js production build: `next build`

## Existing Build Warnings

The build still reports pre-existing React Hook dependency warnings in several pages and dynamic-server-usage logs from existing profile/search API routes during static generation. They do not fail the production build.

## Runtime Note

The package declares Node.js 24.x in `package.json`. Saved-board features require the configured Postgres environment variables used by the existing project.
