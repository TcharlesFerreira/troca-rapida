import type { Metadata } from "next";
import Link from "next/link";
import { FormCadastro } from "@/components/form-cadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Criar conta</h1>
      <p className="mb-6 mt-1 text-muted-foreground">Para acompanhar seus serviços e o histórico dos seus veículos.</p>
      <FormCadastro />
      <p className="mt-6 text-sm">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-primary underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </>
  );
}
