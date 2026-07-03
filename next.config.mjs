/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  experimental: {
    // Router Cache do cliente: por padrão o Next 14.2 reutiliza o RSC de páginas
    // dinâmicas por ~30s ao navegar (voltar para /pedidos mostrava a situação
    // antiga mesmo com o banco já atualizado). dynamic:0 força refetch a cada
    // navegação — a tela sempre reflete o estado atual após mover um card.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
