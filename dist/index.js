// server/index.ts
import dotenv from "dotenv";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import multer from "multer";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  documents;
  messages;
  constructor() {
    this.documents = /* @__PURE__ */ new Map();
    this.messages = /* @__PURE__ */ new Map();
  }
  // Document methods
  async createDocument(insertDoc) {
    const id = randomUUID();
    const document = {
      ...insertDoc,
      id,
      uploadedAt: /* @__PURE__ */ new Date()
    };
    this.documents.set(id, document);
    return document;
  }
  async getDocument(id) {
    return this.documents.get(id);
  }
  async getAllDocuments() {
    return Array.from(this.documents.values());
  }
  async deleteDocument(id) {
    this.documents.delete(id);
    await this.deleteMessagesByDocumentId(id);
  }
  // Message methods
  async createMessage(insertMessage) {
    const id = randomUUID();
    const message = {
      ...insertMessage,
      id,
      timestamp: /* @__PURE__ */ new Date()
    };
    this.messages.set(id, message);
    return message;
  }
  async getMessagesByDocumentId(documentId) {
    return Array.from(this.messages.values()).filter((msg) => msg.documentId === documentId).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  async deleteMessagesByDocumentId(documentId) {
    const messagesToDelete = Array.from(this.messages.entries()).filter(([_, msg]) => msg.documentId === documentId).map(([id]) => id);
    messagesToDelete.forEach((id) => this.messages.delete(id));
  }
};
var storage = new MemStorage();

// server/lib/pdf-processor.ts
import { PDFParse } from "pdf-parse";
var PDFProcessor = class {
  chunkSize;
  chunkOverlap;
  constructor(chunkSize = 1e3, chunkOverlap = 200) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }
  async extractText(buffer) {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return {
      text: result.text,
      pageCount: result.total
    };
  }
  chunkText(text) {
    const chunks = [];
    let startIndex = 0;
    let chunkIndex = 0;
    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + this.chunkSize, text.length);
      const chunk = text.slice(startIndex, endIndex);
      if (chunk.trim().length > 0) {
        chunks.push({
          text: chunk.trim(),
          chunkIndex: chunkIndex++
        });
      }
      startIndex += this.chunkSize - this.chunkOverlap;
    }
    return chunks;
  }
  async processFile(buffer) {
    const { text, pageCount } = await this.extractText(buffer);
    const chunks = this.chunkText(text);
    return {
      text,
      pageCount,
      chunks
    };
  }
};
var pdfProcessor = new PDFProcessor();

// server/lib/gemini-service.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
var API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not set");
}
var genAI = new GoogleGenerativeAI(API_KEY);
var GeminiService = class {
  embeddingModel;
  generativeModel;
  constructor() {
    this.embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const modelName = process.env.GOOGLE_MODEL || "gemini-2.0-flash-exp";
    this.generativeModel = genAI.getGenerativeModel({ model: modelName });
  }
  async generateEmbedding(text) {
    const result = await this.embeddingModel.embedContent(text);
    return result.embedding.values;
  }
  async generateEmbeddings(texts) {
    const embeddings = await Promise.all(
      texts.map((text) => this.generateEmbedding(text))
    );
    return embeddings;
  }
  async generateAnswer(question, context) {
    const prompt = `You are a helpful AI assistant answering questions based on the provided document context.

Context from the document:
${context}

Question: ${question}

Please provide a clear and accurate answer based solely on the context provided. If the context doesn't contain enough information to answer the question, say so.

Answer:`;
    const result = await this.generativeModel.generateContent(prompt);
    const response = result.response;
    return response.text();
  }
};
var geminiService = new GeminiService();

