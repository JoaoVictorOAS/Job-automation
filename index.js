import dotenv from 'dotenv';
dotenv.config();

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

const dirs = ['./data', './logs', './resumes'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const log = (msg, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: chalk.blue('[INFO] '),
    success: chalk.green('[SUCESSO] '),
    error: chalk.red('[ERRO] '),
    warning: chalk.yellow('[AVISO] '),
    job: chalk.cyan('[VAGA] ')
  }[type] || chalk.gray('[LOG] ');

  const message = `${timestamp} ${prefix}${msg}`;
  console.log(message);

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
      log('Inicializando sistema de automacao de candidaturas...', 'info');
      
      await this.db.initialize();
      log('Banco de dados inicializado', 'success');

      // Validacao corrigida para a chave do Deepseek
      if (!process.env.DEEPSEEK_API_KEY) {
        throw new Error('DEEPSEEK_API_KEY nao esta definida no .env');
      }
      if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) {
        throw new Error('Credenciais Gmail nao estao definidas no .env');
      }

      log('Credenciais validadas', 'success');
      log('Sistema pronto para iniciar', 'success');

      return true;
    } catch (error) {
      log(`Erro na inicializacao: ${error.message}`, 'error');
      throw error;
    }
  }

  async runCycle() {
    if (this.isRunning) {
      log('Ciclo ja esta em execucao, ignorando...', 'warning');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      log('=========================================', 'info');
      log('Iniciando ciclo de automacao', 'info');
      log('=========================================', 'info');

      log('Etapa 1: Coletando vagas...', 'job');
      const jobs = await this.scraper.scrapeAllPlatforms();
      log(`[OK] ${jobs.length} vagas coletadas`, 'success');

      if (jobs.length === 0) {
        log('Nenhuma vaga encontrada neste ciclo', 'warning');
        this.isRunning = false;
        return;
      }

      log('Etapa 2: Analisando vagas...', 'job');
      const qualifiedJobs = await this.processor.processJobs(jobs);
      log(`[OK] ${qualifiedJobs.length} vagas qualificadas (score >= ${process.env.MIN_APPLICATION_MATCH || 70})`, 'success');

      if (qualifiedJobs.length === 0) {
        log('Nenhuma vaga atende aos criterios', 'warning');
        this.isRunning = false;
        return;
      }

      log('Etapa 3: Analisando vagas e gerando notas personalizadas...', 'job');
      const jobsEnriched = await Promise.all(
        qualifiedJobs.map(job => this.cvGenerator.enrichJob(job))
      );
      log(`[OK] ${jobsEnriched.length} vagas analisadas`, 'success');

      log('Etapa 4: Registrando vagas no banco de dados...', 'job');
      for (const job of jobsEnriched) {
        await this.db.saveJob(job);
      }
      log(`[OK] Vagas registradas`, 'success');

      const autoApplyThreshold = parseInt(process.env.AUTO_APPLY_THRESHOLD) || 80;
      const autoApplyJobs = jobsEnriched.filter(j => j.matchScore >= autoApplyThreshold);
      
      if (autoApplyJobs.length > 0) {
        log(`Etapa 5: Candidatando automaticamente (${autoApplyJobs.length} vagas)...`, 'job');
        
        for (const job of autoApplyJobs) {
          try {
            const applied = await this.applyToJob(job);
            if (applied) {
              log(`[OK] Candidatura enviada: ${job.title} @ ${job.company}`, 'success');
              await this.db.markAsApplied(job.id);
            }
          } catch (error) {
            log(`Erro ao candidatar em ${job.title}: ${error.message}`, 'error');
          }
        }
      }

      log('=========================================', 'info');
      log(`Ciclo completado em ${((Date.now() - startTime) / 1000).toFixed(2)}s`, 'success');
      log(`Resumo: ${jobs.length} coletadas -> ${qualifiedJobs.length} qualificadas -> ${autoApplyJobs.length} candidatadas`, 'info');
      log('=========================================', 'info');

    } catch (error) {
      log(`Erro critico no ciclo: ${error.message}`, 'error');
      log(error.stack, 'error');
    } finally {
      this.isRunning = false;
    }
  }

  async applyToJob(job) {
    try {
      if (process.env.ENABLE_EMAIL === 'true') {
        const emailSent = await this.emailSender.sendApplication(job);
        if (emailSent) return true;
      }

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
    const intervalMs = parseInt(process.env.SCRAPE_INTERVAL) || 3600000;
    const intervalMinutes = Math.floor(intervalMs / 60000);

    log(`Scheduler configurado para rodar a cada ${intervalMinutes} minuto(s)`, 'info');

    this.runCycle();

    cron.schedule(`*/${intervalMinutes} * * * *`, () => {
      this.runCycle();
    });

    log('Scheduler iniciado [OK]', 'success');
  }
}

async function main() {
  try {
    const system = new JobAutomationSystem();
    await system.initialize();
    system.startScheduler();

    process.on('SIGINT', () => {
      log('Sistema encerrado pelo usuario', 'warning');
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
