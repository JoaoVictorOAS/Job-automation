import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

class JobScraper {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };
  }

  // Funcao utilitaria para substituir o waitForTimeout do Puppeteer v22+
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scrapeIndeed() {
    try {
      console.log('[BUSCA] Scraping Indeed (via Puppeteer)...');
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setUserAgent(this.headers['User-Agent']);
      
      const jobs = [];
      const keywords = process.env.SEARCH_KEYWORDS.split(',');

      for (const keyword of keywords.slice(0, 2)) {
        const url = `https://br.indeed.com/jobs?q=${encodeURIComponent(keyword)}&l=Remoto`;
        
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
          await this.delay(3000); 

          const jobsData = await page.evaluate(() => {
            const results = [];
            document.querySelectorAll('.job_seen_beacon').forEach((el, i) => {
              if (i > 15) return;
              const titleEl = el.querySelector('.jobTitle span');
              const companyEl = el.querySelector('[data-testid="company-name"]');
              const salaryEl = el.querySelector('.salary-snippet-container');
              const descEl = el.querySelector('.jobMetaDataGroup, .job-snippet');
              const linkEl = el.querySelector('.jcs-JobTitle');

              results.push({
                id: linkEl ? linkEl.getAttribute('data-jk') : `indeed-${Date.now()}-${i}`,
                title: titleEl ? titleEl.textContent.trim() : '',
                company: companyEl ? companyEl.textContent.trim() : '',
                salary: salaryEl ? salaryEl.textContent.trim() : 'Nao informado',
                description: descEl ? descEl.textContent.trim() : ''
              });
            });
            return results;
          });

          jobsData.forEach(job => {
            if (job.title && job.company) {
              jobs.push({
                ...job,
                location: 'Remoto',
                url: `https://br.indeed.com/viewjob?jk=${job.id}`,
                source: 'indeed',
                postedDate: new Date(),
                applicationUrl: null
              });
            }
          });
        } catch (e) {
          console.warn(`[AVISO] Erro ao scraping Indeed para "${keyword}":`, e.message);
        }
      }
      await browser.close();
      return jobs;
    } catch (error) {
      console.error('[ERRO] Erro ao fazer scraping no Indeed:', error.message);
      return [];
    }
  }

  async scrapeBeBee() {
    try {
      console.log('[BUSCA] Scraping BeBee...');
      const jobs = [];
      const keywords = process.env.SEARCH_KEYWORDS.split(',').slice(0, 2);

      for (const keyword of keywords) {
        const url = `https://bebee.com/br/jobs/search/${encodeURIComponent(keyword)}`;

        try {
          const { data } = await axios.get(url, { headers: this.headers, timeout: 10000 });
          const $ = cheerio.load(data);

          $('[data-job-id], .job-item').each((i, el) => {
            if (i > 10) return;
            const $el = $(el);
            const titleEl = $el.find('.job-title, h2, [data-testid="job-title"]');
            const companyEl = $el.find('.company-name, [data-testid="company-name"]');

            const job = {
              id: `bebee-${Date.now()}-${i}`,
              title: titleEl.text().trim(),
              company: companyEl.text().trim(),
              location: 'Remoto',
              salary: $el.find('.salary, [data-testid="salary"]').text().trim() || 'Nao informado',
              description: $el.find('.job-description, p').text().trim(),
              url: $el.find('a').attr('href') || '',
              source: 'bebee',
              postedDate: new Date(),
              applicationUrl: null
            };

            if (job.title && job.company) {
              jobs.push(job);
            }
          });
        } catch (e) {
          if (e.response && e.response.status === 410) {
            console.warn(`[AVISO] BeBee alterou a rota de busca (Erro 410) para "${keyword}". Rota indisponivel.`);
          } else {
            console.warn(`[AVISO] Erro ao scraping BeBee para "${keyword}":`, e.message);
          }
        }
      }
      return jobs;
    } catch (error) {
      return [];
    }
  }

  async scrapeGlassdoor() {
    try {
      console.log('[BUSCA] Scraping Glassdoor...');
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });
      const page = await browser.newPage();
      await page.setUserAgent(this.headers['User-Agent']);
      
      const jobs = [];
      const keywords = process.env.SEARCH_KEYWORDS.split(',').slice(0, 1);

      for (const keyword of keywords) {
        const url = `https://www.glassdoor.com.br/Vaga/${encodeURIComponent(keyword)}-vagas-SRCH_KO0,${keyword.length}.htm`;

        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
          
          await this.delay(3000); 

          const jobsData = await page.evaluate(() => {
            const results = [];
            document.querySelectorAll('[data-job-id]').forEach((el, i) => {
              if (i > 10) return;
              
              results.push({
                id: el.getAttribute('data-job-id'),
                title: el.querySelector('[class*="jobTitle"]')?.textContent?.trim() || '',
                company: el.querySelector('[class*="employer"]')?.textContent?.trim() || '',
                salary: el.querySelector('[class*="salary"]')?.textContent?.trim() || 'Nao informado',
                description: el.querySelector('[class*="snippet"]')?.textContent?.trim() || ''
              });
            });
            return results;
          });

          jobsData.forEach(job => {
            if (job.title && job.company) {
              jobs.push({
                ...job,
                location: 'Remoto',
                url: `https://www.glassdoor.com.br/job/${job.id}`,
                source: 'glassdoor',
                postedDate: new Date(),
                applicationUrl: null
              });
            }
          });
        } catch (e) {
          console.warn(`[AVISO] Erro ao scraping Glassdoor para "${keyword}":`, e.message);
        }
      }

      await browser.close();
      return jobs;
    } catch (error) {
      console.error('[ERRO] Erro ao fazer scraping no Glassdoor:', error.message);
      return [];
    }
  }

  async scrapeLinkedIn() {
    try {
      console.log('[BUSCA] Scraping LinkedIn...');
      
      const liAtCookie = process.env.LINKEDIN_LI_AT;
      if (!liAtCookie) {
        console.warn('[AVISO] LINKEDIN_LI_AT nao configurado no .env. Pulando LinkedIn.');
        return [];
      }

      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });
      const page = await browser.newPage();
      await page.setUserAgent(this.headers['User-Agent']);
      
      // Injeta o cookie para emular que voce esta logado
      await page.setCookie({
        name: 'li_at',
        value: liAtCookie,
        domain: '.linkedin.com'
      });

      const jobs = [];
      // Limitamos a 1 keyword para evitar muitas requisicoes e risco de banimento
      const keywords = process.env.SEARCH_KEYWORDS.split(',').slice(0, 1);

      for (const keyword of keywords) {
        // f_WT=2 e o filtro interno do LinkedIn para vagas "Remotas"
        const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}&f_WT=2&location=Brasil`;
        
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
          await this.delay(5000); // Espera carregamento inicial

          const jobsData = await page.evaluate(async () => {
            const results = [];
            const jobCards = document.querySelectorAll('.job-card-container');
            
            // Limitado a 5 vagas por ciclo para evitar bloqueios da conta
            const limit = Math.min(jobCards.length, 5);
            
            for (let i = 0; i < limit; i++) {
              const card = jobCards[i];
              
              // Clica no card para a descricao carregar no painel direito
              card.click();
              
              // Pequena pausa artificial para a requisicao AJAX da descricao terminar
              await new Promise(r => setTimeout(r, 2000));
              
              const titleEl = card.querySelector('.job-card-list__title, .artdeco-entity-lockup__title');
              const companyEl = card.querySelector('.job-card-container__company-name, .artdeco-entity-lockup__subtitle');
              const linkEl = card.querySelector('a.job-card-container__link, a.job-card-list__title');
              const descEl = document.querySelector('.jobs-description__content, .jobs-description-content__text');
              
              if (titleEl && companyEl) {
                results.push({
                  id: card.getAttribute('data-job-id') || `li-${Date.now()}-${i}`,
                  title: titleEl.textContent.trim(),
                  company: companyEl.textContent.trim(),
                  salary: 'Nao informado',
                  description: descEl ? descEl.textContent.trim().substring(0, 1000) : 'Descricao nao carregada.',
                  linkHref: linkEl ? linkEl.href : null
                });
              }
            }
            return results;
          });

          jobsData.forEach(job => {
            jobs.push({
              ...job,
              location: 'Remoto',
              url: job.linkHref || `https://www.linkedin.com/jobs/view/${job.id}`,
              source: 'linkedin',
              postedDate: new Date(),
              applicationUrl: null
            });
          });

        } catch (e) {
          console.warn(`[AVISO] Erro ao scraping LinkedIn para "${keyword}":`, e.message);
        }
      }

      await browser.close();
      return jobs;
    } catch (error) {
      console.error('[ERRO] Erro ao fazer scraping no LinkedIn:', error.message);
      return [];
    }
  }

  async scrapeAllPlatforms() {
    console.log('\n[INICIO] Iniciando coleta de vagas...\n');
    
    const [
      indeedJobs,
      bebeeJobs,
      glassdoorJobs,
      linkedinJobs
    ] = await Promise.all([
      this.scrapeIndeed(),
      this.scrapeBeBee(),
      this.scrapeGlassdoor(),
      this.scrapeLinkedIn()
    ]);

    const allJobs = [
      ...indeedJobs,
      ...bebeeJobs,
      ...glassdoorJobs,
      ...linkedinJobs
    ];

    const uniqueJobs = Array.from(
      new Map(allJobs.map(job => [job.title + job.company, job])).values()
    );

    console.log(`\n[SUCESSO] Total de vagas coletadas: ${uniqueJobs.length}\n`);
    return uniqueJobs;
  }
}

export default JobScraper;
