import { examples } from "../features/projects/examples";

export interface ImportedImage {
  name: string;
  path: string;
  content: string;
}
export async function readImage(file: File): Promise<ImportedImage> {
  if (file.size > 16 * 1024 * 1024)
    throw Error("La imagen supera 16 MB. Elegí una versión más liviana.");
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const types: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    jfif: "image/jpeg",
    webp: "image/webp",
    svg: "image/svg+xml",
    gif: "image/gif",
    avif: "image/avif",
    bmp: "image/bmp",
    ico: "image/x-icon",
    apng: "image/apng",
  };
  const type = file.type.startsWith("image/") ? file.type : types[extension];
  if (!type)
    throw Error(
      "No se reconoce el formato de imagen. Usá PNG, JPG, WebP, SVG, GIF, AVIF o BMP.",
    );
  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(Error("No se pudo leer la imagen."));
    reader.readAsDataURL(new Blob([file], { type }));
  });
  const image = new Image();
  image.src = content;
  try {
    await image.decode();
  } catch {
    throw Error(
      "Esta imagen no se puede abrir. Probá una copia en PNG, JPG o WebP.",
    );
  }
  const name = file.name
    .replace(/[^\p{L}\p{N}._-]/gu, "-")
    .replace(/^\.+$/, "imagen");
  return {
    name: file.name,
    path: "assets/" + crypto.randomUUID().slice(0, 8) + "-" + name,
    content,
  };
}

export function imageEffect(image?: ImportedImage) {
  const template = examples.find((p) => p.id === "13-image-background");
  if (!template) throw Error("No se encuentra la imagen de prueba");
  const p = structuredClone(template);
  p.id = crypto.randomUUID();
  p.name = image ? "Imagen · " + image.name : "Imagen de prueba";
  if (image) {
    p.files = p.files.filter((f) => f.path !== "assets/background.svg");
    p.files.push({ path: image.path, content: image.content });
    p.files.find((f) => f.path === "main.js")!.content = p.files
      .find((f) => f.path === "main.js")!
      .content.replace(
        "'./assets/background.svg'",
        JSON.stringify("./" + image.path),
      );
  }
  for (const param of p.parameters)
    if (["positionX", "positionY"].includes(param.id))
      param.description =
        "Ajusta el encuadre cuando hay recorte o espacio libre. El zoom permite ampliar la imagen.";
  p.files.find((f) => f.path === "parameters.json")!.content = JSON.stringify(
    p.parameters,
    null,
    2,
  );
  return p;
}
