import cron from 'node-cron';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JobScraper from './scripts/scraper.js';
import JobProcessor from './scripts/processor.js';
import DatabaseManager from './scripts/database.js';
import EmailSender from './scripts/email-sender.js';
import CVGenerator from './scripts/cv-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar diretórios necessários
const dirs = ['./data', './logs', './resumes'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const log = (msg, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: chalk.blue('ℹ️ '),
    success: chalk.green('✅ '),
    error: chalk.red('❌ '),
    warning: chalk.yellow('⚠️  '),
    job: chalk.cyan('💼 ')
  }[type] || chalk.gray('▸ ');

  const message = `${timestamp} ${prefix}${msg}`;
  console.log(message);

  // Log to file
  try {
    fs.appendFileSync('./logs/automation.log', message + '\n');
  } catch (e) {
    console.error('Erro ao escrever log:', e);
  }
};

class JobAutomationSystem {
  constructor() {
    this.db = new DatabaseManager();
    this.scraper = new JobScraper();
    this.processor = new JobProcessor();
    this.emailSender = new EmailSender();
    this.cvGenerator = new CVGenerator();
    this.isRunning = false;
  }

  async initialize() {
    try {
      log('Inicializando sistema de automação de candidaturas...', 'info');
      
      // Inicializar banco de dados
      await this.db.initialize();
      log('Banco de dados inicializado', 'success');

      // Validar credenciais
      if (!process.env.CLAUDE_API_KEY) {
        throw new Error('CLAUDE_API_KEY não está definida no .env');
      }
      if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) {
        throw new Error('Credenciais Gmail não estão definidas no .env');
      }

      log('Credenciais validadas', 'success');
      log('Sistema pronto para iniciar', 'success');

      return true;
    } catch (error) {
      log(`Erro na inicialização: ${error.message}`, 'error');
      throw error;
    }
  }

  async runCycle() {
    if (this.isRunning) {
      log('Ciclo já está em execução, ignorando...', 'warning');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      log('═════════════════════════════════════════', 'info');
      log('Iniciando ciclo de automação', 'info');
      log('═════════════════════════════════════════', 'info');

      // 1. SCRAPING - Buscar vagas
      log('Etapa 1: Coletando vagas...', 'job');
      const jobs = await this.scraper.scrapeAllPlatforms();
      log(`✓ ${jobs.length} vagas coletadas`, 'success');

      if (jobs.length === 0) {
        log('Nenhuma vaga encontrada neste ciclo', 'warning');
        this.isRunning = false;
        return;
      }

      // 2. PROCESSING - Analisar e filtrar
      log('Etapa 2: Analisando vagas...', 'job');
      const qualifiedJobs = await this.processor.processJobs(jobs);
      log(`✓ ${qualifiedJobs.length} vagas qualificadas (score >= ${process.env.MIN_APPLICATION_MATCH}%)`, 'success');

      if (qualifiedJobs.length === 0) {
        log('Nenhuma vaga atende aos critérios', 'warning');
        this.isRunning = false;
        return;
      }

      // 3. CV GENERATION - Gerar análises de match + notas personalizadas
      log('Etapa 3: Analisando vagas e gerando notas personalizadas...', 'job');
      const jobsEnriched = await Promise.all(
        qualifiedJobs.map(job => this.cvGenerator.enrichJob(job))
      );
      log(`✓ ${jobsEnriched.length} vagas analisadas`, 'success');

      // 4. DATABASE - Salvar no banco
      log('Etapa 4: Registrando vagas no banco de dados...', 'job');
      for (const job of jobsEnriched) {
        await this.db.saveJob(job);
      }
      log(`✓ Vagas registradas`, 'success');

      // 5. AUTO-APPLY - Candidatar automaticamente
      const autoApplyJobs = jobsEnriched.filter(j => j.matchScore >= process.env.AUTO_APPLY_THRESHOLD);
      
      if (autoApplyJobs.length > 0) {
        log(`Etapa 5: Candidatando automaticamente (${autoApplyJobs.length} vagas)...`, 'job');
        
        for (const job of autoApplyJobs) {
          try {
            const applied = await this.applyToJob(job);
            if (applied) {
              log(`✓ Candidatura enviada: ${job.title} @ ${job.company}`, 'success');
              await this.db.markAsApplied(job.id);
            }
          } catch (error) {
            log(`Erro ao candidatar em ${job.title}: ${error.message}`, 'error');
          }
        }
      }

      // 6. SUMMARY
      log('═════════════════════════════════════════', 'info');
      log(`Ciclo completado em ${((Date.now() - startTime) / 1000).toFixed(2)}s`, 'success');
      log(`Resumo: ${jobs.length} coletadas → ${qualifiedJobs.length} qualificadas → ${autoApplyJobs.length} candidatadas`, 'info');
      log('═════════════════════════════════════════', 'info');

    } catch (error) {
      log(`Erro crítico no ciclo: ${error.message}`, 'error');
      log(error.stack, 'error');
    } finally {
      this.isRunning = false;
    }
  }

  async applyToJob(job) {
    try {
      // Tentar enviar email
      if (process.env.ENABLE_EMAIL === 'true') {
        const emailSent = await this.emailSender.sendApplication(job);
        if (emailSent) return true;
      }

      // Tentar preencher formulário web
      if (process.env.ENABLE_WEB_FORM === 'true' && job.applicationUrl) {
        const formFilled = await this.processor.fillApplicationForm(job);
        if (formFilled) return true;
      }

      return false;
    } catch (error) {
      throw error;
    }
  }

  startScheduler() {
    const intervalMs = parseInt(process.env.SCRAPE_INTERVAL) || 3600000; // 1 hora por padrão
    const intervalMinutes = Math.floor(intervalMs / 60000);

    log(`Scheduler configurado para rodar a cada ${intervalMinutes} minuto(s)`, 'info');

    // Rodar imediatamente
    this.runCycle();

    // Depois rodar em schedule
    cron.schedule(`*/${intervalMinutes} * * * *`, () => {
      this.runCycle();
    });

    log('Scheduler iniciado ✓', 'success');
  }
}

// ===== MAIN =====
async function main() {
  try {
    const system = new JobAutomationSystem();
    await system.initialize();
    system.startScheduler();

    // Manter o processo rodando
    process.on('SIGINT', () => {
      log('Sistema encerrado pelo usuário', 'warning');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      log('Sistema encerrado', 'warning');
      process.exit(0);
    });

  } catch (error) {
    log(`Erro fatal: ${error.message}`, 'error');
    process.exit(1);
  }
}

main();

export default JobAutomationSystem;
