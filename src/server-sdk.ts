import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import { loadPoniesFromFile } from "./lib/ponies.js";
import { buildMany, buildPassword } from "./lib/password.js";

const server = new McpServer({ name: "pony-sdk", version: "0.1.0" });

server.registerTool(
  "pony_password",
  {
    title: "Ein Passwort generieren",
    description: "Baut ein Passwort aus My-Little-Pony-Charakternamen.",
    inputSchema: {
      minLength: z.number().int().min(1).default(16),
      special: z.boolean().default(false),
    },
    outputSchema: { result: z.string() },
  },
  ({ minLength, special }) => {
    const ponies = loadPoniesFromFile();
    const output = buildPassword({ minLength, special }, ponies);
    return {
      content: [{ type: "text", text: output }],
      structuredContent: { result: output },
    };
  }
);

server.registerTool(
  "pony_password_batch",
  {
    title: "Mehrere Passwörter generieren",
    description: "Generiert N Passwörter mit denselben Optionen.",
    inputSchema: {
      count: z.number().int().min(1).max(50).default(5),
      minLength: z.number().int().min(1).default(16),
      special: z.boolean().default(false),
    },
    outputSchema: { result: z.array(z.string()) }
  },
  ({ count, minLength, special }) => {
    const ponies = loadPoniesFromFile();   
    const pwds = buildMany(count, { minLength, special }, ponies);
    return { 
        content: [{ type: "text", text: JSON.stringify(pwds) }], 
        structuredContent: { result: pwds } 
    };
  }
);

const transport = new StdioServerTransport();
server.connect(transport);
