# Emprega Mais

Emprega Mais is a job platform MVP focused on candidates 60+ and PCD (People with Disabilities).
This repository contains both the frontend and backend applications.

## Project Structure

- `/frontend` - React application built with Vite and TailwindCSS
- `/backend` - Node.js backend using Express, Supabase, and Google GenAI
- `/database` - Database-related files and schemas

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 20 or higher recommended)
- npm (usually comes with Node.js)

## Getting Started

Follow these steps to get both the frontend and backend running locally.

### 1. Environment Setup

The project requires environment variables to connect to Supabase and AI services. 
There is a `.env.example` file in the root directory showing all the required variables.

**Backend Configuration:**
1. Navigate to the `backend` directory.
2. Create a `.env` file (you can copy the content from `.env.example`).
3. Fill in the required keys, especially for Supabase and Gemini:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GEMINI_API_KEY=your_gemini_api_key
   PORT=3333
   ```

**Frontend Configuration:**
1. Navigate to the `frontend` directory.
2. Create a `.env` file and add the required Vite environment variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 2. Running the Backend

Open a terminal window and execute the following commands:

```bash
cd backend
npm install
npm run dev
```

The backend server will start running, typically at `http://localhost:3333` (or the port specified in your `.env`).

### 3. Running the Frontend

Open a **new** terminal window and execute the following commands:

```bash
cd frontend
npm install
npm run dev
```

The frontend development server will start, typically at `http://localhost:5173`. Open this URL in your browser to view the application.

## Deployment

This project is configured to be deployed on Vercel. You can deploy it by running the `vercel` CLI command in the root directory.
