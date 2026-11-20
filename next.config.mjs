/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  // Importação de cadastros manda a planilha inteira (até 4 MB de texto) numa ação do servidor.
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    // Volta a uma aba visitada há menos de 30 s sem ir ao servidor. Salvar qualquer coisa
    // (revalidatePath em atualizarTelas) descarta essa cópia, então o que a oficina muda aparece na hora.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
