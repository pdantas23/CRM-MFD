import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  // Nome da aplicação configurável (genérico por padrão). O nome real da conta
  // ativa aparece na sidebar; aqui fica o rótulo da aba, pré-seleção de conta.
  title: process.env.APP_NAME ?? "CRM",
  description: "Sistema de gestão",
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
