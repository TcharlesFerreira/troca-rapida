import { db } from "@/lib/db";
import { criarAreaCliente } from "./area-cliente";

/** Área do cliente ligada ao banco de verdade (as telas usam esta). */
export const areaCliente = criarAreaCliente(db);
