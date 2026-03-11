# NanoDex Philosophy

NanoDex is a Codex-native continuation of NanoClaw, and should remain as faithful as possible to NanoClaw's philosophy and user experience while adapting to Codex's native workflow.

## Core Principles

### Small Enough to Understand

NanoDex should stay small enough that one person can understand the host runtime, container runtime, storage model, setup flow, and channel behavior without needing a platform team.

### Security Through Real Isolation

Agents should run behind real container boundaries with explicit mounts. Security should come from narrow exposure and OS-level isolation, not permission theater inside the application.

### Built for a Personal Fork

NanoDex is meant to be forked and reshaped. It should not drift into a generic platform or hosted control plane. The intended use is to keep a personal assistant in a codebase you can actually read and change.

### Code Over Configuration

Simple environment variables are fine. Beyond that, behavior should usually be expressed in code or instructions, not by growing layers of settings and control panels.

### The Agent Is the Interface

Setup, debugging, and customization should happen through Codex inside the repo. NanoDex should resist shell wizards, dashboards, and sidecar setup systems that pull the user away from the agent.

### AGENTS.md Is the Memory Model

Shared and per-group memory should live in `AGENTS.md` files:

- `groups/global/AGENTS.md` for shared instructions
- `groups/<group>/AGENTS.md` for group-specific instructions
- workspace files for durable local notes

### Skills Over Feature Sprawl

Core communication paths can be bundled when they are central to first-run usability. Beyond that, new capabilities should prefer repo skills or direct fork changes instead of inflating the base runtime.

### WhatsApp Is the Canonical Default

The most faithful NanoClaw interpretation keeps WhatsApp as the default product path.

Other channels can exist and even ship in the repo when that improves setup, but they should remain clearly secondary to the main NanoClaw-shaped experience. NanoDex should not present every channel as an equal pillar of the product.

### One Coherent Runtime

`npm start`, bootstrap, setup, runtime behavior, and repo guidance should all point to the same experience. If NanoDex says the agent is the interface, the code should behave that way.

## What NanoDex Is

NanoDex is:

- a small Node.js host orchestrator
- a Docker-backed Codex runtime
- per-group isolated workspaces and session state
- a personal assistant you can run yourself
- a codebase meant to be reshaped in your fork

## What NanoDex Is Not

NanoDex is not:

- a generic automation platform
- a multi-tenant hosted service
- a dashboard-heavy control plane
- a core runtime that tries to bundle every integration by default

## Standard For Changes

A good change should improve at least one of these without violating the others:

- simpler to understand
- easier to trust
- easier for Codex to modify safely
- more faithful to NanoClaw in spirit and user experience
- more coherent as a personal fork

If a change makes NanoDex feel less like NanoClaw in spirit, setup flow, or operating model, it should be treated as a regression unless there is a strong reason to accept it.
