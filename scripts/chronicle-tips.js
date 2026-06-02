import DatabaseManager from './database.js';
import chalk from 'chalk';

class ChronicleTips {
  constructor() {
    this.db = new DatabaseManager();
  }

  async initialize() {
    await this.db.initialize();
  }

  async close() {
    await this.db.close();
  }

  /**
   * Get comprehensive usage pattern analysis
   */
  async analyzePatterns() {
    const patterns = {
      timeRange: null,
      sourcePerformance: {},
      matchScoreTrends: {},
      applicationMetrics: {},
      companyMetrics: {},
      skillAnalysis: {}
    };

    // Get all jobs
    const jobs = await this.getAllJobs();
    
    if (jobs.length === 0) {
      return null;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Filter jobs for analysis
    const recentJobs = jobs.filter(j => new Date(j.createdAt) >= thirtyDaysAgo);
    const allTimeJobs = jobs;

    patterns.timeRange = {
      recentDays: 30,
      recentJobsCount: recentJobs.length,
      allTimeJobsCount: allTimeJobs.length,
      analysisDate: now.toISOString()
    };

    // 1. Source Performance Analysis
    patterns.sourcePerformance = this.analyzeSourcePerformance(recentJobs);

    // 2. Match Score Trends
    patterns.matchScoreTrends = this.analyzeMatchScoreTrends(recentJobs, thirtyDaysAgo);

    // 3. Application Metrics
    patterns.applicationMetrics = this.analyzeApplicationMetrics(recentJobs);

    // 4. Company Metrics
    patterns.companyMetrics = this.analyzeCompanyMetrics(recentJobs);

    // 5. Skill/Keyword Analysis (from job titles and descriptions)
    patterns.skillAnalysis = this.analyzeSkillPatterns(recentJobs);

    return patterns;
  }

  /**
   * Analyze which job sources perform best
   */
  analyzeSourcePerformance(jobs) {
    const sourceStats = {};

    jobs.forEach(job => {
      if (!sourceStats[job.source]) {
        sourceStats[job.source] = {
          total: 0,
          applied: 0,
          avgMatchScore: 0,
          scores: []
        };
      }

      sourceStats[job.source].total++;
      if (job.status === 'applied') {
        sourceStats[job.source].applied++;
      }
      sourceStats[job.source].scores.push(job.matchScore);
    });

    // Calculate averages and success rates
    Object.keys(sourceStats).forEach(source => {
      const stats = sourceStats[source];
      stats.avgMatchScore = Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length);
      stats.successRate = Math.round((stats.applied / stats.total) * 100);
      delete stats.scores; // Remove raw scores
    });

    return sourceStats;
  }

  /**
   * Analyze match score trends over time
   */
  analyzeMatchScoreTrends(jobs, startDate) {
    const trendData = {
      average: 0,
      highest: 0,
      lowest: 100,
      percentageDistribution: {
        excellent: 0,  // 90-100
        good: 0,       // 75-89
        fair: 0,       // 60-74
        poor: 0        // <60
      }
    };

    let totalScore = 0;

    jobs.forEach(job => {
      const score = job.matchScore || 0;
      totalScore += score;
      trendData.highest = Math.max(trendData.highest, score);
      trendData.lowest = Math.min(trendData.lowest, score);

      if (score >= 90) trendData.percentageDistribution.excellent++;
      else if (score >= 75) trendData.percentageDistribution.good++;
      else if (score >= 60) trendData.percentageDistribution.fair++;
      else trendData.percentageDistribution.poor++;
    });

    trendData.average = jobs.length > 0 ? Math.round(totalScore / jobs.length) : 0;

    // Convert counts to percentages
    const total = jobs.length;
    if (total > 0) {
      Object.keys(trendData.percentageDistribution).forEach(key => {
        trendData.percentageDistribution[key] = Math.round((trendData.percentageDistribution[key] / total) * 100);
      });
    }

    return trendData;
  }

