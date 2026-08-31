# [1.1.0](https://github.com/jacksonpradolima/kimai-jira/compare/v1.0.0...v1.1.0) (2026-08-31)


### Bug Fixes

* **issue-panel:** hide timer tab ([afd6067](https://github.com/jacksonpradolima/kimai-jira/commit/afd60676e41c65f7bb2b2d2edc9ac731e2f829cd))
* **timer:** create Jira worklogs after stop ([3360f4c](https://github.com/jacksonpradolima/kimai-jira/commit/3360f4cc30b10f1d191116aa9a27752f7ebbd3a1))
* **timer:** tolerate partial stop responses ([93f201a](https://github.com/jacksonpradolima/kimai-jira/commit/93f201aaa9def67076e1b743d88fde66779beb31))


### Features

* link Manual entries to Jira worklogs ([36a5969](https://github.com/jacksonpradolima/kimai-jira/commit/36a59692042f810149fe6785256256c54d283dd3))
* **manual:** create linked Jira worklogs ([38dc281](https://github.com/jacksonpradolima/kimai-jira/commit/38dc281dffa8a7af578755cf9e63eddcfd959fa8))
* **worklogs:** link user-created entries to Jira ([529c98b](https://github.com/jacksonpradolima/kimai-jira/commit/529c98b8c770d844569592b430a769854f513985))

# 1.0.0 (2026-08-31)


### Bug Fixes

* address additional PR feedback ([8a5d742](https://github.com/jacksonpradolima/kimai-jira/commit/8a5d742388ee0b611ba098ab90fef9bd0b8b0e04))
* address PR sync review feedback ([0576d8b](https://github.com/jacksonpradolima/kimai-jira/commit/0576d8b9c78a586b0b8b09ac1397f1de1cccc448))
* address pull request review feedback ([7c0fa72](https://github.com/jacksonpradolima/kimai-jira/commit/7c0fa7215cf7e4d0112fbc132f7ca3e3d50ccaad))
* address remaining PR feedback ([59ff43d](https://github.com/jacksonpradolima/kimai-jira/commit/59ff43d5f29f51cbdb6a59f2108abe24398efef4))
* address remaining review feedback ([b5f1124](https://github.com/jacksonpradolima/kimai-jira/commit/b5f112483d06861a4bd40694217c93bf45f3827f))
* **connection:** guide first-time setup ([2a92c9f](https://github.com/jacksonpradolima/kimai-jira/commit/2a92c9f087eeaceb8f8a96016dff4521fa9eef7e))
* correlate synced timesheet creation ([0317a26](https://github.com/jacksonpradolima/kimai-jira/commit/0317a260583271427a0a5b3420cf1d9e299f1879))
* handle cleared defaults and load errors ([1a77f69](https://github.com/jacksonpradolima/kimai-jira/commit/1a77f6950379a13d673915b302f657745e440e68))
* harden webhook sync handling ([3428f46](https://github.com/jacksonpradolima/kimai-jira/commit/3428f464f2ae328964f9475cbe41d02f980147ad))
* **issue-context:** improve manual time entry ([c392d7b](https://github.com/jacksonpradolima/kimai-jira/commit/c392d7b1559df13fdae0d7bfc524ae5ef0deeb29))
* **issue-panel:** refine timer layout ([52538f7](https://github.com/jacksonpradolima/kimai-jira/commit/52538f77d7fb4f0707e85ce90783d26e2932c0ea))
* **issue-panel:** streamline time tracking UI ([49155c7](https://github.com/jacksonpradolima/kimai-jira/commit/49155c791e9eaea40029258941b13d298900bc77))
* **kimai:** normalize API base URL ([1d62fb6](https://github.com/jacksonpradolima/kimai-jira/commit/1d62fb6f10878c7afb30fb1789acc623224947df))
* **manual:** omit tags from Kimai payload ([2e3a3cf](https://github.com/jacksonpradolima/kimai-jira/commit/2e3a3cfd3fb50096642b4fbd5ed9a82ac3561718))
* **manual:** preserve Kimai local timestamps ([fb93e67](https://github.com/jacksonpradolima/kimai-jira/commit/fb93e6795ada5a127b92777c0936820bea503437))
* **manual:** preserve local entry time ([844e57d](https://github.com/jacksonpradolima/kimai-jira/commit/844e57d04a84630df82def89fca012204d1004ab))
* **manual:** restore native time fields ([29e3d84](https://github.com/jacksonpradolima/kimai-jira/commit/29e3d8460edb7f1763e513461433d790609246c9))
* override vulnerable uuid dependency ([b1ade17](https://github.com/jacksonpradolima/kimai-jira/commit/b1ade17b3f3ce553828c3803c1e70c6efa544cbf))
* preserve mapped timesheet updates ([7494151](https://github.com/jacksonpradolima/kimai-jira/commit/7494151712a83192734bf74e7f8562f0fb0e4e83))
* preserve mapped worklog updates ([d500f6a](https://github.com/jacksonpradolima/kimai-jira/commit/d500f6a52a9ac39899d4f85b819f469b3b6a596b))
* prevent sync race regressions ([0ecf2c0](https://github.com/jacksonpradolima/kimai-jira/commit/0ecf2c0a9ebbc1f49c0bd2313c84efd6d79aaa3a))
* **sync:** handle Forge worklog events ([1ce49b7](https://github.com/jacksonpradolima/kimai-jira/commit/1ce49b71856688717ce1c2a31b37e4e16794e74c))
* **sync:** recover Kimai worklog writes ([c0f79b3](https://github.com/jacksonpradolima/kimai-jira/commit/c0f79b3844ccd9b7d4a276fff0c4c1ad22604dac))
* **sync:** serialize and recover worklog sync ([5af8b34](https://github.com/jacksonpradolima/kimai-jira/commit/5af8b34708cb79b1ae35b52be3f0f9f1a9036b6e))
* **timer:** stretch fields and report API status ([63595f3](https://github.com/jacksonpradolima/kimai-jira/commit/63595f3652b33f38bc787d7d3a118fee64f45fbf))
* **ui:** prevent duplicate timer actions ([68e23bf](https://github.com/jacksonpradolima/kimai-jira/commit/68e23bf0402e633bd440665092c66e185417f82e))
* **ui:** show billable toggle ([ef594af](https://github.com/jacksonpradolima/kimai-jira/commit/ef594af4696dbf6c8d4d815bf13b514c7fd0fd80))


### Features

* add personal Kimai time tracking ([c4df955](https://github.com/jacksonpradolima/kimai-jira/commit/c4df9556fa0729a4ffaf862437343e4ca0f8cdcc))
* **manual:** default entries to current time ([043af81](https://github.com/jacksonpradolima/kimai-jira/commit/043af81049bc48961b48cace977abcb80fe493b6))
* scaffold Forge project for Kimai-Jira sync ([29d8087](https://github.com/jacksonpradolima/kimai-jira/commit/29d80872a4a24e4337a3864a43331f28cd2da320))
* **timer:** provision Kimai targets ([ded7087](https://github.com/jacksonpradolima/kimai-jira/commit/ded7087f16a797935451f8ec5e85e4a28486381d))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial Forge project scaffold: `manifest.yml`, TypeScript configuration, ESLint, Jest unit
  tests, and GitHub Actions CI (`npm ci`, lint, typecheck, test, `forge lint`).
- `jira:issueContext` timer/manual-entry panel and `jira:adminPage` configuration page (UI Kit 2).
- Jira worklog trigger handler and Kimai webhook web trigger, with HMAC signature verification.
- Jira → Kimai and Kimai → Jira synchronization modules with idempotency, loop prevention and a
  "last accepted update wins" conflict-resolution policy.
- Forge KVS-backed storage for configuration, user mappings and worklog/timesheet mappings, with
  credentials stored via the Forge Secret Store.
- Project documentation under `/docs`, built with Zensical and published to GitHub Pages.
- Separate, maintainer-triggered deployment workflow, kept independent of pull-request CI.
