# 🌤️ Weather API: AI-Augmented High-Performance Backend

[![Built with Bun](https://img.shields.io/badge/Runtime-Bun-black?style=flat-square&logo=bun)](https://bun.sh)
[![Framework: Hono](https://img.shields.io/badge/Framework-Hono-FF4500?style=flat-square&logo=hono)](https://hono.dev)
[![AI: Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=flat-square&logo=googlegemini)](https://ai.google.dev/)
[![Monitoring: Sentry](https://img.shields.io/badge/Monitoring-Sentry-362d59?style=flat-square&logo=sentry)](https://sentry.io)

**Weather API** is a blazingly fast, type-safe RESTful service built on the **Bun** runtime and the **Hono** framework. It leverages **Google AI (Gemini)** to provide intelligent summaries and **Zod OpenAPI** to enforce strict data contracts.

## ✨ Key Features

- **🤖 Google AI Integration**: Utilizes **Gemini 1.5** to generate human-readable weather insights, clothing recommendations, and activity suggestions based on real-time data.
- **⚡ Blazing Fast Routing**: Powered by Hono’s lightweight router and Bun’s optimized JavaScript engine.
- **🛡️ Contract-First Architecture**: End-to-end type safety using `@hono/zod-openapi`. Define once, validate everywhere.
- **🛑 Smart Rate Limiting**: Built-in protection against API abuse, ensuring service stability and quota safety.
- **🌍 OpenWeather Integration**: Robust real-time atmospheric data with advanced error mapping.
- **🔍 Self-Documenting API**: Interactive Swagger UI automatically generated from your Zod schemas.

---

## 🏗️ Architecture Best Practices

### 1. AI Service Layer

Google AI logic is isolated within `src/services/ai.service.ts`. We treat the LLM as a structured data provider, using specific prompts to ensure the AI output remains consistent with our API's schema.

### 2. Schema-Driven Validation

Every request and AI-generated response is validated against **Zod schemas**. This ensures that even if an AI model's output format fluctuates, your API consumers always receive structured, reliable data.

### 3. Rate Limiting & Resilience

- **Abuse Prevention**: Middleware-level rate limiting protects both your OpenWeather and Google AI quotas.
- **Timeouts**: Every external fetch (Weather & AI) uses `AbortSignal.timeout` to maintain a responsive user experience.

---

## 🚀 Quick Start

### 1. Installation

```bash
git clone [https://github.com/andyfrith/weather-api.git](https://github.com/andyfrith/weather-api.git)
cd weather-api
bun install
```
