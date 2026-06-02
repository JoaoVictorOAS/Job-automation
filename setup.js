#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════════╗
║        🚀 JOB AUTOMATION SYSTEM - SETUP INICIAL            ║
║                                                            ║
║  Sistema automatizado de candidatura a vagas remoto       ║
║  Com geração de CV, cover letter e envio de email          ║
╚════════════════════════════════════════════════════════════╝
`));

async function setup() {
  try {
    console.log(chalk.yellow('📋 Vamos configurar seu sistema...\n'));

    // 1. Verificar Node.js
    console.log(chalk.blue('1️⃣  Verificando Node.js...'));
    const version = process.version;
    console.log(chalk.green(`   ✓ Node.js ${version}\n`));

    // 2. Pedir DEEPSEEK_API_KEY
    console.log(chalk.blue('2️⃣  Configurar Deepseek API'));
    console.log(chalk.gray('   Obtenha em: https://platform.deepseek.com/'));
    const deepseekKey = await question('   Cole sua DEEPSEEK_API_KEY: ');
    
    if (!deepseekKey || deepseekKey.trim().length < 20) {
      console.log(chalk.red('   ❌ API key inválida'));
      process.exit(1);
    }
    console.log(chalk.green('   ✓ API key válida\n'));

    // 3. Pedir Gmail
    console.log(chalk.blue('3️⃣  Configurar Gmail'));
    console.log(chalk.gray('   Você já gerou uma App Password?'));
    console.log(chalk.gray('   Em: https://myaccount.google.com/apppasswords'));
    
    const gmailUser = await question('   Seu email Gmail: ');
    const gmailPassword = await question('   App Password (16 chars com espaços): ');
    
    if (gmailPassword.length < 15) {
      console.log(chalk.red('   ❌ App Password parece inválida'));
      process.exit(1);
    }
    console.log(chalk.green('   ✓ Gmail configurado\n'));

    // 4. Pedir Keywords
    console.log(chalk.blue('4️⃣  Filtros de Busca'));
    const keywords = await question('   Keywords (separadas por vírgula) [full stack developer,react developer,node.js developer]: ');
    const finalKeywords = keywords.trim() || 'full stack developer,react developer,node.js developer';
    console.log(chalk.green(`   ✓ Keywords: ${finalKeywords}\n`));

    // 5. Intervalo de Execução
    console.log(chalk.blue('5️⃣  Frequência de Execução'));
    console.log(chalk.gray('   1 = A cada hora (padrão)'));
    console.log(chalk.gray('   2 = A cada 30 minutos'));
    console.log(chalk.gray('   3 = A cada 15 minutos'));
    const frequency = await question('   Escolha (1/2/3): ');
    
    const intervals = {
      '1': 3600000,
      '2': 1800000,
      '3': 900000
    };
    const interval = intervals[frequency] || 3600000;
    console.log(chalk.green(`   ✓ Intervalo: ${interval}ms\n`));

    // 6. Gerar .env
    console.log(chalk.blue('6️⃣  Gerando arquivo .env...'));
    
    const envContent = `# ===== DEEPSEEK API =====
DEEPSEEK_API_KEY=${deepseekKey}
DEEPSEEK_MODEL=deepseek-chat

# ===== EMAIL CONFIGURATION =====
GMAIL_USER=${gmailUser}
GMAIL_PASSWORD=${gmailPassword}

# ===== DATABASE =====
DB_PATH=./data/jobs.db
LOG_PATH=./logs/automation.log

# ===== JOB SEARCH SETTINGS =====
SEARCH_KEYWORDS=${finalKeywords}
SEARCH_LOCATIONS=Remoto,Remote,Brasil
TARGET_SALARY_MIN=6000
TARGET_SALARY_MAX=50000

# ===== SCRAPING SETTINGS =====
SCRAPE_INTERVAL=${interval}
MIN_APPLICATION_MATCH=70
AUTO_APPLY_THRESHOLD=80

# ===== RESUME DATA =====
PROFILE_NAME=João Victor dos Santos Assis de Oliveira
PROFILE_EMAIL=dev.joaovictor.oas@gmail.com
PROFILE_PHONE=(66) 99900-1680
PROFILE_GITHUB=https://github.com/JoaoVictorOAS
PROFILE_LINKEDIN=https://www.linkedin.com/in/joao-victor-dos-santos-518289256/

# ===== FEATURES =====
ENABLE_EMAIL=true
ENABLE_WEB_FORM=true
ENABLE_PUPPETEER=true
HEADLESS_BROWSER=true
DEBUG_MODE=false
`;

    const envPath = path.join(__dirname, '.env');
    fs.writeFileSync(envPath, envContent);
    console.log(chalk.green(`   ✓ .env criado em: ${envPath}\n`));

    // 7. Criar diretórios
    console.log(chalk.blue('7️⃣  Criando diretórios...'));
    const dirs = ['./data', './logs', './resumes'];
    dirs.forEach(dir => {
      const fullPath = path.join(__dirname, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(chalk.green(`   ✓ ${dir}/`));
      }
    });
    console.log();

    // 8. Instalar dependências
    console.log(chalk.blue('8️⃣  Instalando dependências...'));
    console.log(chalk.gray('   (Isso pode levar alguns minutos)\n'));
    
    const { execSync } = await import('child_process');
    try {
      execSync('npm install', { 
        cwd: __dirname,
        stdio: 'inherit'
      });
      console.log(chalk.green('   ✓ Dependências instaladas\n'));
    } catch (error) {
      console.log(chalk.yellow('   ⚠️  Erro ao instalar. Tente manualmente: npm install\n'));
    }

    // 9. Summary
    console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════════╗
║                   ✅ SETUP COMPLETO!                       ║
╚════════════════════════════════════════════════════════════╝
`));

    console.log(chalk.green('✓ Configuração salva em: .env'));
    console.log(chalk.green('✓ Banco de dados: data/'));
    console.log(chalk.green('✓ Logs: logs/'));
    console.log(chalk.green('✓ CVs personalizados: resumes/\n'));

    console.log(chalk.cyan('🚀 PRÓXIMOS PASSOS:\n'));
    
    console.log(chalk.white('1. Teste a conexão Gmail:'));
    console.log(chalk.gray('   npm run test:email\n'));
    
    console.log(chalk.white('2. Rodando sistema (1ª vez):'));
    console.log(chalk.gray('   npm start\n'));
    
    console.log(chalk.white('3. Modo desenvolvimento (com nodemon):'));
    console.log(chalk.gray('   npm run dev\n'));

    console.log(chalk.yellow('📋 Leia o README para mais detalhes:'));
    console.log(chalk.gray('   cat README.md\n'));

    console.log(chalk.green('✨ Sistema pronto! Bom sorte nas candidaturas!\n'));

    rl.close();

  } catch (error) {
    console.error(chalk.red(`\n❌ Erro: ${error.message}`));
    rl.close();
    process.exit(1);
  }
}

setup();
