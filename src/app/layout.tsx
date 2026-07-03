import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  // O nome real da conta ativa aparece na sidebar; aqui fica o rótulo da aba e o
  // título usado no preview de links (redes sociais). Ícone/OG vêm dos arquivos
  // icon.png / opengraph-image.png / twitter-image.png neste diretório.
  title: "Sistema interno Modular",
  description: "Sistema interno Modular",
  openGraph: {
    title: "Sistema interno Modular",
    description: "Sistema interno Modular",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
