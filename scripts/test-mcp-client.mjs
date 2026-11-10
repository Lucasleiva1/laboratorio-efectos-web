import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { connectNative } from "./connect-native.mjs";
import { expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const app = express();
app.use(express.json());
app.post("/mcp", async (req, res) => {
  const server = new McpServer({
    name: "effectlab-echo-test",
    version: "0.1.0",
  });
  server.registerTool(
    "echo_test",
    {
      description: "Devuelve el texto de prueba sin efectos externos.",
      inputSchema: { text: z.string() },
    },
    async ({ text }) => ({ content: [{ type: "text", text }] }),
  );
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
const http = await new Promise((r) => {
  const listener = app.listen(0, "127.0.0.1", () => r(listener));
});
const native = await connectNative();
const page = native
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().includes("1420"));
try {
  await page.getByRole("button", { name: "MCP", exact: true }).click();
  await page
    .getByRole("button", { name: "Conexiones externas", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "URL MCP externa" })
    .fill(`http://127.0.0.1:${http.address().port}/mcp`);
  await page
    .getByRole("button", { name: "Conectar y descubrir", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(
    page
      .getByRole("combobox", { name: "Herramienta MCP externa" })
      .locator("option"),
  ).toHaveCount(2, { timeout: 30000 });
  await page
    .getByRole("combobox", { name: "Herramienta MCP externa" })
    .selectOption("echo_test");
  await page
    .getByRole("textbox", { name: "Argumentos MCP externos" })
    .fill(JSON.stringify({ text: "hola effect-lab" }));
  await page
    .getByRole("button", {
      name: "Ejecutar herramienta autorizada",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.locator(".mcp-result")).toContainText("hola effect-lab");
  await page.getByRole("button", { name: "Desconectar", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Herramienta MCP externa" }),
  ).toHaveCount(0);
  const rejected = await page.evaluate(async () => {
    try {
      await window.__TAURI_INTERNALS__.invoke("mcp_client_connect", {
        url: "http://example.com/mcp",
      });
      return false;
    } catch {
      return true;
    }
  });
  if (!rejected) throw Error("Se aceptó HTTP no local");
  await writeFile(
    ".local/mcp-client-results.json",
    JSON.stringify(
      {
        handshake: true,
        toolsListed: true,
        authorizedEcho: true,
        disconnect: true,
        nonLocalHttpRejected: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "MCP CLIENT PASS: handshake, tools/list, echo autorizado, desconexión y rechazo HTTP no local",
  );
  await page.getByRole("button", { name: "Cerrar conexiones MCP" }).click();
} finally {
  await native.close();
  http.close();
}
