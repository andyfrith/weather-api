# 🌤️ Weather API: Edge-First AI-Augmented Backend

[![Deployed to: Cloudflare Workers](https://img.shields.io/badge/Deployed_to-Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Framework: Hono](https://img.shields.io/badge/Framework-Hono-FF4500?style=flat-square&logo=hono)](https://hono.dev)
[![AI: Gemini 2.5 Flash](https://img.shields.io/badge/AI-Gemini_2.5_Flash-4285F4?style=flat-square&logo=googlegemini)](https://ai.google.dev/)
[![Documentation: OpenAPI](https://img.shields.io/badge/Docs-OpenAPI-49aa25?style=flat-square&logo=openapi-initiative)](https://swagger.io)

**Weather API** is a high-performance, type-safe service running on **Cloudflare Workers**. It combines the global scale of the edge with the lightning-fast intelligence of **Google Gemini 2.5 Flash**, providing a "Single Source of Truth" for weather data and AI-driven insights.

## ✨ Latest Features

- **🌐 Cloudflare Workers Deployment**: Optimized for the edge, leveraging Hono for sub-100ms response times globally.
- **🧠 Gemini 2.5 Flash Integration**: Uses the latest 2.5 Flash model for near-instant weather summaries, clothing recommendations, and activity suggestions with enhanced reasoning efficiency.
- **🛡️ Hono + Zod OpenAPI**: Strict contract-first development. The API is self-documenting and provides end-to-end type safety.
- **🛑 Advanced Rate Limiting**: Built-in middleware protection to manage upstream API quotas (OpenWeather & Google AI).
- **🚨 Sentry for Workers**: Specialized observability to capture and monitor edge-case errors in the serverless runtime.

---

## 🏗️ Architecture Overview

The application utilizes a serverless architecture designed for zero cold starts and global low latency.

````mermaid
graph TD
    User((User/Client)) -->|HTTPS Request| CF[Cloudflare Edge Node]
    subgraph Cloudflare Worker
        CF --> Hono[Hono Router]
        Hono --> Middleware[Rate Limiter & Sentry]
        Middleware --> Service[Weather Service]
    end
    Service -->|Fetch Data| OW[(OpenWeather API)]
    Service -->|Contextual Prompt| Gemini[(Gemini 2.5 Flash)]
    Gemini -->|JSON Insights| Service
    Service -->|Validated Response| User

## 🏗️ Best Practices

### 1. Edge-Native Performance

By running **Hono** on **Cloudflare Workers**, the application utilizes a "no-cold-start" architecture, delivering data from the nearest edge node to the end user.

### 2. Intelligent Insights

The API utilizes **Gemini 2.5 Flash** to transform raw data into actionable advice.

- **Low Latency AI**: Flash 2.5 provides the speed required for real-time edge interactions.
- **Schema Validation**: Every AI-generated response is validated via Zod to ensure JSON structure integrity and prevent "hallucinations" in the UI.

### 3. Contract-First Integrity

- **Zod-to-OpenAPI**: Automated documentation ensures the UI client is always in sync with the server.
- **Type-Safe RPC**: Provides a seamless developer experience when connecting with the [Weather React Client](https://github.com/andyfrith/weather-reactjs).

---

## 🚀 Quick Start

### 1. Installation & Local Dev

```bash
git clone [https://github.com/andyfrith/weather-api.git](https://github.com/andyfrith/weather-api.git)
cd weather-api
bun install
````
