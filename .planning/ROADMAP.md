# Roadmap: TinyImg

## Milestones

- ✅ **v0.1.0 MVP** — Phases 1-9 (shipped 2026-03-26)
- ✅ **v0.2.0 维护与修复** — Phases 10-15 (shipped 2026-03-29)
- 🚧 **v0.3.0 功能增强与质量保障** — Phases 16-19 (in progress)

## Phases

<details>
<summary>✅ v0.1.0 MVP (Phases 1-9) — SHIPPED 2026-03-26</summary>

- [x] Phase 1: Project Init & Infrastructure (5/7 plans) — completed 2026-03-24
- [x] Phase 2: API Key Management (4/4 plans) — completed 2026-03-24
- [x] Phase 3: Smart Cache System (3/3 plans) — completed 2026-03-25
- [x] Phase 4: Fallback & Concurrency (4/5 plans) — completed 2026-03-25
- [x] Phase 5: CLI Tool (4/4 plans) — completed 2026-03-25
- [x] Phase 6: unplugin Plugin (5/5 plans) — completed 2026-03-25
- [x] Phase 7: Testing & Documentation (10/10 plans) — completed 2026-03-26
- [x] Phase 8: Release Preparation (3/3 plans) — completed 2026-03-26
- [x] Phase 9: Fixes & Polish (6/6 plans) — completed 2026-03-26

</details>

<details>
<summary>✅ v0.2.0 维护与修复 (Phases 10-15) — SHIPPED 2026-03-29</summary>

- [x] Phase 10: Package Publishing (2/2 plans) — completed 2026-03-27
- [x] Phase 11: Documentation Corrections (1/1 plans) — completed 2026-03-27
- [x] Phase 12: Release Workflow Cleanup (3/3 plans) — completed 2026-03-27
- [x] Phase 13: CHANGELOG Optimization (1/1 plans) — completed 2026-03-28
- [x] Phase 14: Test Resources Cleanup (1/1 plans) — completed 2026-03-28
- [x] Phase 15: Examples Creation (4/4 plans) — completed 2026-03-28

</details>

---

### 🚧 v0.3.0 功能增强与质量保障 (In Progress)

**Milestone Goal:** 扩展图片格式支持，增强 CLI 功能，并强化代码质量保证机制

#### Phase 16: Infrastructure Foundation
**Goal**: Quality gates and safety mechanisms prevent broken code and accidental releases
**Depends on**: Phase 15
**Requirements**: INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. Developer cannot commit code that fails lint or typecheck (pre-commit hook blocks)
  2. All tests run automatically across multiple Node.js versions on every push/PR
  3. Developer cannot publish packages to npm from local machine (CI-only publishing enforced)
**Plans**: 3 plans
- [x] 16-01-PLAN.md — Pre-commit hooks with husky, lint-staged, and commitlint (INFRA-01)
- [x] 16-02-PLAN.md — Test matrix CI workflow across Node 18/20/22 (INFRA-02)
- [x] 16-03-PLAN.md — Local publish prevention with .npmrc and prepublishOnly (INFRA-03)

#### Phase 17: CLI List Command
**Goal**: Users can preview compressible images before using API quota
**Depends on**: Phase 16
**Requirements**: CLI-01, CLI-02
**Success Criteria** (what must be TRUE):
  1. User can run `tinyimg list` or `tinyimg ls` to see all compressible images in current directory
  2. User can see file count, total size, and estimated savings for each file
  3. List command runs without making any API calls (dry-run mode)
**Plans**: 1 plan
- [x] 17-01-PLAN.md — List/ls command implementation with tests (CLI-01, CLI-02)

#### Phase 18: PNG Transparency Detection
**Goal**: System can detect PNG transparency to enable intelligent format conversion
**Depends on**: Phase 17
**Requirements**: IMG-01
**Success Criteria** (what must be TRUE):
  1. System can accurately detect if PNG has alpha channel transparency
  2. Detection uses pixel sampling (not just metadata) to avoid false positives
  3. Detection completes in under 2 seconds for 5MB PNG files
**Plans**: 1 plan
- [x] 18-01-PLAN.md — PNG alpha detection with sharp (TDD) (IMG-01)

#### Phase 19: Format Conversion & Expansion
**Goal**: Users can convert opaque PNGs to JPG and compress modern image formats
**Depends on**: Phase 18
**Requirements**: IMG-02, FMT-01, FMT-02
**Success Criteria** (what must be TRUE):
  1. User can run `tinyimg convert ./src/*` to convert opaque PNGs to JPG with before/after paths logged
  2. User can compress AVIF and WebP images via glob matching (e.g., `tinyimg "./**/*.webp"`)
  3. User can pass multiple input paths/patterns (e.g., `tinyimg ./src/images/* ./src/assets/*`)
**Plans**: 1 plan
- [x] 19-01-PLAN.md — Format conversion and multi-format support (IMG-02, FMT-01, FMT-02)

#### Phase 20: Milestone Testing
**Goal**: Verify all v0.3.0 requirements through comprehensive automated and manual testing
**Depends on**: Phase 19
**Requirements**: INFRA-01, INFRA-02, INFRA-03, CLI-01, CLI-02, IMG-01, IMG-02, FMT-01, FMT-02
**Success Criteria** (what must be TRUE):
  1. All 308+ existing tests pass with no regressions
  2. Test coverage improves above baseline 83.52%
  3. E2E tests verify CLI commands work with real file operations
  4. All 9 requirements verified through automated tests and manual inspection
  5. Milestone verification report documents complete results
**Plans**: 3 plans
- [x] 20-01-PLAN.md — Fill test coverage gaps (cluster-storage, compress --convert, CLI smoke)
- [x] 20-02-PLAN.md — E2E tests and milestone requirements verification tests
- [ ] 20-03-PLAN.md — Manual verification and milestone report generation

---

## Progress

**Execution Order:**
Phases execute in numeric order: 16 → 17 → 18 → 19 → 20

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 16. Infrastructure Foundation | v0.3.0 | 3/3 | Complete    | 2026-03-29 |
| 17. CLI List Command | v0.3.0 | 1/1 | Complete    | 2026-03-29 |
| 18. PNG Transparency Detection | v0.3.0 | 1/1 | Complete    | 2026-03-29 |
| 19. Format Conversion & Expansion | v0.3.0 | 1/1 | Complete    | 2026-03-29 |
| 20. Milestone Testing | v0.3.0 | 2/3 | Complete    | 2026-03-30 |

---
*Roadmap created: 2026-03-23*
*Last updated: 2026-03-30 — Phase 20 planned*
