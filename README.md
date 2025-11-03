Perfeito ✅
Aqui está o conteúdo de um **`README.md`** voltado exclusivamente para o **backend** do projeto — claro, objetivo e formatado em estilo profissional:

---

```markdown
# 📧 Email Alert Service com IA e SMS

Um serviço backend em **Node.js** que monitora uma caixa de email (IMAP), analisa automaticamente a importância das mensagens recebidas usando **IA (Gemini)** e notifica o utilizador via **SMS (Simple SMS API)** quando o email é classificado como importante.

---

## 🚀 Funcionalidades Principais

- Sistema multi-tenant com configurações por usuário
- Conexão automática à caixa de entrada via IMAP
- Análise de conteúdo de email utilizando **Gemini AI**
- Classificação automática de importância: `alta`, `média` ou `baixa`
- Envio de alerta por **SMS** para emails importantes
- Criptografia de credenciais sensíveis
- API REST completa com autenticação JWT

---

## 🏗️ Estrutura do Projeto

```

email-alert-service/
│── config/
│   └── index.js          # Configurações gerais (email, IA, SMS)
│── services/
│   ├── emailListener.js  # Listener de emails (IMAP)
│   ├── emailProcessor.js # Processamento e integração com IA
│   ├── aiService.js      # Análise com Gemini
│   ├── smsService.js     # Integração com Simple SMS
│── app.js                # Inicialização principal
│── package.json
│── README.md

````

---

## ⚙️ Tecnologias Utilizadas

- **Node.js** (v18+)  
- **mailparser** – para interpretar o conteúdo dos emails.  
- **imapflow** – para escutar novos emails via IMAP.  
- **nodemailer** – (suporte futuro para envios automáticos).  
- **axios** – para chamadas HTTP (SMS e IA).  
- **@google/generative-ai** – integração com o modelo **Gemini**.  

---

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` na raiz com as seguintes variáveis:

```env
# Credenciais de Email (IMAP)
EMAIL_USER=seuemail@gmail.com
EMAIL_PASS=sua_senha_app
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993

# Gemini AI
GEMINI_API_KEY=sua_chave_api

# Simple SMS
SIMPLE_SMS_TOKEN=seu_token_sms
SMS_NUMBERS=926111111,912111111
````

---

## 🧩 Configuração Básica

1. **Clonar o repositório**

   ```bash
   git clone https://github.com/andrebravo343/emails-ai.git
   cd email-alert-service
   ```

2. **Instalar dependências**

   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente**

   * Crie o arquivo `.env` conforme o exemplo acima.

4. **Iniciar o serviço**

   ```bash
   npm start
   ```

   O serviço conectará à caixa de email e ficará a escutar novas mensagens.

---

## 📡 Fluxo de Funcionamento

1. O serviço se conecta à caixa de entrada via **IMAP**.
2. Ao receber um novo email:

   * O conteúdo é lido e processado pelo **mailparser**.
   * A **IA Gemini** analisa a mensagem e classifica sua importância.
3. Se a importância for **alta**, é disparado um **SMS** com resumo do email.

---

## 🧠 Lógica de IA (Resumo)

A IA é instruída a:

* Resumir o conteúdo em até 200 caracteres.
* Classificar a importância em `alta`, `média` ou `baixa`.
* Considerar que o utilizador valoriza **propostas de negócios e oportunidades comerciais**.

---

## 📲 Envio de SMS

A integração usa o endpoint oficial da Simple SMS Angola:

**Endpoint:**

```
POST https://interoperability.simplesms.ao/v1/send-sms
Authorization: Bearer (SIMPLE_SMS_TOKEN)
```

**Payload Exemplo:**

```json
{
  "numbers": ["926111111"],
  "message": "Email Importante de João - Assunto: Proposta Comercial"
}
```

---

## 🧱 Próximos Passos (Evolução)

* Criar **API REST (Express)** para consulta e gestão de prioridades.
* Integrar **MongoDB** para histórico e relatórios.
* Permitir configuração personalizada de regras por utilizador.
* Dashboard web com estatísticas e notificações multi-canal.

---

## 👨🏽‍💻 Autor

Desenvolvido por **Laboratório Softhard**
📍 Luanda, Angola
📧 [laboratorio@softhard.it.ao](mailto:abravo@softhard.it.ao)

---

## 🪪 Licença

Este projeto é distribuído sob a licença **MIT**.
Sinta-se livre para utilizar e adaptar conforme necessário.

```

