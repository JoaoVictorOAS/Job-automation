# 🚀 Job Automation System

Sistema automático de candidatura a vagas com geração de CV personalizado, cover letter inteligente e envio automático de emails.

**Status:** ✅ Pronto para usar | **Frequência:** A cada hora

---

## 📋 O Que Faz

```
Scraping (Indeed, BeBee, Glassdoor, LinkedIn) 
    ↓
Análise de Relevância (DeepSeek API)
    ↓
Geração de CV Personalizado (DeepSeek API)
    ↓
Geração de Cover Letter (DeepSeek API)
    ↓
Envio de Email Automático (Gmail SMTP)
    ↓
Preenchimento de Formulário Web (Puppeteer)
    ↓
Rastreamento em Banco de Dados (SQLite)
    ↓
[REPEAT A CADA HORA]
```

---

## 🔧 Setup Inicial

### 1. **Pré-requisitos**

- Node.js 16+ instalado
- Gmail com autenticação de app
- API key da DeepSeek
- Token do LinkedIn (cookie li_at)

### 2. **Instalar Dependências**

```bash
cd job-automation
npm install
```

### 3. **Configurar .env**

Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

#### **Variáveis Críticas:**

**DEEPSEEK API:**
```
DEEPSEEK_API_KEY=sk-xxxxx...
DEEPSEEK_MODEL=deepseek-chat
```
Obtém em: https://platform.deepseek.com/

