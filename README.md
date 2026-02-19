# Codelabs

IDE Online completa com colaboração em tempo real voltada para salas de aula.

## Executando o Codelabs

O banco de dados é SQLite, portando, não é necessário configurar nenhum servidor de banco de dados.

### Variáveis de ambiente

Utilize [`.env.example`](./.env.example) como base. Criar um arquivo `.env` na raiz também é suportado.

- `RESEND_API_KEY` (opicional durante o desenvolvimento): Chave de API do Resend. É necessário ter uma conta no [Resend](https://resend.com/) (é possível usar o serviço gratuitamente).
- `MAIL_FROM` (opicional durante o desenvolvimento): Dominio pelo qual os emails serão enviados (ex: codelabs@vitordaniel.is-a.dev). Configure pelo Resend.
- `DOMAIN`: Dominio em que o servidor está sendo executado (ex: localhost, codelabs.vitordaniel.is-a.dev)
- `ADMIN_EMAIL` e `ADMIN_PASSWORD` (apenas para produção): Credenciais do usuário administrador que será criado automaticamente.

Ao executar em ambiente desenvolvimento, apenas defina `DOMAIN=localhost`.

### Executando em ambiente de desenvolvimento

É necessário instalar o [Bun](https://bun.com).

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

### Deploy em produção

O arquivo [`Dockerfile`](./Dockerfile) contém a implementação de um servidor para produção. Você pode realizar o deploy utilizando Docker ou compilando manualmente.

#### Utilizando Docker

1. Certifique-se de ter o Docker instalado.
2. Construa a imagem:
   ```bash
   docker build -t codelabs .
   ```
3. Execute o container:
   ```bash
   docker run -p 3000:3000 --env-file .env codelabs
   ```

#### Deploy Manual

1. Instale as dependências:
   ```bash
   bun install --frozen-lockfile
   ```
2. Prepare os assets e compile o projeto:
   ```bash
   bun run fswatcher:build
   bun run icons:prepare
   bun run emails:compile
   bun run build
   ```
3. Execute as migrações do banco de dados:
   ```bash
   bun run database:migrate
   ```
4. Inicie o servidor:
   ```bash
   NODE_ENV=production bun run build/index.js
   ```
