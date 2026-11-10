import { ImagePlus } from "lucide-react";
import { useLab } from "../../stores/lab";
export default function ImportAssets() {
  return (
    <label className="asset-import" title="Importar imágenes locales">
      <ImagePlus size={13} />
      Importar imagen
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        multiple
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          for (const file of files) {
            try {
              if (file.size > 8 * 1024 * 1024)
                throw Error("La imagen excede 8 MB");
              if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type))
                throw Error("Formato no admitido");
              const content = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              const path =
                "assets/" + file.name.replace(/[^\p{L}\p{N}._-]/gu, "-");
              if (useLab.getState().project.files.some((f) => f.path === path))
                throw Error("Ya existe " + path);
              useLab.getState().update((p) => p.files.push({ path, content }));
              useLab.getState().log("info", "Imagen importada: " + path);
            } catch (error) {
              useLab.getState().log("error", String(error));
            }
          }
          e.target.value = "";
        }}
      />
    </label>
  );
}
