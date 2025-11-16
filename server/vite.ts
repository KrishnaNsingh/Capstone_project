import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config.js";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.get("*", async (req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith("/api/")) {
      return next();
    }
    
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Determine the correct path for static files in different environments
  const possiblePaths = [
    path.resolve(import.meta.dirname, "..", "dist"), // Standard build output
    path.resolve(import.meta.dirname, "..", "dist", "client"), // Render output
    path.resolve(import.meta.dirname, "..", "public"), // Vercel output
    path.resolve(import.meta.dirname, "public"), // Local development
  ];

  let distPath = "";
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      distPath = possiblePath;
      break;
    }
  }

  if (!distPath) {
    throw new Error(
      `Could not find the build directory. Checked paths: ${possiblePaths.join(", ")}. Make sure to build the client first.`,
    );
  }

  console.log(`Serving static files from: ${distPath}`);
  
  // Serve static files with a specific order
  app.use(express.static(distPath, {
    index: false // Don't automatically serve index.html
  }));

  // For API routes, let them pass through to the route handlers
  // For all other routes, serve index.html
  app.get("*", (req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith("/api/")) {
      return next();
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}