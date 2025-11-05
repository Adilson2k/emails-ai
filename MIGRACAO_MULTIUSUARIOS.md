## Migração para Multi-Usuários

Este guia descreve como migrar a aplicação para o modo multiusuários, onde cada usuário possui suas próprias credenciais IMAP/SMS e um listener dedicado. O objetivo é isolar configurações por usuário e iniciar o monitoramento de emails automaticamente após a configuração.

### Visão geral
- **Antes**: Configuração global (`EMAIL_USER`/`EMAIL_PASS`) e um único listener.
- **Depois**: Configurações salvas por usuário no banco (`UserSettings`) e listeners gerenciados por usuário via `EmailListenerRegistry` (singleton). O listener inicia automaticamente após salvar as configurações do usuário.

### Principais mudanças
- **Registro de listeners**: introduzido `emailListenerRegistry` (singleton em `src/services/registry.ts`).
- **Rotas de listener**: `/listener/start` e `/listener/stop` agora operam no contexto do usuário autenticado.
- **Salvar configurações**: `POST /settings` inicia automaticamente o listener do usuário após persistir as credenciais IMAP.
- **Status**: `GET /status` retorna o estado por usuário (running/connected/retryCount), além do teste de conexão IMAP e Gemini.
- **Teste IMAP no boot**: o teste global pode aparecer como ❌ por não ter `userId`. Isso é esperado; a verificação efetiva acontece por usuário.

### Modelo de dados
- `UserSettings` (por usuário):
  - `imapEmail`, `imapPassword` (armazenada de forma segura), `imapHost`, `imapPort`, `useGmailOAuth` (opcional)
  - `smsPhone`, `smsToken` (opcional)

### Fluxo operacional (novo)
1. Usuário autentica.
2. Usuário acessa `/settings/me` para verificar se há configurações.
3. Usuário envia `POST /settings` com `imapEmail`, `imapPassword` (senha de app), `imapHost`, `imapPort`.
4. Após salvar, o sistema chama `emailListenerRegistry.startForUser(userId)` automaticamente.
5. Usuário consulta `/status` para ver `listener.running = true` e `connected = true` (quando credenciais válidas).

### Endpoints relevantes
- `GET /settings/me`: retorna configurações do usuário.
- `POST /settings`: salva/atualiza configurações e inicia listener automaticamente.
- `POST /listener/start`: inicia manualmente o listener do usuário autenticado.
- `POST /listener/stop`: para o listener do usuário autenticado.
- `GET /status`: retorna status consolidado (IMAP/Gemini/SMS e listener por usuário).
- `GET /health`: status básico do serviço (não inclui contexto de usuário).

### Variáveis de ambiente
- Recomendado manter chaves globais (ex.: `GEMINI_API_KEY`, `SIMPLE_SMS_TOKEN`) se forem compartilhadas.
- Credenciais de email passam a ser por usuário e não devem ficar no `.env` (use `POST /settings`).

### Compatibilidade
- Instâncias antigas que dependiam de `EMAIL_USER`/`EMAIL_PASS` continuarão subindo, mas o IMAP global poderá falhar no boot (sem `userId`). Migre para salvar credenciais por usuário via `/settings`.

### Passo a passo de migração
1. Remover dependência de `EMAIL_USER`/`EMAIL_PASS` para login/monitoramento global.
2. Certificar que o schema `UserSettings` está aplicado e acessível.
3. Orientar usuários a configurar suas credenciais via `POST /settings`.
4. Verificar `/status` autenticado após a configuração para confirmar conexão IMAP.
5. (Opcional) Inicializar automaticamente o listener no login para usuários que já possuam `UserSettings` válidas.

### Boas práticas
- Use senha de app (Gmail/Outlook) e evite senha de conta.
- Valide host/porta do provedor IMAP.
- Monitore `retryCount` e falhas de reconexão no `/status` para suporte.

### Observações de segurança
- Garanta criptografia/obfuscação de `imapPassword` no armazenamento.
- Não logar credenciais em nenhum momento.
- Se usar TLS com `rejectUnauthorized: false` em ambientes de teste, habilite validação apropriada em produção.

### Próximos passos opcionais
- Auto-start no login: detectar `UserSettings` válidas e chamar `startForUser(userId)` ao autenticar.
- Limites de sessão: parar o listener quando o usuário se deslogar, conforme política.
- Métricas: expor métricas por usuário (emails processados, latência, falhas).


