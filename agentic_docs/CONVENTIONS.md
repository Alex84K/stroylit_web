# Project Development Conventions & Rules

This document is a strict set of rules for the AI Agent. Always follow these conventions when creating, modifying, or refactoring code.

---

# Mobile first + bootstrap grid (не из react а из vanile)!!!
из react bootstrap только готовые компоненты такие как Tabs, Table, Buttons, etc.

## 1. Tech Stack & UI Framework
* **Core:** React, TypeScript.
* **UI Components & Styling:** Always use **Bootstrap** (или `react-bootstrap`, *уточните здесь, если используете обертку*). 
    * Do NOT install or use Tailwind, Material UI, or custom CSS unless explicitly requested.
    * Utilize Bootstrap utility classes for layout, spacing, and minor adjustments.
    * **Small Buttons:** Для компактных/маленьких кнопок используйте связку `btn-sm` с утилитами `py-1 px-2 small` (пример: `className="btn btn-primary btn-sm py-1 px-2 small fw-bold"`).
* **Canvas exception:** `konva` / `react-konva` are allowed **only** inside `src/components/measurement/contour/` (the contour editor canvas, `DESIGN_MEASUREMENT.md` D18). Any other use of a canvas library needs an explicit design decision first — the main bundle must stay free of Konva (it is loaded lazily via `React.lazy`).

---

## 2. State Management & Data Fetching
* **Primary Tool (Default):** Always use **TanStack Query (React Query)** for all data fetching, caching, and server state management.
* **Exception (Redux Toolkit):** Use **RTK (Redux Toolkit)** ONLY when explicitly instructed in the task prompt, or for complex global UI state that cannot be handled by server state.
* **Rule:** If a task requires fetching data, start with React Query hooks (`useQuery`, `useMutation`) by default.

---

## 3. Architecture & Folder Structure (Feature-Driven)
All new features must strictly follow the Feature-Driven Architecture. As a golden reference, use the structure of the existing `users` feature.

### Reference Path
`src/features/users/`

### Required Feature Folder Structure
When creating a new feature (e.g., `products`), replicate this exact structure inside `src/features/products/`:

```text
src/features/[feature-name]/
├── api/                  # React Query hooks, API calls, axios instances
│   ├── getUsers.ts
│   └── createUser.ts
├── hooks/                # Local custom hooks (non-API)
│   └── useUserFilter.ts
├── types/                # TypeScript interfaces and types
│   └── index.ts
└── index.ts              # Public API for the feature (exports components/hooks for external use)

файлы .tsx отдельно в папке /Users/alex/Desktop/apps/rietberg_soft/rietberg_web/src/components
все модальные окна отдельно в папке /Users/alex/Desktop/apps/rietberg_soft/rietberg_web/src/components/modals

не использовать пропс дриллинг дальше дочернего соседнего компонента - во всех случаях react query или в отдельных случаях - RTK