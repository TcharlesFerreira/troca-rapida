/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  // Importação de cadastros manda a planilha inteira (até 4 MB de texto) numa ação do servidor.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
