# ⚡ Quick Start (5 minutos)

> Guia rápido para colocar o sistema rodando HOJE

---

## 1️⃣ **Clone/Baixe o Projeto**

```bash
cd ~/Desktop
# (ou qualquer pasta que prefira)
```

---

## 2️⃣ **Obtenha suas Credenciais**

Você vai precisar de 2 coisas:

### **A) CLAUDE API KEY**
1. Vá para: https://console.anthropic.com/
2. Clique em "API Keys"
3. Crie uma nova chave
4. Copie o valor que começa com `sk-ant-`
5. **GUARDE EM LUGAR SEGURO**

### **B) GMAIL APP PASSWORD**
1. Vá para: https://myaccount.google.com/apppasswords
2. Selecione "Mail" e "Windows Computer" (ou seu tipo de dispositivo)
3. Google vai gerar uma senha de 16 caracteres
4. Copie (exemplo: `xxxx xxxx xxxx xxxx`)
5. **Use essa senha, NÃO a senha da sua conta!**

---

## 3️⃣ **Execute o Setup**

```bash
node setup.js
```

Ele vai pedir:
- ✏️ Cole sua CLAUDE_API_KEY
- ✏️ Cole seu email Gmail
- ✏️ Cole o App Password (16 chars)
- ✏️ Keywords de busca (default: ok)
- ✏️ Frequência (1 = a cada hora)

**Tudo será salvo em `.env`**

---

## 4️⃣ **Inicie o Sistema**

```bash
npm start
```

Isso vai:
1. ✅ Coletar vagas
2. ✅ Analisar relevância
3. ✅ Gerar CVs personalizados
4. ✅ Enviar candidaturas por email
5. 🔄 Repetir a cada hora

---

## 5️⃣ **Verificar Logs**

```bash
# Em outro terminal:
tail -f logs/automation.log
```

Você verá algo como:
```
2026-06-02T14:30:00.000Z ℹ️ Iniciando ciclo...
2026-06-02T14:30:15.000Z ✅ 45 vagas coletadas
2026-06-02T14:30:40.000Z ✅ 28 vagas qualificadas
2026-06-02T14:32:00.000Z ✅ 18 candidaturas enviadas
```

---

## 📊 Onde Estão os Resultados?

| O Quê | Onde |
|-------|------|
| CVs personalizados | `./resumes/` |
| Banco de dados | `./data/jobs.db` |
| Logs detalhados | `./logs/automation.log` |
| Configuração | `./.env` |

---

## ⚠️ Troubleshooting Rápido

### **"Erro: não consigo instalar dependências"**
```bash
# Tente manualmente:
npm install
```

### **"Gmail não está recebendo emails"**
- ✓ Verificou se APP PASSWORD está correto?
- ✓ Verificou se email está correto?
- ✓ Ligou autenticação 2FA? (precisa)

### **"Não está coletando vagas"**
- ✓ Aguarde alguns segundos (primeiro ciclo é lento)
- ✓ Verifique se está com internet

### **"Preciso parar o sistema"**
```bash
# No terminal onde rodou:
CTRL + C
```

---

## 🎯 Próximos Passos

1. **Deixar rodando:**
   - Abra um terminal e deixe `npm start` rodando
   - Ou use PM2 para daemon (veja README)

2. **Monitore os logs:**
   - Abra outro terminal
   - Rode `tail -f logs/automation.log`
   - Veja candidaturas sendo enviadas em tempo real

3. **Ajuste conforme necessário:**
   - Altere `.env` se quiser mudar keywords, salário, etc
   - Reinicie: `npm start`

4. **Revise os CVs:**
   - Todos em `./resumes/`
   - Verifique se estão bons

---

## 📚 Leia Mais

Para mais detalhes:
```bash
cat README.md
```

---

## 🚀 Sucesso!

Você tem um **sistema profissional de automação de candidaturas rodando**.

Espera receber mensagens de empresa em breve! 💼

---

*Qualquer dúvida? Revise o README.md*