// server/lib/pinecone-service.ts
import { Pinecone } from "@pinecone-database/pinecone";
var API_KEY2 = process.env.PINECONE_API_KEY || "";
var INDEX_NAME = process.env.PINECONE_INDEX || "demovercel1";
if (!API_KEY2) {
  throw new Error("PINECONE_API_KEY is not set");
}
var PineconeService = class {
  pinecone;
  indexName;
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: API_KEY2
    });
    this.indexName = INDEX_NAME;
  }
  async upsertEmbeddings(documentId, chunks, embeddings) {
    const index = this.pinecone.index(this.indexName);
    const vectors = chunks.map((chunk, i) => {
      const metadata = {
        documentId,
        text: chunk.text,
        chunkIndex: chunk.chunkIndex
      };
      if (chunk.pageNumber !== void 0) {
        metadata.pageNumber = chunk.pageNumber;
      }
      return {
        id: `${documentId}-chunk-${i}`,
        values: embeddings[i],
        metadata
      };
    });
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }
  }
  async searchSimilar(documentId, queryEmbedding, topK = 5) {
    const index = this.pinecone.index(this.indexName);
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      filter: { documentId: { $eq: documentId } },
      includeMetadata: true
    });
    return (queryResponse.matches || []).map((match) => ({
      text: match.metadata?.text || "",
      score: match.score || 0,
      pageNumber: match.metadata?.pageNumber
    }));
  }
  async deleteDocumentVectors(documentId) {
    const index = this.pinecone.index(this.indexName);
    const prefix = `${documentId}-chunk-`;
    const listResponse = await index.listPaginated({ prefix });
    const vectorIds = listResponse.vectors?.map((v) => v.id) || [];
    if (vectorIds.length > 0) {
      await index.deleteMany(vectorIds);
    }
  }
};
var pineconeService = new PineconeService();

// server/lib/rag-service.ts
var RAGService = class {
  async processDocument(buffer, filename) {
    const { text, pageCount, chunks } = await pdfProcessor.processFile(buffer);
    const document = await storage.createDocument({
      filename,
      pageCount,
      fullText: text
    });
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await geminiService.generateEmbeddings(chunkTexts);
    await pineconeService.upsertEmbeddings(document.id, chunks, embeddings);
    return {
      documentId: document.id,
      pageCount
    };
  }
  async answerQuestion(documentId, question) {
    const document = await storage.getDocument(documentId);
    if (!document) {
      throw new Error("Document not found");
    }
    const questionEmbedding = await geminiService.generateEmbedding(question);
    const searchResults = await pineconeService.searchSimilar(documentId, questionEmbedding, 5);
    const context = searchResults.map((result) => result.text).join("\n\n");
    const answer = await geminiService.generateAnswer(question, context);
    const snippets = searchResults.map((result) => ({
      text: result.text,
      score: result.score,
      pageNumber: result.pageNumber
    }));
    return {
      answer,
      snippets
    };
  }
  async deleteDocument(documentId) {
    await pineconeService.deleteDocumentVectors(documentId);
    await storage.deleteDocument(documentId);
  }
};
var ragService = new RAGService();

// shared/schema.ts
import { z } from "zod";
var documentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  pageCount: z.number(),
  uploadedAt: z.date(),
  fullText: z.string()
});
var insertDocumentSchema = documentSchema.omit({ id: true, uploadedAt: true });
var contextSnippetSchema = z.object({
  text: z.string(),
  pageNumber: z.number().optional(),
  score: z.number().optional()
});
var messageSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.date(),
  snippets: z.array(contextSnippetSchema).optional()
});
var insertMessageSchema = messageSchema.omit({ id: true, timestamp: true });
var uploadPDFSchema = z.object({
  filename: z.string(),
  pageCount: z.number(),
  fullText: z.string()
});
var chatRequestSchema = z.object({
  documentId: z.string(),
  question: z.string()
});

