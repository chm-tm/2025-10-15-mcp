// STDIN: Input vom MCP Server
// STDOUT: Output an den MCP Server
import * as readline from "node:readline";
import { loadPoniesFromFile } from "./lib/ponies.js";
import { buildPassword } from "./lib/password.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});
const send = (obj: JR) => process.stdout.write(JSON.stringify(obj) + "\n");

// Basis-Datentyp für Json RPC messages
type JR = {
  jsonrpc: "2.0";
  id?: number | string | null;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
};

function handleInitialize(id: JR["id"]) {
  const result = {
    protocolVersion: "2024-11-05",
    serverInfo: { name: "pony-no-sdk", version: "0.1.0" },
    capabilities: {
      tools: { listChanged: true },
      prompts: { listChanged: true },
    },
  };
  send({ jsonrpc: "2.0", id, result });
}

function handleToolsList(id: JR["id"]) {
  const result = {
    tools: [
      {
        name: "pony_password",
        description: "Generiert ein Passwort aus My-Little-Pony-Charakternamen.",
        inputSchema: {
          type: "object",
          properties: {
            minLength: { type: "number", minimum: 1, default: 16 },
            special: { type: "boolean", default: false }
          },
          additionalProperties: false
        }
      }
    ]
  };
  send({ jsonrpc: "2.0", id, result });
}

function handleToolsCall(id: JR["id"], params: any) {
  const { name, arguments: args } = params ?? {};
  if (name !== "pony_password") {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: "Unknown tool" } });
    return;
  }
  const minLength = Number(args?.minLength ?? 16);
  const special = Boolean(args?.special ?? false);
  const ponies = loadPoniesFromFile();
  const pwd = buildPassword({ minLength, special }, ponies);
  send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: pwd }] } });
}

rl.on("line", (line) => {
  // Line = Json RPC Request vom MCP Client
  if (!line.trim()) return;

  let msg: JR;
  try {
    msg = JSON.parse(line) as JR;
  } catch (e) {
    return send({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error" },
    });
  }

  switch (msg.method) {
    case "initialize":
      handleInitialize(msg.id);
      break;
    case "tools/list":
      handleToolsList(msg.id);
      break;
    case "tools/call":
      handleToolsCall(msg.id, msg.params);
      break;
    default:
      send({
        jsonrpc: "2.0",
        id: msg.id ?? null,
        error: { code: -32601, message: `Unsupported method: ${msg.method}` },
      });
      break;
  }
});
