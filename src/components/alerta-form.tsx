import { Alert } from "@/components/ui/alert";
import type { EstadoForm } from "@/lib/formulario";

export function AlertaForm({ estado }: { estado: EstadoForm }) {
  return (
    <>
      {estado.erro && <Alert variant="erro">{estado.erro}</Alert>}
      {estado.ok && estado.mensagem && <Alert variant="sucesso">{estado.mensagem}</Alert>}
      {estado.aviso && <Alert variant="aviso">{estado.aviso}</Alert>}
    </>
  );
}
