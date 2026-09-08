# AI-Powered Pull Request Reviewer (SaaS)

An event-driven, multi-tenant SaaS application that automatically reviews GitHub Pull Requests using Google's Gemini 1.5 AI. It acts as an automated senior engineer—analyzing diffs, leaving strict inline comments on specific lines of code, and providing architectural summaries to improve code quality.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=nodedotjs)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker)](https://www.docker.com/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Message%20Queue-FF4F00?logo=redis)](https://docs.bullmq.io/)
[![Gemini 1.5](https://img.shields.io/badge/Gemini_1.5-AI_Model-4285F4?logo=google)](https://deepmind.google/technologies/gemini/)

> **🎥 Demo:** [Insert link to a 60-second Loom or GIF of the app working here]

## Key Features

* **Multi-Tenant Architecture:** Users can log in via GitHub OAuth, and the platform dynamically executes Octokit API calls using their specific access tokens.
* **Programmatic Webhooks:** The Next.js dashboard automatically installs GitHub webhooks on user-selected repositories via the GitHub API—no manual configuration required.
* **Event-Driven Processing:** Decoupled Express API gateway and background worker processes prevent timeouts during large PR diffs and high webhook volume.
* **Granular AI Context:** Users can configure the AI's strictness tone (Strict, Educational, Lenient) and focus areas (Security, Performance, Logic) per repository.
* **Fully Containerized:** The entire microservice stack (Frontend, Gateway, Worker, Redis) is orchestrated using Docker Compose for complete environment parity.

---

## System Architecture

The application utilizes a microservices architecture to ensure scalability and prevent the GitHub webhook API from timing out during complex AI processing.

```mermaid
sequenceDiagram
    participant Dev as Developer (GitHub)
    participant Next as Next.js Dashboard
    participant Gateway as Express Gateway
    participant Redis as Redis Queue (BullMQ)
    participant Worker as Node.js Worker
    participant AI as Gemini 1.5 Flash

    Dev->>Next: Logs in via OAuth & Enables Repo
    Next->>Dev: Injects Webhook into GitHub Repo via API
    Dev->>Dev: Opens Pull Request
    Dev-->>Gateway: Webhook POST Request (PR Payload)
    Gateway-->>Redis: Acknowledges GitHub & Adds Job to Queue
    Redis-->>Worker: Dispatches Job to background worker
    Worker->>Worker: Fetches user token & PR Diff via Octokit
    Worker->>AI: Sends diff with custom Repo Config rules
    AI-->>Worker: Returns JSON (Inline comments & Summary)
    Worker-->>Dev: Posts inline review directly to GitHub PR