// server/routes.ts
var addCORSHeaders = (req, res, next) => {
  const origin = process.env.NODE_ENV === "production" ? req.get("Origin") || "*" : "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
};
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});
async function registerRoutes(app2) {
  app2.use(addCORSHeaders);
  app2.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });
  app2.get("/", (_req, res) => {
    res.status(200).json({
      message: "RAG Chatbot API Server is running",
      status: "ok"
    });
  });
  app2.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const { documentId, pageCount } = await ragService.processDocument(
        req.file.buffer,
        req.file.originalname
      );
      const document = await storage.getDocument(documentId);
      res.json({
        id: document.id,
        filename: document.filename,
        pageCount,
        uploadedAt: document.uploadedAt
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        error: "Failed to process PDF",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/chat", async (req, res) => {
    try {
      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error });
      }
      const { documentId, question } = parsed.data;
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      const { answer, snippets } = await ragService.answerQuestion(documentId, question);
      const userMessage = await storage.createMessage({
        documentId,
        role: "user",
        content: question
      });
      const assistantMessage = await storage.createMessage({
        documentId,
        role: "assistant",
        content: answer,
        snippets
      });
      res.json({
        userMessage: {
          id: userMessage.id,
          role: userMessage.role,
          content: userMessage.content,
          timestamp: userMessage.timestamp
        },
        assistantMessage: {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          timestamp: assistantMessage.timestamp,
          snippets: assistantMessage.snippets
        }
      });
    } catch (error) {
      console.error("Chat error:", error);
      const message = error instanceof Error ? error.message : "Failed to process question";
      const statusCode = message === "Document not found" ? 404 : 500;
      res.status(statusCode).json({
        error: message,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/documents", async (_req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents.map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        pageCount: doc.pageCount,
        uploadedAt: doc.uploadedAt
      })));
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({
        error: "Failed to fetch documents",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json({
        id: document.id,
        filename: document.filename,
        pageCount: document.pageCount,
        uploadedAt: document.uploadedAt
      });
    } catch (error) {
      console.error("Get document error:", error);
      res.status(500).json({
        error: "Failed to fetch document",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.delete("/api/documents/:id", async (req, res) => {
    try {
      await ragService.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({
        error: "Failed to delete document",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/messages/:documentId", async (req, res) => {
    try {
      const messages = await storage.getMessagesByDocumentId(req.params.documentId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({
        error: "Failed to fetch messages",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.delete("/api/messages/:documentId", async (req, res) => {
    try {
      await storage.deleteMessagesByDocumentId(req.params.documentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete messages error:", error);
      res.status(500).json({
        error: "Failed to delete messages",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  },
  // Add base configuration for Vercel
  base: process.env.VERCEL ? "./" : "/"
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.get("*", async (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const possiblePaths = [
    path2.resolve(import.meta.dirname, "..", "dist"),
    // Standard build output
    path2.resolve(import.meta.dirname, "..", "dist", "client"),
    // Render output
    path2.resolve(import.meta.dirname, "..", "public"),
    // Vercel output
    path2.resolve(import.meta.dirname, "public")
    // Local development
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
      `Could not find the build directory. Checked paths: ${possiblePaths.join(", ")}. Make sure to build the client first.`
    );
  }
  console.log(`Serving static files from: ${distPath}`);
  app2.use(express.static(distPath, {
    index: false
    // Don't automatically serve index.html
  }));
  app2.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
dotenv.config();
var app = express2();
app.use((req, res, next) => {
  const origin = process.env.NODE_ENV === "production" ? req.get("Origin") || "*" : "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  next();
});
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
var cachedServer = null;
async function createServer2() {
  if (!cachedServer) {
    const server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Application error:", err);
      res.status(status).json({ message });
    });
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    cachedServer = Promise.resolve(server);
  }
  return cachedServer;
}
async function handler(req, res) {
  try {
    const server = await createServer2();
    return app(req, res);
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
if (process.env.NODE_ENV === "production") {
  (async () => {
    try {
      console.log("Starting server in production mode...");
      log("Starting server in production mode...");
      const requiredEnvVars = [
        "GEMINI_API_KEY",
        "PINECONE_API_KEY",
        "PINECONE_INDEX"
      ];
      const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
      if (missingEnvVars.length > 0) {
        const errorMsg = `Missing required environment variables: ${missingEnvVars.join(", ")}`;
        console.error(errorMsg);
        log(errorMsg);
        process.exit(1);
      }
      console.log("All required environment variables are present");
      log("All required environment variables are present");
      const server = await createServer2();
      const port = parseInt(process.env.PORT || "5000", 10);
      console.log(`Attempting to start server on port ${port}`);
      log(`Attempting to start server on port ${port}`);
      console.log(`PORT environment variable: ${process.env.PORT}`);
      log(`PORT environment variable: ${process.env.PORT}`);
      server.listen({
        port,
        // Use "0.0.0.0" for better compatibility across environments
        host: "0.0.0.0"
      }, () => {
        log(`Server listening on port ${port}`);
        console.log(`Server listening on port ${port}`);
      });
      server.on("error", (err) => {
        console.error("Server error:", err);
        log(`Server error: ${err.message}`);
      });
    } catch (error) {
      console.error("Failed to start server:", error);
      log(`Failed to start server: ${error instanceof Error ? error.message : "Unknown error"}`);
      process.exit(1);
    }
  })();
}
if (process.env.NODE_ENV === "development") {
  (async () => {
    const server = await createServer2();
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen({
      port,
      // Use "0.0.0.0" for better compatibility across environments
      host: "0.0.0.0"
    }, () => {
      log(`serving on port ${port}`);
    });
  })();
}
export {
  handler as default
};
