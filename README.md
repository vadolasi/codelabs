# Codelabs

IDE Online completa com colaboração em tempo real voltada para salas de aula.

## Linguagens suportadas

Atualmente, é possível executar Node.js e Python, tudo diretamente no navegador. São suportados os seguintes runtimes:

| Runtime | Funcionamento | Linguagens suportadas | Funcionalidades | Limitações |
|---|---|---|---|---|
| **Webcontainers** | Emula um mini sistema operacional POSIX completo através de Webassembly. | Javascript (Node.js) e Python | Ambiente completo com sistema de arquivos, terminal PTY real e suporte a servidores HTTP com preview. | Não há suporte para instalação de pacotes Python via `pip`. |
| **Skulpt** | Interpretador Python escrito puramente em Javascript. | Python | Suporte à biblioteca `turtle`. | Suporte limitado à biblioteca padrão do Python, sem suporte a pacotes externos, e sem suporte a sintaxe completa (principalmente das versões mais recentes), é sabido que não há suporte para f-strings e pattern matching, além de não ser possível incluir acentos em nomes de variáveis. A implementação do `turtle` também diverge da implementação original. |
| **Pyodide** | Interpretador CPython completo compilado para Webassembly. | Python | Runtime recomendado para Python. Suporte a bibliotecas científicas (numpy, pandas) e instalação de pacotes. | Não possui suporte ao módulo `turtle`. |

Note que todos os runtimes vão ter limitações por serem executados diretamente no navegador.

Os planos são de suportar vários outros runtimes.

## Executando o Codelabs

O banco de dados é SQLite, portanto, não é necessário configurar nenhum servidor de banco de dados.

### Variáveis de ambiente

Utilize [`.env.example`](./.env.example) como base. Criar um arquivo `.env` na raiz também é suportado.

- `RESEND_API_KEY` (opcional durante o desenvolvimento): Chave de API do Resend. É necessário ter uma conta no [Resend](https://resend.com/) (é possível usar o serviço gratuitamente).
- `MAIL_FROM` (opcional durante o desenvolvimento): Domínio pelo qual os emails serão enviados (ex: codelabs@vitordaniel.is-a.dev). Configure pelo Resend.
- `DOMAIN`: Domínio em que o servidor está sendo executado (ex: localhost, codelabs.vitordaniel.is-a.dev)
- `ADMIN_EMAIL` e `ADMIN_PASSWORD` (apenas para produção): Credenciais do usuário administrador que será criado automaticamente.

Ao executar em ambiente de desenvolvimento, apenas defina `DOMAIN=localhost`.

Caso você não defina `RESEND_API_KEY` durante o desenvolvimento as mensagens aparecem no terminal:

```
[0] [Email Simulado]
[0] Para: vitor@vitordaniel.is-a.dev
[0] Assunto: Verifique o seu email
[0] --- Conteúdo Texto ---
[0] Logo [https://localhost/favicon-96x96.png]
[0] 
[0] Codelabs
[0] 
[0] Verifique seu endereço de e-mail
[0] Utilize o código abaixo para verificar seu endereço de e-mail:
[0] 703425
[0] Se você não solicitou essa verificação, ignore este e-mail.
[0] ----------------------
```

### Executando em ambiente de desenvolvimento

É necessário instalar o [Bun](https://bun.com).

Antes de rodar o servidor, é necessário executar esses comandos:

```bash
bun i # Instala as depêndencias
bun database:migrate # Executa as migrações no banco de dados
```

Para executar o servidor de desenvolvimento, basta executar o comando abaixo, o servidor será acessível em http://localhost:5173.

```bash
bun dev
```

Se precisar acessar o banco de dados (tornar um usuário administrador, etc), basta executar o comando abaixo, e acessar https://local.drizzle.studio.

```bash
bun database:studio
```

## Comandos principais

Aqui estão os comandos mais utilizados no desenvolvimento do projeto:

| Comando | Descrição |
|---|---|
| `bun dev` | Inicia o servidor de desenvolvimento e o servidor de tempo real. |
| `bun build` | Gera o bunddle projeto para produção. |
| `bun database:generate` | Gera arquivos de migração baseados nas mudanças do schema. |
| `bun database:migrate` | Aplica as mudanças do schema diretamente no banco de dados. |
| `bun database:studio` | Abre a interface visual para gerenciar o banco de dados SQLite. |
| `bun format` | Formata o código utilizando o [Biome](https://biomejs.dev). |

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
3. Inicie o servidor:
   ```bash
   NODE_ENV=production bun run build/index.js
   ```
