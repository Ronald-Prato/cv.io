# cv.io

`cv.io` is an open source platform to help people create, manage, and iterate on their CV with an AI-powered workflow.

The core idea is simple: instead of editing static resume files manually, users interact with a smart chat agent that can structure experience, improve content, and eventually export polished CVs in multiple templates.

## Product Intent

- Build a CV workspace where users can keep multiple resumes organized.
- Add an intelligent chat layer to update CV sections with natural language.
- Support importing existing resumes (PDF) as a starting point.
- Export final CVs as PDFs with different layouts/templates.

## Current Scope (Macro)

- **Home-first UX** with two main areas:
  - Left sidebar with user info and "My CVs" list.
  - Right interactive chat area (ChatGPT-like), including PDF drop/upload and chat input.
- **Design system foundations**:
  - Reusable UI primitives inspired by shadcn patterns (`Button`, `Input`, `Textarea`, `Tooltip`, `Skeleton`, `Typography`).
  - Semantic color tokens available in Tailwind utilities.
  - Dark mode-ready token system.

## Tech Stack

- **Frontend:** Next.js (App Router) + React + TypeScript
- **Styling:** Tailwind CSS v4
- **Backend/BaaS:** Convex
- **Auth (planned/target):** Clerk

## Domain Contracts (Initial)

```txt
User {
  id uid
  email string
  authId string
  createdAt Date
  updatedAt Date
}

CV {
  id uid
  labels string[]
  experiences string[]
  skills string[]
  social {
    linkedin string
    facebook string
    youtube string
    github string
  } ?
  contact {
    email string
    phone string
    address string ?
  }
}
```

## Current Project Status

- UI baseline implemented for the first screen.
- Home page structure aligned with product setup spec.
- Color system and component layer ready to scale into more screens.
- Convex project scaffold is present for backend iteration.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Convex MCP (CV by ID)

This project exposes a dedicated query to fetch one CV by ID:

- `cvs:getById`
- args: `{ "cvId": "<your_convex_cv_id>" }`

Start the Convex MCP server:

```bash
npm run mcp:convex
```

In your MCP-enabled chat client, call `cvs:getById` and ask for Markdown output with a JSON code block, for example:

```md
Trae el CV con este id usando MCP y devuélveme el resultado en Markdown con bloque ```json```.
cvId: "<your_convex_cv_id>"
```

## Near-Term Roadmap

- Connect chat UI with real conversation state and Convex mutations/queries.
- Persist CV entities and history per user.
- Add auth with Clerk and user-scoped data access.
- Implement PDF parsing/import flow.
- Add CV export pipeline with templates.
