# 🌐 Deployment & Production

Guias para rodar o sistema de forma confiável em VPS, Cloud ou máquina pessoal 24/7.

---

## Opção 1: PM2 (Recomendado para VPS/MacOS/Linux)

PM2 é um daemon que mantém seu app rodando mesmo após reboot.

### 1. Instalar PM2 Globalmente

```bash
npm install -g pm2
```

### 2. Iniciar com PM2

```bash
cd job-automation
pm2 start index.js --name "job-automation" --instances 1
```

### 3. Verificar Status

```bash
pm2 status
```

Output esperado:
```
┌─────────────────┬──────┬─────────┬──────┬──────────┐
│ App name        │ PID  │ Status  │ CPU  │ Memory   │
├─────────────────┼──────┼─────────┼──────┼──────────┤
│ job-automation  │ 1234 │ online  │ 0.1% │ 128.5 MB │
└─────────────────┴──────┴─────────┴──────┴──────────┘
```

### 4. Salvar Configuração

```bash
pm2 save
pm2 startup
```

Agora o sistema vai rodar automaticamente após reboot.

### 5. Monitorar

```bash
# Ver logs em tempo real
pm2 logs job-automation

# Ver dashboard
pm2 monit

# Reiniciar
pm2 restart job-automation

# Parar
pm2 stop job-automation

# Remover
pm2 delete job-automation
```

---

## Opção 2: Docker (Para Ambientes de Cloud)

Se preferir usar Docker (AWS, GCP, Azure, DigitalOcean):

### 1. Criar Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar arquivos
COPY package*.json ./
COPY scripts/ ./scripts/
COPY index.js .
COPY .env ./

# Instalar dependências
RUN npm install

# Expor porta (opcional, para monitoramento)
EXPOSE 3000

# Rodar
CMD ["npm", "start"]
```

### 2. Build Docker Image

```bash
docker build -t job-automation:latest .
```

### 3. Rodar Container

```bash
docker run -d \
  --name job-automation \
  --restart unless-stopped \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/resumes:/app/resumes \
  -e CLAUDE_API_KEY=your_key \
  -e GMAIL_USER=your_email \
  -e GMAIL_PASSWORD=your_password \
  job-automation:latest
```

### 4. Monitorar

```bash
# Ver logs
docker logs -f job-automation

# Ver status
docker ps

# Parar
docker stop job-automation

# Reiniciar
docker restart job-automation
```

---

## Opção 3: Systemd (Linux Server)

Para sistemas Linux com systemd:

### 1. Criar arquivo de serviço

```bash
sudo nano /etc/systemd/system/job-automation.service
```

Colar:
```ini
[Unit]
Description=Job Automation System
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/job-automation
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
StandardOutput=append:/var/log/job-automation.log
StandardError=append:/var/log/job-automation.log

[Install]
WantedBy=multi-user.target
```

### 2. Ativar Serviço

```bash
sudo systemctl daemon-reload
sudo systemctl enable job-automation
sudo systemctl start job-automation
```

### 3. Verificar Status

```bash
sudo systemctl status job-automation
```

### 4. Ver Logs

```bash
sudo tail -f /var/log/job-automation.log
```

---

## Opção 4: GitHub Actions (CI/CD - Automático)

Rodar em GitHub Actions gratuitamente (até 2000 min/mês):

### 1. Criar `.github/workflows/job-automation.yml`

```yaml
name: Job Automation

on:
  schedule:
    - cron: '0 * * * *'  # A cada hora
  workflow_dispatch:      # Manual trigger

jobs:
  run:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run job automation
        env:
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
          GMAIL_USER: ${{ secrets.GMAIL_USER }}
          GMAIL_PASSWORD: ${{ secrets.GMAIL_PASSWORD }}
        run: npm start
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: job-data
          path: |
            data/
            logs/
            resumes/
```

### 2. Configurar Secrets no GitHub

1. Vá para: GitHub Repo → Settings → Secrets
2. Adicione:
   - `CLAUDE_API_KEY`
   - `GMAIL_USER`
   - `GMAIL_PASSWORD`

Pronto! Rodará automaticamente a cada hora.

---

## Opção 5: Cron Job (Linux/MacOS)

Para rodar em horários específicos via cron:

### 1. Editar Crontab

```bash
crontab -e
```

### 2. Adicionar Linha

```cron
# Rodar a cada hora
0 * * * * cd /home/user/job-automation && npm start >> logs/cron.log 2>&1

# Rodar de 9-17h (horário comercial)
0 9-17 * * * cd /home/user/job-automation && npm start >> logs/cron.log 2>&1

# Rodar 2x por dia (9h e 17h)
0 9,17 * * * cd /home/user/job-automation && npm start >> logs/cron.log 2>&1
```

---

## ⚡ Comparativo de Opções

| Opção | Melhor Para | Simplicidade | Confiabilidade | Custo |
|-------|-------------|--------------|-----------------|-------|
| **PM2** | VPS/Linux/Mac | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Grátis |
| **Docker** | Cloud (AWS/GCP) | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Variável |
| **Systemd** | Linux Server | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Grátis |
| **GitHub Actions** | Automação | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Grátis (2000 min) |
| **Cron** | Simples | ⭐⭐⭐ | ⭐⭐⭐ | Grátis |

**Recomendação:** PM2 (mais prático e confiável)

---

## 🚨 Monitoramento & Alerts

### Verificar se Sistema está Rodando

```bash
# PM2
pm2 status

# Docker
docker ps

# Systemd
systemctl status job-automation
```

### Enviar Alertas (Opcional)

Adicione ao `.env`:
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Agora o sistema pode notificar você:
- ✅ Quando candidaturas são enviadas
- ❌ Quando há erro
- 📊 Resumo diário

---

## 📈 Scaling

Se precisar processar mais vagas:

### Com PM2
```bash
pm2 start index.js --instances 3
```

### Com Docker
```bash
docker run -d --name job-auto-1 ...
docker run -d --name job-auto-2 ...
docker run -d --name job-auto-3 ...
```

---

## 🛡️ Backup

Não perca seus dados! Faça backup regularmente:

```bash
# Backup do banco de dados
cp -r data/ data-backup-$(date +%Y%m%d)/

# Backup dos CVs
cp -r resumes/ resumes-backup-$(date +%Y%m%d)/

# Backup logs
cp logs/automation.log logs/automation-$(date +%Y%m%d).log
```

Ou use `cron` para automatizar:
```bash
0 2 * * * tar -czf ~/backups/job-automation-$(date +\%Y\%m\%d).tar.gz ~/job-automation/data ~/job-automation/resumes
```

---

## 🔄 Atualizações

Para atualizar o código:

```bash
cd job-automation
git pull origin main
npm install

# Se usando PM2
pm2 restart job-automation
```

---

## 📞 Troubleshooting Produção

### "Sistema parou de rodar"
```bash
pm2 logs job-automation  # Ver erro
pm2 restart job-automation  # Reiniciar
```

### "Consumo de memória alto"
Aumentar intervalo em `.env`:
```
SCRAPE_INTERVAL=7200000  # A cada 2 horas em vez de 1
```

### "Email não está indo"
Verificar logs:
```bash
grep "email" logs/automation.log
```

---

**Sistema pronto para produção! 🎉**

`ultimo update: 2026-06-02`
