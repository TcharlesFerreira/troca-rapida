import type { Metadata } from "next";
import Link from "next/link";
import { entrarDemonstracaoAction } from "@/acoes/auth";
import { FormLogin } from "@/components/form-login";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  const demonstracao = process.env.DEMO_PUBLICA === "true";
  return (
    <>
      <h1 className="text-3xl font-semibold">Entrar</h1>
      <p className="mb-6 mt-1 text-muted-foreground">Oficina e clientes entram por aqui.</p>
      {demonstracao && (
        <div className="mb-6 grid gap-3 rounded-lg border-2 border-accent bg-card p-4">
          <p className="font-semibold">Quer conhecer o sistema?</p>
          <p className="text-sm text-muted-foreground">Entre na oficina de demonstração: clientes e carros fictícios, que voltam ao original todo dia.</p>
          {demo === "indisponivel" && <Alert variant="aviso">A demonstração está indisponível agora. Tente de novo em alguns minutos.</Alert>}
          <form action={entrarDemonstracaoAction}>
            <Button type="submit" variant="secondary" className="w-full">
              Entrar na demonstração
            </Button>
          </form>
        </div>
      )}
      <FormLogin />
      <p className="mt-6 text-sm">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-primary underline underline-offset-4">
          Criar conta de cliente
        </Link>
      </p>
    </>
  );
}
