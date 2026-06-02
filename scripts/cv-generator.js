import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Usar Deepseek via OpenAI SDK com endpoint customizado
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/beta'
});

// Funcao para carregar o CV Base do arquivo preenchido pelo usuario
const getBaseCV = () => {
  const cvPath = path.join(process.cwd(), 'data', 'base_cv.txt');
  if (fs.existsSync(cvPath)) {
    return fs.readFileSync(cvPath, 'utf8');
  }
  
  // Fallback seguro caso o arquivo tenha sido deletado
  return `${process.env.PROFILE_NAME || 'Candidato'}
Desenvolvedor(a)

${process.env.PROFILE_EMAIL || 'Email não informado'} | ${process.env.PROFILE_PHONE || 'Telefone não informado'}
GitHub: ${process.env.PROFILE_GITHUB || 'N/A'} | LinkedIn: ${process.env.PROFILE_LINKEDIN || 'N/A'}

RESUMO PROFISSIONAL
[Edite o arquivo data/base_cv.txt para adicionar seu resumo]

EXPERIENCIA PROFISSIONAL
[Edite o arquivo data/base_cv.txt para adicionar suas experiências]

COMPETENCIAS TECNICAS
[Edite o arquivo data/base_cv.txt para adicionar suas competências]`;
};

class CVGenerator {
  async calculateMatchScore(job) {
    try {
      const cvContent = getBaseCV();
      const prompt = `
Analise o match entre um perfil de desenvolvedor e uma descrição de vaga.

PERFIL DO DESENVOLVEDOR:
${cvContent.substring(0, 1000)}

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
        cv: getBaseCV() // Agora consome dinamicamente do arquivo editavel
      };
    } catch (error) {
      console.error(`Erro ao enriquecer vaga ${job.title}:`, error.message);
      return {
        ...job,
        matchScore: 50,
        personalizedNote: null,
        cv: getBaseCV(),
        error: error.message
      };
    }
  }
}

export default CVGenerator;

