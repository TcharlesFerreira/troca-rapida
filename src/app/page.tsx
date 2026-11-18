import { redirect } from "next/navigation";
import { obterAtor } from "@/lib/sessao";

/** Cada pessoa cai na sua área. */
export default async function Inicio() {
  const ator = await obterAtor();
  if (!ator) redirect("/login");
  redirect(ator.papel === "ADMIN" ? "/admin" : "/minha-area");
}
