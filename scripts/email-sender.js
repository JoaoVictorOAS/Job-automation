import nodemailer from 'nodemailer';
import fs from 'fs';

class EmailSender {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
      }
    });
  }

  async sendApplication(job) {
    try {
      // Detectar email de candidatura
      const applicationEmail = this.extractApplicationEmail(job);
      
      if (!applicationEmail) {
        console.warn(`⚠️  Nenhum email de candidatura encontrado para ${job.title}`);
        return false;
      }

      const subject = `Candidatura: ${job.title} - ${process.env.PROFILE_NAME}`;
      
      // Nota personalizada (se disponível)
      const personalNote = job.personalizedNote 
        ? `<p>${job.personalizedNote}</p>`
        : '';

      let htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <p>Olá,</p>
          
          <p>Meu nome é <strong>${process.env.PROFILE_NAME}</strong>, sou Desenvolvedor Full Stack com experiência em sistemas de produção de alta demanda.</p>
          
          <p>Estou muito interessado na posição de <strong>${job.title}</strong> na <strong>${job.company}</strong>.</p>
          
          ${personalNote}
          
          <p><strong>Alguns destaques do meu perfil:</strong></p>
          <ul>
            <li>Experiência em produção com 93k requisições/dia (React, Node.js, PostgreSQL)</li>
            <li>Stack diversificada: PHP (Adianti), React/TypeScript, Node.js, Docker</li>
            <li>Instrutor de IA/Deep Learning</li>
            <li>Revisor técnico de LLMs</li>
            <li>Projetos open-source (Acheinaufr, Void Software)</li>
          </ul>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p><strong>Contato:</strong></p>
          <ul>
            <li>Email: ${process.env.PROFILE_EMAIL}</li>
            <li>Telefone: ${process.env.PROFILE_PHONE}</li>
            <li>GitHub: ${process.env.PROFILE_GITHUB}</li>
            <li>LinkedIn: ${process.env.PROFILE_LINKEDIN}</li>
          </ul>
          
          <p>Meu CV está em anexo. Fico à disposição para uma conversa!</p>
          
          <p>Obrigado pela consideração.<br/>
          <strong>${process.env.PROFILE_NAME}</strong></p>
        </div>
      `;

      // Salvar CV em arquivo temporário se não existir
      let cvPath = null;
      if (job.cv) {
        cvPath = `/tmp/CV_${Date.now()}.txt`;
        fs.writeFileSync(cvPath, job.cv);
      }

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: applicationEmail,
        subject: subject,
        html: htmlBody,
        attachments: cvPath ? [{
          filename: `CV_${process.env.PROFILE_NAME.replace(/\s+/g, '_')}.txt`,
          path: cvPath
        }] : []
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`✉️  Email enviado para ${applicationEmail} (${job.company})`);
      
      // Limpar arquivo temporário
      if (cvPath) {
        fs.unlinkSync(cvPath);
      }
      
      return true;

    } catch (error) {
      console.error(`Erro ao enviar email para ${job.company}:`, error.message);
      return false;
    }
  }

  extractApplicationEmail(job) {
    // Procurar por email na descrição
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const matches = job.description.match(emailRegex);
    
    if (matches && matches.length > 0) {
      // Priorizar emails que parecem RH/careers
      const hrEmails = matches.filter(e => 
        e.toLowerCase().includes('rh') || 
        e.toLowerCase().includes('careers') || 
        e.toLowerCase().includes('jobs') ||
        e.toLowerCase().includes('hiring')
      );
      
      return hrEmails[0] || matches[0];
    }

    // Tentar extrair do site da empresa
    if (job.company) {
      const companyName = job.company.toLowerCase().replace(/\s+/g, '');
      return `careers@${companyName}.com.br`;
    }

    return null;
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Conexão Gmail verificada');
      return true;
    } catch (error) {
      console.error('❌ Erro na conexão Gmail:', error.message);
      console.error('Verifique se APP_PASSWORD está correto em: https://myaccount.google.com/apppasswords');
      return false;
    }
  }
}

export default EmailSender;
