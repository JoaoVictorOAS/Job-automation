import sqlite3 from 'sqlite3';
import fs from 'fs';

class DatabaseManager {
  constructor() {
    this.dbPath = process.env.DB_PATH || './data/jobs.db';
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Criar tabelas se não existirem
        this.createTables()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  async createTables() {
    const createJobsTable = `
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT,
        company TEXT,
        location TEXT,
        salary TEXT,
        description TEXT,
        source TEXT,
        url TEXT,
        applicationUrl TEXT,
        matchScore INTEGER,
        status TEXT DEFAULT 'pending',
        appliedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createApplicationsTable = `
      CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jobId TEXT,
        method TEXT,
        status TEXT,
        response TEXT,
        appliedAt DATETIME,
        responseAt DATETIME,
        FOREIGN KEY (jobId) REFERENCES jobs(id)
      )
    `;

    const createCVsTable = `
      CREATE TABLE IF NOT EXISTS cvs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jobId TEXT,
        fileName TEXT,
        filePath TEXT,
        customizedContent TEXT,
        coverLetter TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (jobId) REFERENCES jobs(id)
      )
    `;

    const createStatsTable = `
      CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycleDate DATE,
        jobsCollected INTEGER,
        jobsQualified INTEGER,
        jobsApplied INTEGER,
        successRate REAL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createJobsTable, (err) => {
          if (err) reject(err);
        });
        
        this.db.run(createApplicationsTable, (err) => {
          if (err) reject(err);
        });
        
        this.db.run(createCVsTable, (err) => {
          if (err) reject(err);
        });
        
        this.db.run(createStatsTable, (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    });
  }

  async saveJob(job) {
    return new Promise((resolve, reject) => {
      const {
        id, title, company, location, salary, description, 
        source, url, applicationUrl, matchScore, customizedCV, 
        coverLetter, cvPath, cvFileName
      } = job;

      // Salvar job
      this.db.run(
        `INSERT OR REPLACE INTO jobs (id, title, company, location, salary, description, source, url, applicationUrl, matchScore)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, title, company, location, salary, description, source, url, applicationUrl, matchScore],
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Salvar CV customizado
          if (customizedCV) {
            this.db.run(
              `INSERT INTO cvs (jobId, fileName, filePath, customizedContent, coverLetter)
               VALUES (?, ?, ?, ?, ?)`,
              [id, cvFileName, cvPath, customizedCV, coverLetter || null],
              (err) => {
                if (err) reject(err);
                resolve();
              }
            );
          } else {
            resolve();
          }
        }
      );
    });
  }

  async markAsApplied(jobId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE jobs SET status = 'applied', appliedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [jobId],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  async recordApplication(jobId, method, status, response = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO applications (jobId, method, status, response, appliedAt)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [jobId, method, status, response],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  async getJobStats(days = 30) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
          AVG(matchScore) as avgMatchScore,
          MAX(matchScore) as maxMatchScore
         FROM jobs
         WHERE date(createdAt) >= date('now', '-' || ? || ' days')`,
        [days],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows[0] || {});
        }
      );
    });
  }

  async getPendingJobs() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM jobs WHERE status = 'pending' ORDER BY matchScore DESC`,
        (err, rows) => {
          if (err) reject(err);
          resolve(rows || []);
        }
      );
    });
  }

  async getAppliedJobs() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM jobs WHERE status = 'applied' ORDER BY appliedAt DESC`,
        (err, rows) => {
          if (err) reject(err);
          resolve(rows || []);
        }
      );
    });
  }

  async exportStatistics() {
    return new Promise((resolve, reject) => {
      const stats = {
        timestamp: new Date().toISOString(),
        jobs: {},
        summary: {}
      };

      // Get all jobs
      this.db.all(`SELECT * FROM jobs`, (err, jobs) => {
        if (err) {
          reject(err);
          return;
        }

        stats.jobs = jobs;
        
        // Get applications
        this.db.all(`SELECT * FROM applications`, (err, apps) => {
          if (err) {
            reject(err);
            return;
          }

          stats.applications = apps;

          // Summary
          stats.summary = {
            totalJobs: jobs.length,
            totalApplied: jobs.filter(j => j.status === 'applied').length,
            averageMatchScore: jobs.reduce((acc, j) => acc + j.matchScore, 0) / jobs.length,
            jobsByCompany: jobs.reduce((acc, j) => {
              acc[j.company] = (acc[j.company] || 0) + 1;
              return acc;
            }, {}),
            jobsBySource: jobs.reduce((acc, j) => {
              acc[j.source] = (acc[j.source] || 0) + 1;
              return acc;
            }, {})
          };

          resolve(stats);
        });
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default DatabaseManager;
