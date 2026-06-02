import OpenAI from 'openai';

// Usar Deepseek via OpenAI SDK com endpoint customizado
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/beta'
});

// CV Base do João Victor (FIXO - não será personalizado)
const BASE_CV = `JOÃO VICTOR DOS SANTOS ASSIS DE OLIVEIRA
Desenvolvedor Full Stack — PHP · React · TypeScript

Rondonópolis, MT | dev.joaovictor.oas@gmail.com | (66) 99900-1680
GitHub: github.com/JoaoVictorOAS | LinkedIn: linkedin.com/in/joao-victor-dos-santos-518289256

RESUMO PROFISSIONAL

Desenvolvedor Full Stack com experiência em PHP (Laravel/Adianti) e React/TypeScript, atuando em projetos de saúde, gestão clínica e sistemas empresariais. Estudante de Engenharia de Software (UFR). Instrutor acadêmico de IA/Deep Learning e revisor técnico de LLMs com foco em Clean Code e SOLID.

EXPERIÊNCIA PROFISSIONAL

Desenvolvedor Front-end React/TypeScript | Nov 2025 — Atual | Cathi Soluções · Remoto
• SPAs para saúde e gestão clínica (Mosaico): +93 mil requisições/dia em produção
• Arquitetura de front-end com componentes reutilizáveis e integração ao Supabase (BaaS)
• Otimização de performance e responsividade cross-device

Desenvolvedor de Sistemas PHP | Nov 2025 — Atual | SOGG Software
• Desenvolvimento de sistemas web empresariais em PHP/MySQL com POO
• Integração de APIs e correção de bugs críticos em sistemas legados

Revisor Técnico de IA | Dez 2025 — Atual | Revelo
• Validação técnica de outputs de LLMs, identificando alucinações e falhas conceituais
• Refinamento via RLHF com critérios de Clean Code, SOLID e benchmarking de qualidade

COMPETÊNCIAS TÉCNICAS

Back-end: PHP, Laravel, Adianti, Node.js, Java
Front-end: React, TypeScript, JavaScript
Bancos de Dados: MySQL, PostgreSQL, PL/SQL
DevOps & Tools: Git, Docker, CI/CD, Google Cloud
Testes & Qualidade: JUnit, Clean Code, SOLID
IA/ML: Python, TensorFlow, PyTorch, LLMs

FORMAÇÃO ACADÊMICA

Engenharia de Software | UFR | 2024 — 2028
Técnico em Informática | IFMT | 2020 — 2023

IDIOMAS

Inglês — B1 (Intermediário) | Mandarim — A1 (Básico)`;

class CVGenerator {
  async calculateMatchScore(job) {
    try {
      const prompt = `
Analise o match entre um perfil de desenvolvedor e uma descrição de vaga.

PERFIL DO DESENVOLVEDOR:
- Full Stack Developer (React/TypeScript, PHP, Node.js)
- Experiência em produção: 93k requisições/dia
- Stack: React, TypeScript, Node.js, PHP (Adianti), PostgreSQL, Docker
- Instrutor de IA/Deep Learning
- Revisor técnico de LLMs
- ~1-2 anos de experiência profissional focada

VAGA:
Título: ${job.title}
Empresa: ${job.company}
Descrição: ${job.description}
Requisitos: ${job.requirements || 'N/A'}

Retorne APENAS um número entre 0-100 indicando o match.`;

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
      const score = parseInt(scoreText) || 50;
      return Math.min(100, Math.max(0, score));
    } catch (error) {
      console.warn('Erro ao calcular match score:', error.message);
      return 50;
    }
  }

  async generatePersonalizedNote(job) {
    try {
      // Gerar uma nota curta e personalizada (economia de tokens)
      const prompt = `
Gere uma nota CURTA de 1-2 linhas personalizando uma candidatura.

VAGA: ${job.title} @ ${job.company}
DESCRIÇÃO: ${job.description.substring(0, 200)}

Crie uma frase que mostre interesse genuíno na vaga e por quê o candidato é um bom fit.
Retorne APENAS a frase (em português), sem aspas ou formatação.`;

      const message = await client.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return message.choices[0].message.content.trim();
    } catch (error) {
      console.warn('Erro ao gerar nota:', error.message);
      return `Estou muito interessado na posição de ${job.title} na ${job.company}.`;
    }
  }

  async enrichJob(job) {
    try {
      // Calcular match score
      const matchScore = await this.calculateMatchScore(job);
      
      // Gerar nota personalizada apenas se match é bom
      let personalizedNote = null;
      if (matchScore >= 70) {
        personalizedNote = await this.generatePersonalizedNote(job);
      }

      return {
        ...job,
        matchScore,
        personalizedNote,
        cv: BASE_CV // CV fixo, não personalizado
      };
    } catch (error) {
      console.error(`Erro ao enriquecer vaga ${job.title}:`, error.message);
      return {
        ...job,
        matchScore: 50,
        personalizedNote: null,
        cv: BASE_CV,
        error: error.message
      };
    }
  }
}

export default CVGenerator;

