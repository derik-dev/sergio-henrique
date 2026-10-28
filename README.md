# Anotador de Jogo (V1 demonstração)

Anotação de jogos de futebol ao vivo para narradores. Next.js (App Router) + TypeScript + Tailwind + Supabase.

## Rodar localmente
1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha (veja o arquivo).
3. Aplique as migrations em `supabase/migrations/` (SQL Editor do Supabase, em ordem, ou `supabase db push`).
4. `npm run seed` cria um jogo de demonstração e imprime o link de edição e o link ao vivo.
5. `npm run dev` e abra http://localhost:3000

## Scripts
- `npm run seed` — jogo fictício completo (2º tempo, gols, cartões, substituição, gol anulado).
- `npm run test:e2e` — testa servidor + banco (cria um jogo, roda todas as operações, confere com o cliente, limpa).
- `npm run lint`, `npm run build`

## Acesso e segurança (V1)
Sem login: o UUID do jogo na URL é o "link secreto" de edição; o link ao vivo usa outro token (somente leitura).
As policies de RLS da V1 são abertas para a chave anon. Para fechar: defina `SUPABASE_SERVICE_ROLE_KEY`
(só servidor) e rode `supabase/hardening/tighten_rls.sql`. V2: auth + owner_id + policies por usuário.

## Atalhos (computador)
Com o menu do jogador aberto, ou com a linha do jogador em foco: **S** substituir · **A** amarelo · **V** vermelho · **G** gol. **Z** desfaz o último evento.
