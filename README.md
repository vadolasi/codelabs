# Codelabs

IDE Online completa com colaboração em tempo real voltada para salas de aula.

## Executando em ambiente de desenvolvimento

É necessário instalar o [Bun](https://bun.com).

Crie um arquivo `.env` copiando o conteúdo de [`.env.example`](./.env.example) e substituindo os valores. É necessário ter uma conta no [Resend](https://resend.com/) (É possível usar o serviço gratuitamente).

Antes de rodar o servidor, é necessário executar esses comandos:

```bash
bun i # Instala as depêndencias
bun database:migrate # Executa as migrações no banco de dados
```

Bara executar o servidor de desenvolvimento, basta executar o comando abaixo, o servidor será acessível em http://localhost:5173.

```bash
bun dev
```

Se precisar acessar o banco de dados (tornar um usuário administrador, etc), basta executar o comando abaixo, e acessar https://local.drizzle.studio.

```bash
bun database:studio
```

## Deploy em produção

O arquivo [`Dockerfile`](./Dockerfile) contém a implementação de um servidor para produção.
