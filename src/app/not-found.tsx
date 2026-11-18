import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço não existe ou você não tem acesso a ele.</p>
      <Link href="/" className="font-medium text-primary underline underline-offset-4">
        Voltar ao início
      </Link>
    </main>
  );
}
