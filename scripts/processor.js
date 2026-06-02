import OpenAI from 'openai';
import puppeteer from 'puppeteer';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/beta'
});

class JobProcessor {
  async processJobs(jobs) {
    const qualifiedJobs = [];
    const minMatch = parseInt(process.env.MIN_APPLICATION_MATCH) || 70;

    for (const job of jobs) {
      try {
        const matchScore = await this.analyzeJobRelevance(job);
        
        if (matchScore >= minMatch) {
          qualifiedJobs.push({
            ...job,
            matchScore,
            requirements: await this.extractRequirements(job)
          });
        }
      } catch (error) {
        console.warn(`Erro ao processar ${job.title}:`, error.message);
      }
    }

    // Ordenar por relevância
    return qualifiedJobs.sort((a, b) => b.matchScore - a.matchScore);
  }

  async analyzeJobRelevance(job) {
    try {
      const profile = `
      Full Stack Developer com experiência em:
      - React/TypeScript em produção (93k req/dia)
      - PHP (Laravel/Adianti) em sistemas empresariais
      - Node.js
      - PostgreSQL/MySQL
      - Docker/CI-CD
      - Python/TensorFlow (IA/ML)
      - Instrutor de IA e revisor técnico de LLMs
      - ~1-2 anos de experiência profissional focada
      `;

      const prompt = `
Analise a relevância dessa vaga para meu perfil (0-100).

PERFIL:
${profile}

VAGA:
Título: ${job.title}
Empresa: ${job.company}
Descrição: ${job.description}
Salário: ${job.salary}

Retorne APENAS um número de 0-100.`;

      const message = await client.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const scoreText = message.choices[0].message.content.trim();
      return Math.min(100, Math.max(0, parseInt(scoreText) || 50));
    } catch (error) {
      console.warn('Erro ao analisar relevância:', error.message);
      return 50;
    }
  }

  async extractRequirements(job) {
    try {
      const prompt = `
Extraia os requisitos principais dessa vaga (máximo 10, um por linha).

DESCRIÇÃO:
${job.description}

Retorne APENAS os requisitos em lista simples.`;

      const message = await client.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return message.choices[0].message.content;
    } catch (error) {
      return 'Requisitos não extraídos';
    }
  }

  async fillApplicationForm(job) {
    if (!process.env.ENABLE_WEB_FORM || process.env.ENABLE_WEB_FORM === 'false') {
      return false;
    }

    let browser;
    try {
      browser = await puppeteer.launch({ 
        headless: process.env.HEADLESS_BROWSER !== 'false',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.goto(job.applicationUrl, { waitUntil: 'networkidle2', timeout: 15000 });

      // Tentar preencher campos comuns
      const filled = await page.evaluate((profile) => {
        const fillField = (selector, value) => {
          const el = document.querySelector(selector);
          if (el) {
            el.value = value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }
          return false;
        };

        let count = 0;

        // Email
        const emailSelectors = ['[name="email"]', '[type="email"]', '[placeholder*="email"]'];
        for (const sel of emailSelectors) {
          if (fillField(sel, profile.email)) count++;
        }

        // Nome
        const nameSelectors = ['[name="name"]', '[name="full_name"]', '[placeholder*="name"]'];
        for (const sel of nameSelectors) {
          if (fillField(sel, profile.name)) count++;
        }

        // Telefone
        const phoneSelectors = ['[name="phone"]', '[type="tel"]', '[placeholder*="phone"]'];
        for (const sel of phoneSelectors) {
          if (fillField(sel, profile.phone)) count++;
        }

        // GitHub
        const githubSelectors = ['[name="github"]', '[placeholder*="github"]'];
        for (const sel of githubSelectors) {
          if (fillField(sel, profile.github)) count++;
        }

        // LinkedIn
        const linkedinSelectors = ['[name="linkedin"]', '[placeholder*="linkedin"]'];
        for (const sel of linkedinSelectors) {
          if (fillField(sel, profile.linkedin)) count++;
        }

        return count > 0;
      }, {
        email: process.env.PROFILE_EMAIL,
        name: process.env.PROFILE_NAME,
        phone: process.env.PROFILE_PHONE,
        github: process.env.PROFILE_GITHUB,
        linkedin: process.env.PROFILE_LINKEDIN
      });

      if (filled) {
        // Tentar enviar formulário
        const submitted = await page.evaluate(() => {
          const submitBtn = document.querySelector('button[type="submit"]') || 
                           document.querySelector('button:contains("Submit")') ||
                           document.querySelector('button:contains("Enviar")');
          
          if (submitBtn) {
            submitBtn.click();
            return true;
          }
          return false;
        });

        if (submitted) {
          console.log(`✓ Formulário preenchido e enviado para ${job.company}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.warn(`Erro ao preencher formulário ${job.applicationUrl}:`, error.message);
      return false;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

export default JobProcessor;
