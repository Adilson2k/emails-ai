# Guia de Configuração - Sistema Multi-tenant

## 🔄 Migração para Multi-tenant

O sistema agora suporta múltiplos usuários, cada um com suas próprias configurações de IMAP e SMS. As configurações não são mais definidas no arquivo `.env`, mas sim salvas de forma segura no banco de dados para cada usuário.

## 🔐 Configurações por Usuário

Cada usuário precisa configurar:

1. **Configurações IMAP**:
   - Email (imapEmail)
   - Senha (imapPassword) - Criptografada
   - Host IMAP (imapHost)
   - Porta IMAP (imapPort)
   - Usar OAuth do Gmail (useGmailOAuth) - Opcional

2. **Configurações SMS**:
   - Número de telefone (smsPhone)
   - Token de API (smsToken) - Criptografado

## 📡 API Endpoints

### GET /settings/me
Retorna as configurações do usuário autenticado

**Resposta 200**:
```json
{
  "settings": {
    "imapEmail": "user@example.com",
    "imapHost": "imap.gmail.com",
    "imapPort": 993,
    "useGmailOAuth": false,
    "smsPhone": "5511999999999"
  }
}
```

### POST /settings
Salva/atualiza as configurações do usuário

**Request Body**:
```json
{
  "imapEmail": "user@example.com",
  "imapPassword": "app_password",
  "imapHost": "imap.gmail.com",
  "imapPort": 993,
  "useGmailOAuth": false,
  "smsPhone": "5511999999999",
  "smsToken": "api_token"
}
```

## 🔒 Segurança

- Todas as senhas e tokens são criptografados antes de serem salvos no banco
- A chave de criptografia (ENCRYPTION_KEY) deve ser definida no .env
- Use uma chave forte de 32 caracteres para o ENCRYPTION_KEY

## 📋 Instruções de Uso

1. Configure o ENCRYPTION_KEY no .env:
   ```
   ENCRYPTION_KEY=sua_chave_de_32_caracteres_aqui
   ```

2. Após fazer login, use o endpoint POST /settings para salvar suas configurações

3. O sistema usará automaticamente suas configurações ao processar emails

4. Se as configurações não estiverem definidas, você receberá um erro amigável com instruções

## ⚠️ Observações

- As configurações antigas do .env para IMAP e SMS foram removidas
- Cada usuário precisa configurar suas credenciais através da API
- Os serviços só funcionarão após a configuração das credenciais
- As senhas são descriptografadas apenas no momento do uso
