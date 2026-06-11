# emprega+ — Frontend

Interface web para a plataforma **emprega+**, que conecta pessoas 60+ e PcD com empresas que valorizam a diversidade e a inclusão.

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18 + TypeScript |
| Estilização | Tailwind CSS |
| Roteamento | React Router v6 |
| HTTP | Axios |
| Build | Vite |
| Ícones | Lucide React |

---

## Estrutura de pastas

```
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── CompanyLayout.tsx       # Sidebar + topbar para empresa
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Logo.tsx
│   │       └── Modal.tsx
│   ├── pages/
│   │   ├── LandingPage.tsx             # Seleção de papel (empresa / candidato)
│   │   ├── company/
│   │   │   ├── CompanyAuthPage.tsx     # Login / Cadastro da empresa
│   │   │   ├── CompanyDashboard.tsx    # Dashboard com métricas e vagas recentes
│   │   │   ├── JobsListPage.tsx        # Lista de vagas da empresa
│   │   │   ├── CreateJobPage.tsx       # Formulário de criação de vaga
│   │   │   ├── JobDetailPage.tsx       # Detalhes da vaga + matches com score IA
│   │   │   ├── TalentsPage.tsx         # Banco de talentos
│   │   │   └── CandidateProfilePage.tsx # Currículo detalhado do candidato
│   │   └── candidate/
│   │       └── CandidateChatPage.tsx   # Chat estilo WhatsApp Web com IA
│   ├── services/
│   │   └── api.ts                      # Todas as chamadas Axios para o backend
│   ├── types/
│   │   └── index.ts                    # Tipos TypeScript globais
│   ├── utils/
│   │   ├── cn.ts                       # Utilitário clsx + labels de tipos de candidato
│   │   └── storage.ts                  # Wrapper de localStorage
│   ├── App.tsx                         # Roteamento principal
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Instalação e execução

### Pré-requisitos

- Node.js ≥ 18
- Backend rodando em `http://localhost:3001`

### Passos

```bash
# 1. Entre na pasta do frontend
cd frontend

# 2. Instale as dependências
npm install

# 3. (Opcional) Crie um .env.local se o backend estiver em outra porta
# VITE_API_BASE_URL=http://localhost:3001

# 4. Inicie o servidor de desenvolvimento
npm run dev

# Acesse em: http://localhost:3000
```

### Build para produção

```bash
npm run build
# Saída em dist/
```

---

## Fluxos da aplicação

### Candidato (Idoso 60+ / PcD)

1. **Landing** → seleciona "Sou candidato"
2. **Modal de telefone** → insere número (cria sessão via `POST /api/whatsapp-sessions`)
3. **Chat WhatsApp Web** → conversa com a IA por texto ou áudio
   - Texto: `POST /api/whatsapp-sessions/:id/messages/text`
   - Áudio: `POST /api/whatsapp-sessions/:id/messages/audio` (upload multipart)
4. Ao chegar em `generating_resume`, o frontend chama automaticamente `POST /api/whatsapp-sessions/:id/generate-profile`
5. A IA faz match com vagas e retorna devolutivas pelo mesmo chat

### Empresa

1. **Landing** → seleciona "Sou empresa"
2. **Auth** → cadastro (`POST /api/companies`) ou login por ID (`GET /api/companies/:id`)
   - O `companyId` fica salvo no `localStorage`
3. **Dashboard** → visão geral de vagas e métricas
4. **Criar vaga** → `POST /api/job-posts` com tipos de candidato (60+, PcD_*)
5. **Detalhe da vaga** → rodar match IA (`POST /api/job-posts/:id/run-match`) e visualizar candidatos com score
6. **Feedback** → agendar entrevista e enviar feedback para cada match
7. **Banco de talentos** → `GET /api/talent-profiles` com busca por nome

---

## Endpoints consumidos

| Método | Rota | Onde é usado |
|--------|------|-------------|
| POST | `/api/companies` | Cadastro de empresa |
| GET | `/api/companies/:id` | Login de empresa |
| POST | `/api/job-posts` | Criar vaga |
| GET | `/api/companies/:id/job-posts` | Listar vagas |
| GET | `/api/job-posts/:id` | Detalhe da vaga |
| POST | `/api/whatsapp-sessions` | Criar sessão do candidato |
| GET | `/api/whatsapp-sessions/:id` | Hidratar chat |
| POST | `/api/whatsapp-sessions/:id/messages/text` | Enviar mensagem de texto |
| POST | `/api/whatsapp-sessions/:id/messages/audio` | Enviar áudio |
| POST | `/api/whatsapp-sessions/:id/generate-profile` | Gerar currículo |
| GET | `/api/talent-profiles` | Banco de talentos |
| GET | `/api/talent-profiles/:id` | Currículo do candidato |
| POST | `/api/job-posts/:id/run-match` | Rodar match IA |
| GET | `/api/job-posts/:id/matches` | Listar matches com score |

---

## Tipos de candidato

| Código | Descrição |
|--------|-----------|
| `60+` | Pessoa com 60 anos ou mais |
| `PCD_FISICA` | PcD — Deficiência Física |
| `PCD_VISUAL` | PcD — Deficiência Visual |
| `PCD_AUDITIVA` | PcD — Deficiência Auditiva |
| `PCD_INTELECTUAL` | PcD — Deficiência Intelectual |
| `PCD_AUTISMO` | PcD — Transtorno do Espectro Autista |

---

## Paleta de cores

| Variável | Hex | Uso |
|----------|-----|-----|
| Primary | `#0D3D85` | Sidebar, botões principais, cabeçalhos |
| Accent | `#7ACB2D` | Destaques, badges, botão de áudio |
| Surface | `#F4F6F8` | Fundo de páginas e inputs |
| White | `#FFFFFF` | Cards, modais |

---

## Variáveis de ambiente

```env
# .env.local
VITE_API_BASE_URL=http://localhost:3001
```

O proxy do Vite já redireciona `/api` para `localhost:3001` em desenvolvimento, por isso a variável é opcional.

---

## Acessibilidade

- Todos os botões têm `aria-label` ou texto visível
- Inputs têm `<label>` associada por `id`
- Modais têm `role="dialog"` e `aria-modal="true"`
- `focus:ring` visível em todos os elementos interativos
- `disabled:opacity-50` e `disabled:cursor-not-allowed` em controles desabilitados
