# Deployment Guide: Frontend on Vercel, Backend on Render

This guide explains how to deploy your RAG Chatbot application with the frontend on Vercel and the backend on Render.

## Prerequisites

1. Accounts:
   - [Vercel](https://vercel.com) account
   - [Render](https://render.com) account
2. Git repository (GitHub, GitLab, or Bitbucket)
3. API keys:
   - Google Gemini API Key
   - Pinecone API Key, Cloud, Region, and Index Name

## Deploying the Backend to Render

### Method 1: Using Render Dashboard (Manual Deployment)

1. Push your code to a Git repository
2. Log in to Render Dashboard
3. Click "New+" and select "Web Service"
4. Connect your Git repository
5. Configure the service:
   - Name: `rag-chatbot-backend`
   - Environment: Node
   - Region: Choose the region closest to your users
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
6. Add environment variables:
   - `GEMINI_API_KEY` = your Google Gemini API key
   - `PINECONE_API_KEY` = your Pinecone API key
   - `PINECONE_CLOUD` = your Pinecone cloud provider (e.g., `aws`)
   - `PINECONE_REGION` = your Pinecone region (e.g., `us-west-2`)
   - `PINECONE_INDEX` = your Pinecone index name
   - `NODE_ENV` = `production`
7. Click "Create Web Service"

### Method 2: Using render.yaml (Automatic Deployment)

1. Ensure your `render.yaml` file is in the root of your repository:
   ```yaml
   services:
     - type: web
       name: rag-chatbot-backend
       env: node
       buildCommand: npm install && npm run build
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: GEMINI_API_KEY
           sync: false
         - key: PINECONE_API_KEY
           sync: false
         - key: PINECONE_CLOUD
           sync: false
         - key: PINECONE_REGION
           sync: false
         - key: PINECONE_INDEX
           sync: false
   ```
2. Connect your Git repository to Render
3. Render will automatically detect the `render.yaml` file and configure the service accordingly
4. Add your environment variables in the Render dashboard after the service is created

Render will provide you with a URL for your backend (e.g., `https://rag-chatbot-backend.onrender.com`).

## Deploying the Frontend to Vercel

### Method 1: Using Vercel Dashboard

1. Create a new repository with only the frontend code (or use the same repository)
2. Log in to Vercel Dashboard
3. Click "New Project"
4. Import your Git repository
5. Configure the project:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
6. Add environment variables:
   - `VITE_BACKEND_URL` = your Render backend URL (e.g., `https://rag-chatbot-backend.onrender.com`)
   - Ensure there is no trailing slash in the URL
7. Deploy!

### Method 2: Using vercel.json Configuration

Ensure your `vercel.json` file is in the root of your repository:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/dist/$1"
    }
  ]
}
```

## Environment Variables Reference

### Backend Environment Variables (Render)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API Key | Yes | `AIzaSyB123456789...` |
| `PINECONE_API_KEY` | Pinecone API Key | Yes | `abc123xyz...` |
| `PINECONE_CLOUD` | Pinecone Cloud Provider | Yes | `aws` |
| `PINECONE_REGION` | Pinecone Region | Yes | `us-west-2` |
| `PINECONE_INDEX` | Pinecone Index Name | Yes | `rag-chatbot-index` |
| `NODE_ENV` | Environment Mode | Yes | `production` |
| `PORT` | Server Port (Optional) | No | `5000` |

### Frontend Environment Variables (Vercel)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_BACKEND_URL` | Render Backend URL | Yes | `https://rag-chatbot-backend.onrender.com` |

## Build Process Explanation

### Backend Build Process

The backend build process involves two steps:

1. **Frontend Build**: `vite build` - Builds the React frontend into static files
2. **Server Build**: `npm run build:server` - Bundles the Express server using esbuild

The combined build command `npm run build` executes both steps:
```bash
"build": "vite build && npm run build:server"
```

The server build uses esbuild for fast bundling:
```bash
"build:server": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```

### Start Command

The start command runs the bundled server:
```bash
"start": "cross-env NODE_ENV=production node dist/index.js"
```

## Local Development

1. Create a `.env.local` file based on `.env.local.example`:
   ```
   VITE_BACKEND_URL=
   GEMINI_API_KEY=your_google_gemini_api_key
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_CLOUD=your_pinecone_cloud
   PINECONE_REGION=your_pinecone_region
   PINECONE_INDEX=your_pinecone_index_name
   ```
2. For local development, keep `VITE_BACKEND_URL` empty to use relative paths
3. Run `npm run dev` to start the development server

## Troubleshooting

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| **404 errors on API calls** | Check that `VITE_BACKEND_URL` is correctly set in Vercel environment variables without trailing slashes |
| **CORS errors** | Ensure CORS headers are properly configured in the backend |
| **PDF upload fails** | Verify file size limits and MIME type filtering in the backend |
| **Build failures on Render** | Ensure `npm run build` command is correctly specified in build settings |
| **Application not starting on Render** | Verify `npm start` command and check logs in Render dashboard |

### Checking Logs

1. **Render Logs**:
   - Go to your Render dashboard
   - Select your service
   - Click on "Logs" tab to view real-time logs

2. **Vercel Logs**:
   - Go to your Vercel dashboard
   - Select your project
   - Click on "Logs" tab to view deployment and runtime logs

## Notes

- The frontend will make API calls to the backend URL specified in `VITE_BACKEND_URL`
- In local development, API calls will be made to relative paths (handled by the same server)
- In production, API calls will be made to your Render backend URL
- Render automatically provides SSL for your backend
- Vercel automatically provides SSL for your frontend
- The application uses a combined build process that generates both frontend static files and a bundled backend server
- Ensure your Pinecone index is created before deploying the backend