/** Erro esperado, com mensagem segura para mostrar ao usuário. */
export class ErroDeNegocio extends Error {
  constructor(
    mensagem: string,
    public readonly campo?: string,
  ) {
    super(mensagem);
    this.name = "ErroDeNegocio";
  }
}

/** Alguém tentou acessar algo que não é dele. */
export class ErroPermissao extends Error {
  constructor(mensagem = "Você não tem permissão para acessar isto.") {
    super(mensagem);
    this.name = "ErroPermissao";
  }
}
