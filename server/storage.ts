import { type Document, type InsertDocument, type Message, type InsertMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Document methods
  createDocument(doc: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  deleteDocument(id: string): Promise<void>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByDocumentId(documentId: string): Promise<Message[]>;
  deleteMessagesByDocumentId(documentId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private documents: Map<string, Document>;
  private messages: Map<string, Message>;

  constructor() {
    this.documents = new Map();
    this.messages = new Map();
  }

  // Document methods
  async createDocument(insertDoc: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDoc,
      id,
      uploadedAt: new Date(),
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
    await this.deleteMessagesByDocumentId(id);
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesByDocumentId(documentId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((msg) => msg.documentId === documentId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async deleteMessagesByDocumentId(documentId: string): Promise<void> {
    const messagesToDelete = Array.from(this.messages.entries())
      .filter(([_, msg]) => msg.documentId === documentId)
      .map(([id]) => id);
    
    messagesToDelete.forEach((id) => this.messages.delete(id));
  }
}

export const storage = new MemStorage();
