-- Ajusta o nome do índice (o Postgres corta nomes com mais de 63 caracteres).
ALTER INDEX "filtros_aplicacao_fabricante_marca_modelo_motor_anoInicial_a_ke" RENAME TO "filtros_aplicacao_fabricante_marca_modelo_motor_anoInicial__key";
