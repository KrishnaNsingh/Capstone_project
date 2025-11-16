import { z } from "zod";

// Document schema
export const documentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  pageCount: z.number(),
  uploadedAt: z.date(),
  fullText: z.string(),
});

export const insertDocumentSchema = documentSchema.omit({ id: true, uploadedAt: true });

export type Document = z.infer<typeof documentSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// Context snippet schema
export const contextSnippetSchema = z.object({
  text: z.string(),
  pageNumber: z.number().optional(),
  score: z.number().optional(),
});

export type ContextSnippet = z.infer<typeof contextSnippetSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.date(),
  snippets: z.array(contextSnippetSchema).optional(),
});

export const insertMessageSchema = messageSchema.omit({ id: true, timestamp: true });

export type Message = z.infer<typeof messageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Upload request schema
export const uploadPDFSchema = z.object({
  filename: z.string(),
  pageCount: z.number(),
  fullText: z.string(),
});

// Chat request schema
export const chatRequestSchema = z.object({
  documentId: z.string(),
  question: z.string(),
});

export type UploadPDFRequest = z.infer<typeof uploadPDFSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
