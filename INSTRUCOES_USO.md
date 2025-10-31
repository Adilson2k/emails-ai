# 📧 Email Alert Service - Instruções de Uso

## 🚀 Como Executar o Serviço

### 1. Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Configurações de Email (IMAP)
EMAIL_USER=seuemail@gmail.com
EMAIL_PASS=sua_senha_app
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993

# Gemini AI
GEMINI_API_KEY=sua_chave_api

# Simple SMS
SIMPLE_SMS_TOKEN=seu_token_sms
SMS_NUMBERS=926111111,912111111

# Configurações do Servidor
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/emails-ai
```

### 2. Configuração do MongoDB

O sistema usa MongoDB para armazenar o histórico de emails processados. Você pode:

1. **Usar MongoDB local:**
   ```bash
   # Instalar MongoDB
   # Windows: https://www.mongodb.com/try/download/community
   # Linux: sudo apt-get install mongodb
   # macOS: brew install mongodb-community
   
   # Iniciar MongoDB
   mongod
   ```

2. **Usar MongoDB Atlas (nuvem):**
   - Crie uma conta em https://www.mongodb.com/atlas
   - Crie um cluster gratuito
   - Copie a string de conexão e use como `MONGODB_URI`

### 3. Instalação das Dependências

```bash
npm install
```

### 4. Compilação do TypeScript

```bash
npm run build
```

### 5. Execução do Serviço

```bash
# Modo desenvolvimento
npm run dev

# Modo produção
npm start
```

## 🔧 Funcionalidades Implementadas

### ✅ Serviços Principais

1. **EmailListener** - Monitora caixa de email via IMAP
2. **GeminiService** - Analisa emails com IA
3. **SMSService** - Envia notificações SMS
4. **EmailProcessor** - Processa e classifica emails
5. **DatabaseService** - Gerencia histórico de emails no MongoDB

### 📡 Endpoints da API

- `GET /health` - Status de saúde do serviço
- `GET /status` - Status detalhado de todos os serviços
- `GET /stats` - Estatísticas da caixa de email
- `POST /test-sms` - Teste de envio de SMS
- `POST /listener/start` - Inicia o listener de emails
- `POST /listener/stop` - Para o listener de emails
- `POST /process-email` - Processa email manualmente (para testes)
- `GET /emails` - Lista emails processados (com filtros)
- `GET /emails/stats` - Estatísticas de emails por período
- `GET /emails/general-stats` - Estatísticas gerais do sistema

### 🧠 Lógica de Análise

O sistema analisa emails e classifica em:
- **Alta** - Propostas de negócios, oportunidades comerciais, urgências
- **Média** - Emails importantes mas não críticos
- **Baixa** - Emails informativos ou menos importantes

### 📱 Notificações SMS

- Enviadas apenas para emails classificados como **alta importância**
- Resumo limitado a 160 caracteres
- Integração com Simple SMS Angola

## 🧪 Testando o Sistema

### 1. Teste de Conexão IMAP
```bash
curl http://localhost:3000/status
```

### 2. Teste de SMS
```bash
curl -X POST http://localhost:3000/test-sms
```

### 3. Teste de Processamento Manual
```bash
curl -X POST http://localhost:3000/process-email \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Proposta Comercial Importante",
    "content": "Gostaríamos de apresentar uma proposta comercial interessante...",
    "from": "comercial@empresa.com"
  }'
```

## 📊 Monitoramento

O serviço fornece logs detalhados sobre:
- Conexão IMAP
- Emails processados
- Análises de IA
- Envios de SMS
- Erros e reconexões

## 🔄 Fluxo de Funcionamento

1. **Conexão** - Conecta à caixa de email via IMAP
2. **Monitoramento** - Verifica novos emails a cada 30 segundos
3. **Processamento** - Analisa conteúdo com Gemini AI
4. **Classificação** - Determina importância (alta/média/baixa)
5. **Notificação** - Envia SMS para emails importantes
6. **Log** - Registra todas as operações

## ⚠️ Considerações Importantes

- **Gmail**: Use senhas de aplicativo, não a senha normal
- **Rate Limits**: Respeite limites da API do Gemini
- **SMS**: Configure números válidos para Angola
- **Logs**: Monitore logs para identificar problemas
- **Reconexão**: Sistema tenta reconectar automaticamente

## 🛠️ Próximos Passos

- [ ] Integração com MongoDB
- [ ] API REST completa
- [ ] Dashboard web
- [ ] Configurações personalizadas
- [ ] Testes automatizados
- [ ] Deploy em produção

---

**Desenvolvido por Laboratório Softhard** 🏢