  /**
   * Analyze application success metrics
   */
  analyzeApplicationMetrics(jobs) {
    const metrics = {
      totalCollected: jobs.length,
      totalApplied: jobs.filter(j => j.status === 'applied').length,
      applicationRate: 0,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      appliedThisWeek: 0,
      salaryRanges: this.analyzeSalaryRanges(jobs)
    };

    metrics.applicationRate = metrics.totalCollected > 0 
      ? Math.round((metrics.totalApplied / metrics.totalCollected) * 100) 
      : 0;

    // Count applications from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    metrics.appliedThisWeek = jobs.filter(j => 
      j.status === 'applied' && new Date(j.appliedAt) >= sevenDaysAgo
    ).length;

    return metrics;
  }

  /**
   * Analyze company-related metrics
   */
  analyzeCompanyMetrics(jobs) {
    const companyStats = {};

    jobs.forEach(job => {
      if (!companyStats[job.company]) {
        companyStats[job.company] = {
          total: 0,
          applied: 0,
          avgMatchScore: 0,
          scores: []
        };
      }

      companyStats[job.company].total++;
      if (job.status === 'applied') {
        companyStats[job.company].applied++;
      }
      companyStats[job.company].scores.push(job.matchScore);
    });

    // Calculate statistics
    Object.keys(companyStats).forEach(company => {
      const stats = companyStats[company];
      stats.avgMatchScore = Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length);
      delete stats.scores;
    });

    // Sort by number of opportunities
    const sorted = Object.entries(companyStats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10); // Top 10 companies

    return Object.fromEntries(sorted);
  }

  /**
   * Analyze salary ranges from job listings
   */
  analyzeSalaryRanges(jobs) {
    const salaryData = {
      mentioned: 0,
      notMentioned: 0,
      ranges: []
    };

    jobs.forEach(job => {
      if (job.salary && job.salary.trim()) {
        salaryData.mentioned++;
        salaryData.ranges.push(job.salary);
      } else {
        salaryData.notMentioned++;
      }
    });

    return salaryData;
  }

  /**
   * Extract skill/keyword patterns from job titles
   */
  analyzeSkillPatterns(jobs) {
    const skillFrequency = {};
    const titleKeywords = [
      'React', 'Node.js', 'Python', 'Java', 'JavaScript', 'TypeScript',
      'Full Stack', 'Frontend', 'Backend', 'DevOps', 'AWS', 'Docker',
      'Kubernetes', 'MongoDB', 'PostgreSQL', 'SQL', 'API', 'REST',
      'GraphQL', 'Microservices', 'Cloud', 'Senior', 'Junior', 'Lead'
    ];

    jobs.forEach(job => {
      const titleLower = (job.title + ' ' + (job.description || '')).toLowerCase();
      titleKeywords.forEach(keyword => {
        if (titleLower.includes(keyword.toLowerCase())) {
          skillFrequency[keyword] = (skillFrequency[keyword] || 0) + 1;
        }
      });
    });

    // Sort by frequency
    const sorted = Object.entries(skillFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15); // Top 15 skills

    return Object.fromEntries(sorted);
  }

  /**
   * Generate personalized tips based on patterns
   */
  async generateTips(patterns) {
    const tips = [];

    if (!patterns) {
      tips.push({
        type: 'info',
        message: 'No job history found. Start applying to jobs to get personalized tips!'
      });
      return tips;
    }

    // 1. Source-based tips
    const topSources = Object.entries(patterns.sourcePerformance)
      .sort((a, b) => b[1].successRate - a[1].successRate);

    if (topSources.length > 0) {
      const bestSource = topSources[0];
      tips.push({
        type: 'success',
        message: `✨ Focus on ${bestSource[0]}: It has your highest success rate (${bestSource[1].successRate}%) with avg match score of ${bestSource[1].avgMatchScore}%`
      });

      const worstSource = topSources[topSources.length - 1];
      if (worstSource[1].successRate < 30) {
        tips.push({
          type: 'warning',
          message: `⚠️  ${worstSource[0]} has low success rate (${worstSource[1].successRate}%). Consider reducing focus there.`
        });
      }
    }

    // 2. Match score tips
    const avgScore = patterns.matchScoreTrends.average;
    if (avgScore < 60) {
      tips.push({
        type: 'warning',
        message: `📊 Your average match score is ${avgScore}%. Try refining your keywords or expanding your search criteria.`
      });
    } else if (avgScore >= 80) {
      tips.push({
        type: 'success',
        message: `🎯 Excellent! Your average match score is ${avgScore}%. Keep up the targeted search!`
      });
    }

    // 3. Application rate tips
    const appRate = patterns.applicationMetrics.applicationRate;
    if (appRate < 30) {
      tips.push({
        type: 'info',
        message: `📈 You're applying to ${appRate}% of collected jobs. Consider lowering your match threshold to apply more.`
      });
    }

    // 4. Pending jobs tip
    if (patterns.applicationMetrics.pendingJobs > 5) {
      tips.push({
        type: 'info',
        message: `💼 You have ${patterns.applicationMetrics.pendingJobs} pending jobs. Review and apply to promising opportunities!`
      });
    }

    // 5. Recent activity tip
    if (patterns.applicationMetrics.appliedThisWeek === 0) {
      tips.push({
        type: 'warning',
        message: `⏰ No applications this week. Consider running a job search cycle to stay active.`
      });
    } else {
      tips.push({
        type: 'success',
        message: `✅ Great activity! You've applied to ${patterns.applicationMetrics.appliedThisWeek} jobs this week.`
      });
    }

    // 6. Top companies tip
    const topCompanies = Object.entries(patterns.companyMetrics).slice(0, 3);
    if (topCompanies.length > 0) {
      const companies = topCompanies.map(c => c[0]).join(', ');
      tips.push({
        type: 'info',
        message: `🏢 Top opportunity sources: ${companies}. Keep watching these companies!`
      });
    }

    // 7. Skill frequency tip
    const topSkills = Object.entries(patterns.skillAnalysis).slice(0, 5);
    if (topSkills.length > 0) {
      const skills = topSkills.map(s => `${s[0]} (${s[1]})`).join(', ');
      tips.push({
        type: 'info',
        message: `🛠️  Most in-demand skills in your search: ${skills}`
      });
    }

    // 8. Salary transparency tip
    const salaryMetrics = patterns.applicationMetrics.salaryRanges;
    if (salaryMetrics.mentioned < salaryMetrics.notMentioned * 0.5) {
      tips.push({
        type: 'info',
        message: `💰 Only ${salaryMetrics.mentioned} job(s) mention salary. Adjust your filters to find transparency-friendly companies.`
      });
    }

    // 9. Match score distribution tips
    const excellent = patterns.matchScoreTrends.percentageDistribution.excellent;
    if (excellent < 20) {
      tips.push({
        type: 'warning',
        message: `🎯 Only ${excellent}% of opportunities are excellent matches. Consider broadening your search.`
      });
    }

    // 10. Collection vs Application ratio
    if (patterns.timeRange.recentJobsCount > 0) {
      const ratio = Math.round(patterns.applicationMetrics.totalApplied / patterns.timeRange.recentJobsCount * 100);
      if (ratio > 60) {
        tips.push({
          type: 'success',
          message: `🚀 High application rate (${ratio}%)! You're being selective and targeting quality opportunities.`
        });
      }
    }

    return tips;
  }

  /**
   * Get all jobs from database
   */
  getAllJobs() {
    return new Promise((resolve, reject) => {
      this.db.db.all(`SELECT * FROM jobs ORDER BY createdAt DESC`, (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      });
    });
  }

  /**
   * Format and display the chronicle tips
   */
  async displayChronicle() {
    console.log('\n');
    console.log(chalk.cyan('═══════════════════════════════════════════════════════'));
    console.log(chalk.cyan('         📜 CHRONICLE TIPS - Session Analysis Report'));
    console.log(chalk.cyan('═══════════════════════════════════════════════════════'));
    console.log('');

    const patterns = await this.analyzePatterns();
    const tips = await this.generateTips(patterns);

    if (!patterns) {
      console.log(chalk.yellow('No job history found yet. Start applying to generate insights!'));
      console.log('');
      return;
    }

    // Display Statistics
    console.log(chalk.bold('📊 Statistics (Last 30 Days):'));
    console.log(`   • Jobs Collected: ${chalk.cyan(patterns.timeRange.recentJobsCount)}`);
    console.log(`   • Jobs Applied: ${chalk.green(patterns.applicationMetrics.totalApplied)}`);
    console.log(`   • Application Rate: ${chalk.blue(patterns.applicationMetrics.applicationRate + '%')}`);
    console.log(`   • Avg Match Score: ${chalk.yellow(patterns.matchScoreTrends.average + '%')}`);
    console.log('');

    // Display Match Score Distribution
    console.log(chalk.bold('📈 Match Score Distribution:'));
    const dist = patterns.matchScoreTrends.percentageDistribution;
    console.log(`   • Excellent (90-100): ${chalk.green(dist.excellent + '%')}`);
    console.log(`   • Good (75-89): ${chalk.blue(dist.good + '%')}`);
    console.log(`   • Fair (60-74): ${chalk.yellow(dist.fair + '%')}`);
    console.log(`   • Poor (<60): ${chalk.red(dist.poor + '%')}`);
    console.log('');

    // Display Top Sources
    console.log(chalk.bold('🌐 Top Job Sources:'));
    Object.entries(patterns.sourcePerformance)
      .sort((a, b) => b[1].avgMatchScore - a[1].avgMatchScore)
      .slice(0, 3)
      .forEach(([source, stats]) => {
        console.log(`   • ${source}: ${stats.total} jobs, ${stats.applied} applied, Avg Match: ${stats.avgMatchScore}%`);
      });
    console.log('');

    // Display Top Companies
    if (Object.keys(patterns.companyMetrics).length > 0) {
      console.log(chalk.bold('🏢 Top Opportunity Sources:'));
      Object.entries(patterns.companyMetrics)
        .slice(0, 5)
        .forEach(([company, stats]) => {
          console.log(`   • ${company}: ${stats.total} opportunities (${stats.applied} applied)`);
        });
      console.log('');
    }

    // Display Top Skills
    if (Object.keys(patterns.skillAnalysis).length > 0) {
      console.log(chalk.bold('🛠️  Most In-Demand Skills:'));
      Object.entries(patterns.skillAnalysis)
        .slice(0, 8)
        .forEach(([skill, count]) => {
          console.log(`   • ${skill}: ${count} positions`);
        });
      console.log('');
    }

    // Display Tips
    console.log(chalk.bold('💡 Personalized Tips:'));
    tips.forEach((tip, index) => {
      let prefix = '○';
      let color = chalk.gray;

      if (tip.type === 'success') {
        prefix = '✓';
        color = chalk.green;
      } else if (tip.type === 'warning') {
        prefix = '!';
        color = chalk.yellow;
      } else if (tip.type === 'info') {
        prefix = 'ℹ';
        color = chalk.blue;
      }

      console.log(`   ${color(prefix)} ${tip.message}`);
    });

    console.log('');
    console.log(chalk.cyan('═══════════════════════════════════════════════════════'));
    console.log(chalk.gray(`Generated: ${new Date().toLocaleString()}`));
    console.log(chalk.cyan('═══════════════════════════════════════════════════════'));
    console.log('');
  }
}

// Main execution
async function main() {
  const chronicle = new ChronicleTips();

  try {
    await chronicle.initialize();
    await chronicle.displayChronicle();
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  } finally {
    await chronicle.close();
  }
}

main();

export default ChronicleTips;
