// Cifragem simétrica das credenciais VHSYS guardadas em `accounts` — SERVER-ONLY.
// AES-256-GCM com chave-mestra de 32 bytes (process.env.APP_MASTER_KEY, base64).
// Formato do campo cifrado: "iv_hex:authTag_hex:ciphertext_hex".

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // recomendado p/ GCM

function chaveMestra(): Buffer {
  const b64 = process.env.APP_MASTER_KEY;
  if (!b64) {
    throw new Error("APP_MASTER_KEY ausente no ambiente (necessária p/ cifrar credenciais)");
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error(
      `APP_MASTER_KEY inválida: esperado 32 bytes (base64), obtido ${key.length}. ` +
        "Gere com `openssl rand -base64 32`."
    );
  }
  return key;
}

/** Cifra um texto plano → "iv_hex:authTag_hex:ciphertext_hex". */
export function encrypt(texto: string): string {
  const key = chaveMestra();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/** Decifra "iv_hex:authTag_hex:ciphertext_hex" → texto plano. */
export function decrypt(cifrado: string): string {
  const partes = cifrado.split(":");
  if (partes.length !== 3) {
    throw new Error("Formato de credencial cifrada inválido (esperado iv:tag:ciphertext)");
  }
  const [ivHex, tagHex, dataHex] = partes;
  const key = chaveMestra();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const plano = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return plano.toString("utf8");
}
