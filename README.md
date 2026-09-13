# PDFReader — Accessible Reading & Audio PWA

**Live demo:** https://mattteofernandezz-ctrl.github.io/pdfreader/#/login
**Status:** Beta — front-end functionality in active development

A mobile-first Progressive Web App for reading PDF documents with a strong focus on accessibility: text-to-speech audio playback, a persistent dark theme, and full keyboard navigation, aimed at readers who are underserved by typical PDF viewers — including users with visual difficulties, concentration challenges, or limited experience with technology.

## Features

- **Authentication** — Login flow with JWT-based session handling
- **PDF reading** — Core document viewing and library/bookshelf management
- **Audio playback** — Text-to-speech reading and an audiobook/podcast-style player
- **Dark theme** — User preference persists across sessions via `localStorage`
- **Accessibility-first** — Built and tested against WCAG keyboard-navigation guidelines
- **Mobile-first, responsive** — Designed for small screens first, scales up to desktop

## Tech Stack

- **React** — component-based front-end
- **Vite** — build tooling and dev server
- **Tailwind CSS** — utility-first responsive styling
- **JWT** — authentication/session handling

## Testing & QA

Manually tested using browser DevTools (Microsoft Edge) against a written set of test cases covering functional, boundary, accessibility, and persistence scenarios:

| Test Case | Description | Result |
|---|---|---|
| TC-001 — Login | Successful login with valid credentials, correct JWT handling | Passed |
| TC-002 / TC-005 — Password boundary | Negative testing: empty password and password over 16 characters | Passed |
| TC-009 / TC-012 — Dark theme persistence | Theme selection survives a forced page reload via `localStorage` | Passed |
| TC-011 — Keyboard accessibility (menu) | Full keyboard-only navigation through menus and forms | Follow-up — tab focus indicator not fully visible; navigation itself works |
| TC-Audio — Multimedia player | Audiobook/audio playback triggers and plays correctly | Passed |

The keyboard-focus visibility issue (TC-011) is a known, open item — it's flagged rather than hidden because that's what an honest QA log looks like.

## Running Locally

```bash
git clone https://github.com/mattteofernandezz-ctrl/pdfreader.git
cd pdfreader
npm install
npm run dev
```



## Roadmap

- Expanded audiobook and podcast playback support
- Continued accessibility hardening (starting with the keyboard-focus item above)
- Back-end integration beyond the current front-end-focused beta

## About This Project

This is my first serious personal project, built while studying Software Analysis and Development. It's a deliberate combination of what I care about most: accessible, inclusive design and hands-on front-end/QA practice.
