// Compressão de imagem NO NAVEGADOR antes do upload (economiza o storage):
// redimensiona para no máximo `maxLado` px no maior lado e grava em JPEG.
// Foto de celular de 3–5 MB costuma cair para ~150–400 KB.
// Sem "use server" — usa canvas, só roda no client.

export interface ImagemComprimida {
  blob: Blob;
  original: number;
  final: number;
}

async function decodificar(arquivo: File): Promise<CanvasImageSource & { width: number; height: number }> {
  // createImageBitmap respeita a orientação EXIF (foto "deitada" do celular).
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    } catch {
      // cai para <img> (ex.: navegador sem a opção de orientação)
    }
  }
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function comprimirImagem(
  arquivo: File,
  { maxLado = 1600, qualidade = 0.7 }: { maxLado?: number; qualidade?: number } = {}
): Promise<ImagemComprimida> {
  let img: CanvasImageSource & { width: number; height: number };
  try {
    img = await decodificar(arquivo);
  } catch {
    throw new Error(
      "Não foi possível ler esta imagem neste navegador (fotos HEIC do iPhone só abrem no Safari). Envie em JPG, PNG ou PDF."
    );
  }
  const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
  const largura = Math.max(1, Math.round(img.width * escala));
  const altura = Math.max(1, Math.round(img.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Falha ao comprimir a imagem.");
  ctx.fillStyle = "#fff"; // PNG com transparência vira fundo branco no JPEG
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(img, 0, 0, largura, altura);

  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualidade));
  if (!blob) throw new Error("Falha ao comprimir a imagem.");
  return { blob, original: arquivo.size, final: blob.size };
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
