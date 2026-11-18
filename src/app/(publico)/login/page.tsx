import type { Metadata } from "next";
import Link from "next/link";
import { FormLogin } from "@/components/form-login";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaLogin() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Entrar</h1>
      <p className="mb-6 mt-1 text-muted-foreground">Oficina e clientes entram por aqui.</p>
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