**LINKEDIN:**
```
LINKEDIN_LI_AT=AQEDASxxxxxxxxxx...
```
⚠️ **Obter o token li_at do LinkedIn:**
1. Faça login no LinkedIn (https://www.linkedin.com)
2. Abra o DevTools (F12 ou Cmd+Option+I)
3. Vá em "Application" → "Cookies" → Procure por "li_at"
4. Copie o valor completo
5. Cole em `LINKEDIN_LI_AT`

**GMAIL:**
```
GMAIL_USER=seu_email@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

⚠️ **Gerar App Password:**
1. Ir em https://myaccount.google.com/apppasswords
2. Selecionar "Mail" + "Windows Computer" (ou seu setup)
3. Copiar a senha gerada (16 caracteres com espaços)
4. Colar em `GMAIL_PASSWORD`

**RESUME DATA:**
```
PROFILE_NAME=Seu Nome Completo
PROFILE_EMAIL=seu_email@gmail.com
PROFILE_PHONE=(11) 99999-9999
PROFILE_GITHUB=https://github.com/seu-usuario
PROFILE_LINKEDIN=https://www.linkedin.com/in/seu-usuario/
```

**SEARCH SETTINGS:**
```
SEARCH_KEYWORDS=full stack developer,react developer,node.js developer
TARGET_SALARY_MIN=6000
TARGET_SALARY_MAX=50000
MIN_APPLICATION_MATCH=70
AUTO_APPLY_THRESHOLD=80
```

**SCHEDULER:**
```
SCRAPE_INTERVAL=3600000  # 1 hora em ms (60 min = 3600000)
```

Para rodar **a cada 30 minutos:**
```
SCRAPE_INTERVAL=1800000
```

---

## ▶️ Executar

### **Modo Production (Background)**

```bash
npm start
```

Isso vai:
1. Scraping de vagas **agora**
2. Rodará novamente **a cada hora** (ou conforme SCRAPE_INTERVAL)
3. Continuar rodando infinitamente

### **Modo Development (Com logs)**

```bash
npm run dev
```

Usa `nodemon` para reiniciar automaticamente em mudanças.

### **Apenas Scraping (Debug)**

```bash
npm run scrape
```

Faz scraping uma única vez e mostra resultados.

---

## 📊 Resultados & Tracking

### **Arquivo de Logs**
```
./logs/automation.log
```
Todos os eventos são registrados com timestamp.

### **Banco de Dados**
```
./data/jobs.db
```
Contém:
- Todas as vagas coletadas
- Histórico de candidaturas
- CVs personalizados
- Estatísticas

### **CVs Personalizados**
```
./resumes/
├── [job-id]_[company].txt
├── [job-id]_[company].txt
└── ...
```

### **Exemplo de Log**

```
2026-06-02T14:30:00.000Z ℹ️ Inicializando sistema de automação de candidaturas...
2026-06-02T14:30:01.000Z ✅ Banco de dados inicializado
2026-06-02T14:30:02.000Z ✅ Credenciais validadas
2026-06-02T14:30:05.000Z ✅ Sistema pronto para iniciar
═════════════════════════════════════════
2026-06-02T14:30:10.000Z ℹ️ Iniciando ciclo de automação
═════════════════════════════════════════
2026-06-02T14:30:15.000Z 💼 Etapa 1: Coletando vagas...
2026-06-02T14:30:35.000Z ✅ 45 vagas coletadas
2026-06-02T14:30:40.000Z 💼 Etapa 2: Analisando vagas...
2026-06-02T14:30:55.000Z ✅ 28 vagas qualificadas (score >= 70%)
2026-06-02T14:31:10.000Z 💼 Etapa 3: Gerando CVs personalizados...
2026-06-02T14:32:00.000Z ✅ 28 CVs gerados
2026-06-02T14:32:05.000Z 💼 Etapa 4: Registrando vagas...
2026-06-02T14:32:10.000Z ✅ Vagas registradas
2026-06-02T14:32:15.000Z 💼 Etapa 5: Candidatando automaticamente (18 vagas)...
2026-06-02T14:32:20.000Z ✅ Candidatura enviada: Full Stack Developer @ AgileEngine
2026-06-02T14:32:25.000Z ✅ Candidatura enviada: React Developer @ Sensedia
...
═════════════════════════════════════════
2026-06-02T14:35:00.000Z ✅ Ciclo completado em 5.12s
2026-06-02T14:35:00.000Z ℹ️ Resumo: 45 coletadas → 28 qualificadas → 18 candidatadas
═════════════════════════════════════════
```

---

## 🎯 Features

### ✅ Implementado

- [x] Scraping multi-plataforma (Indeed, BeBee, Glassdoor, LinkedIn)
- [x] Análise de relevância com DeepSeek API
- [x] Geração de CV personalizado por vaga
- [x] Geração de cover letter inteligente
- [x] Envio de email automático (Gmail SMTP)
- [x] Preenchimento de formulário web (Puppeteer)
- [x] Banco de dados SQLite com histórico
- [x] Scheduler automático (cron)
- [x] Sistema de logging detalhado
- [x] Filtragem por salário e localização
- [x] Integração com LinkedIn (scraping de vagas)

### 🔄 Melhorias Futuras

- [ ] Detecção de vagas duplicadas via ML
- [ ] Export de stats para Spreadsheet
- [ ] Webhook para notificações (Discord/Slack)
- [ ] Dashboard web com status em tempo real
- [ ] Histórico de resposta de empresas
- [ ] A/B testing de cover letters

---

## 🐛 Troubleshooting

### **"Erro: DEEPSEEK_API_KEY não está definida"**
```
✓ Solução: Adicione DEEPSEEK_API_KEY ao .env
```

### **"Erro ao conectar Gmail"**
```
✓ Verifique se:
  - Email está correto
  - App Password foi gerado (não a senha da conta)
  - Autenticação 2FA está ativada
  - App Password foi colado corretamente (com espaços)
```

### **"Nenhuma vaga coletada"**
```
✓ Pode ser:
  - Plataforma de scraping bloqueou (tente depois)
  - Keywords muito específicas (tente simplificar)
  - Filtro de salário muito alto (abaixe um pouco)
```

### **"Puppeteer timeout"**
```
✓ Aumentar timeout em scripts/processor.js
  Linha: await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
```

---

## 📈 Análise de Dados

### **Verificar Estatísticas**

```javascript
// Em um script Node.js
import DatabaseManager from './scripts/database.js';

const db = new DatabaseManager();
await db.initialize();

const stats = await db.getJobStats(30); // Últimos 30 dias
console.log(stats);

const applied = await db.getAppliedJobs();
console.log(`Candidatado em: ${applied.length} vagas`);

const exported = await db.exportStatistics();
console.log(JSON.stringify(exported, null, 2));

await db.close();
```

---

## 🔐 Segurança

- ✅ API key armazenada apenas em `.env` (não versionado)
- ✅ Senha Gmail é app-specific (não a senha real da conta)
- ✅ CVs salvos localmente (não em nuvem)
- ✅ Logs não contêm dados sensíveis
- ✅ Credenciais em variáveis de ambiente

---

## 💡 Tips

1. **Rodar em VPS/Cloud:**
   ```bash
   # Usando PM2 para manter rodando
   npm install -g pm2
   pm2 start index.js --name "job-automation"
   pm2 save
   pm2 startup
   ```

2. **Monitorar Logs em Tempo Real:**
   ```bash
   tail -f logs/automation.log
   ```

3. **Testar Email Antes:**
   ```bash
   # Em scripts/email-sender.js
   const emailSender = new EmailSender();
   await emailSender.verifyConnection();
   ```

4. **Exportar CVs:**
   ```bash
   # Copiar todos os CVs personalizados
   cp resumes/* ~/Desktop/meus-cvs/
   ```

---

## 📞 Suporte

Erros? Adição sugestões? Crie um issue ou entre em contato.

---

**Sistema criado por:** João Victor | **Data:** Junho 2026

`ultima atualização: 2026-06-02`
