import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { expect } from "@playwright/test";
import { connectNative } from "./connect-native.mjs";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
const native = await connectNative();
const page = native
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().includes("1420"));
await page.reload();
await page.getByRole("button", { name: "MCP", exact: true }).click();
await expect(page.locator(".mcp-modal code")).toContainText(
  "effectlab-mcp.exe",
);
if (
  !(await page
    .getByRole("checkbox", { name: "Habilitar servidor MCP" })
    .isChecked())
)
  await page.getByRole("checkbox", { name: "Habilitar servidor MCP" }).click();
await expect(page.getByText("Disponible · puente local activo")).toBeVisible();
await page.getByRole("button", { name: "Cerrar conexiones MCP" }).click();
const client = new Client({ name: "effectlab-qa", version: "0.1.0" });
const transport = new StdioClientTransport({
  command: "cargo.exe",
  args: [
    "run",
    "--quiet",
    "--manifest-path",
    resolve("src-tauri/Cargo.toml"),
    "--bin",
    "effectlab-mcp",
  ],
  stderr: "pipe",
});
const diagnostics = [];
transport.stderr?.on("data", (b) => diagnostics.push(b.toString()));
await client.connect(transport);
const report = [];
function data(result) {
  if (result.isError) throw Error(JSON.stringify(result.content));
  return JSON.parse(result.content[0].text).data;
}
try {
  const list = await client.listTools();
  console.log("TOOLS:", list.tools.length);
  if (list.tools.length !== 22)
    throw Error("Cantidad de herramientas inesperada");
  const statusRequest = client.callTool({
    name: "effectlab_status",
    arguments: {},
  });
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  const status = data(await statusRequest);
  console.log("STATUS:", status);
  report.push({
    check: "Handshake, tools/list y status",
    pass: true,
    tools: list.tools.length,
  });
  const projectId = status.projectId;
  const before = data(
    await client.callTool({ name: "get_project", arguments: { projectId } }),
  );
  const path =
    before.project.files.find((f) => /\.[jt]sx?$/.test(f.path))?.path ??
    before.project.entry;
  const original = before.project.files.find((f) => f.path === path).content;
  const changed = original + "\n// Cambio MCP verificado\n";
  const request = client.callTool(
    {
      name: "write_project_file",
      arguments: {
        projectId,
        expectedRevision: before.revision,
        path,
        content: changed,
      },
    },
    undefined,
    { timeout: 120000 },
  );
  await page
    .getByRole("button", { name: "Aceptar cambios", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Aceptar cambios", exact: true })
    .click();
  data(await request);
  const file = data(
    await client.callTool({
      name: "read_project_file",
      arguments: { projectId, path },
    }),
  );
  if (file.content !== changed) throw Error("No se aplicó el archivo");
  report.push({ check: "Escritura aprobada reflejada en editor", pass: true });
  const stale = await client.callTool({
    name: "write_project_file",
    arguments: {
      projectId,
      expectedRevision: before.revision,
      path,
      content: "NO",
    },
  });
  if (!stale.isError) throw Error("Se aceptó revisión obsoleta");
  const traversal = await client.callTool({
    name: "read_project_file",
    arguments: { projectId, path: "../secret" },
  });
  if (!traversal.isError) throw Error("Se aceptó traversal");
  report.push({ check: "Conflictos y traversal rechazados", pass: true });
  const current = data(
    await client.callTool({ name: "effectlab_status", arguments: {} }),
  );
  const deny = client.callTool({
    name: "write_project_file",
    arguments: {
      projectId,
      expectedRevision: current.revision,
      path,
      content: "NO",
    },
  });
  await page.getByRole("button", { name: "Rechazar", exact: true }).click();
  if (!(await deny).isError) throw Error("No se rechazó la escritura");
  report.push({ check: "Escritura rechazada conserva código", pass: true });
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  const restored = data(
    await client.callTool({
      name: "read_project_file",
      arguments: { projectId, path },
    }),
  );
  if (restored.content !== original)
    throw Error("No se pudo deshacer el cambio");
  report.push({ check: "Undo de cambios MCP", pass: true });
  await writeFile(
    ".local/mcp-results.json",
    JSON.stringify({ report, stderr: diagnostics }, null, 2),
  );
  console.log("MCP PASS:", report);
} finally {
  await client.close();
  await page.getByRole("button", { name: "MCP", exact: true }).click();
  await page.getByRole("checkbox", { name: "Habilitar servidor MCP" }).click();
  await expect(
    page.getByText("Detenido · sin acceso de agentes"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar conexiones MCP" }).click();
  await native.close();
}
