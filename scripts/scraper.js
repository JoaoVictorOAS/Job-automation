import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

class JobScraper {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };
  }

  async scrapeIndeed() {
    try {
      console.log('🔍 Scraping Indeed...');
      const jobs = [];
      const keywords = process.env.SEARCH_KEYWORDS.split(',');

      for (const keyword of keywords.slice(0, 2)) {
        const url = `https://br.indeed.com/jobs?q=${encodeURIComponent(keyword)}&l=Remoto`;
        
        try {
          const { data } = await axios.get(url, { headers: this.headers, timeout: 10000 });
          const $ = cheerio.load(data);

          $('[data-job-id]').each((i, el) => {
            if (i > 15) return; // Limitar a 15 por keyword

            const $el = $(el);
            const job = {
              id: $el.attr('data-job-id'),
              title: $el.find('.jobTitle span').text().trim(),
              company: $el.find('[data-company-name]').text().trim(),
              location: 'Remoto',
              salary: $el.find('.salary-snippet').text().trim() || 'Não informado',
              description: $el.find('.job-snippet').text().trim(),
              url: `https://br.indeed.com/viewjob?jk=${$el.attr('data-job-id')}`,
              source: 'indeed',
              postedDate: new Date(),
              applicationUrl: null
            };

            if (job.title && job.company) {
              jobs.push(job);
            }
          });
        } catch (e) {
          console.warn(`Erro ao scraping Indeed para "${keyword}":`, e.message);
        }
      }

      return jobs;
    } catch (error) {
      console.error('Erro ao fazer scraping no Indeed:', error.message);
      return [];
    }
  }

  async scrapeBeBee() {
    try {
      console.log('🔍 Scraping BeBee...');
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
              salary: $el.find('.salary, [data-testid="salary"]').text().trim() || 'Não informado',
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
          console.warn(`Erro ao scraping BeBee para "${keyword}":`, e.message);
        }
      }

      return jobs;
    } catch (error) {
      console.error('Erro ao fazer scraping no BeBee:', error.message);
      return [];
    }
  }

  async scrapeGlassdoor() {
    try {
      console.log('🔍 Scraping Glassdoor...');
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      const jobs = [];

      const keywords = process.env.SEARCH_KEYWORDS.split(',').slice(0, 1);

      for (const keyword of keywords) {
        const url = `https://www.glassdoor.com.br/Vaga/${encodeURIComponent(keyword)}-vagas-SRCH_KO0,${keyword.length}.htm`;

        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
          await page.waitForTimeout(2000);

          const jobsData = await page.evaluate(() => {
            const jobs = [];
            document.querySelectorAll('[data-job-id]').forEach((el, i) => {
              if (i > 10) return;
              
              jobs.push({
                id: el.getAttribute('data-job-id'),
                title: el.querySelector('[class*="jobTitle"]')?.textContent?.trim() || '',
                company: el.querySelector('[class*="employer"]')?.textContent?.trim() || '',
                salary: el.querySelector('[class*="salary"]')?.textContent?.trim() || 'Não informado',
                description: el.querySelector('[class*="snippet"]')?.textContent?.trim() || ''
              });
            });
            return jobs;
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
          console.warn(`Erro ao scraping Glassdoor para "${keyword}":`, e.message);
        }
      }

      await browser.close();
      return jobs;
    } catch (error) {
      console.error('Erro ao fazer scraping no Glassdoor:', error.message);
      return [];
    }
  }

  async scrapeLinkedIn() {
    try {
      console.log('🔍 Scraping LinkedIn (limitado)...');
      // LinkedIn tem proteções rigorosas, aqui fazemos uma abordagem minimal
      // Para production, considere usar LinkedIn API oficial ou serviço de scraping
      
      const jobs = [];
      // Placeholder para implementação com login/session
      console.warn('⚠️  LinkedIn scraping requer autenticação - pulando para agora');
      
      return jobs;
    } catch (error) {
      console.error('Erro ao fazer scraping no LinkedIn:', error.message);
      return [];
    }
  }

  async scrapeAllPlatforms() {
    console.log('\n📋 Iniciando coleta de vagas...\n');
    
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

    // Remover duplicatas
    const uniqueJobs = Array.from(
      new Map(allJobs.map(job => [job.title + job.company, job])).values()
    );

    console.log(`\n✅ Total de vagas coletadas: ${uniqueJobs.length}\n`);
    
    return uniqueJobs;
  }
}

export default JobScraper;
