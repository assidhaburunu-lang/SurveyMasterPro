import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import DatabaseConstructor from 'better-sqlite3';
const Database = (DatabaseConstructor as any).default || DatabaseConstructor;

import multerModule from 'multer';
const multer = (multerModule as any).default || multerModule;

import * as XLSXModule from 'xlsx';
const XLSX = (XLSXModule as any).default || XLSXModule;
const { readFile, utils, set_fs } = XLSX;

import jwtModule from 'jsonwebtoken';
const jwt = (jwtModule as any).default || jwtModule;

import bcryptModule from 'bcryptjs';
const bcrypt = (bcryptModule as any).default || bcryptModule;

import * as fs from 'fs';
import path from 'path';

// Set fs for xlsx to ensure readFile works in Node environment
if (set_fs) {
  set_fs(fs);
}

interface AuthRequest extends Request {
  user?: any;
}

const db = new Database('survey.db');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const upload = multer({ dest: 'uploads/' });

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    role TEXT CHECK(role IN ('admin', 'respondent'))
  );

  CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    is_public INTEGER DEFAULT 0,
    language TEXT DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_id INTEGER,
    text TEXT,
    type TEXT CHECK(type IN ('mcq', 'text', 'date', 'number', 'time')),
    question_order INTEGER,
    FOREIGN KEY(survey_id) REFERENCES surveys(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER,
    text TEXT,
    next_question_order INTEGER,
    FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    submission_id TEXT,
    question_id INTEGER,
    answer TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(question_id) REFERENCES questions(id)
  );

  CREATE TABLE IF NOT EXISTS survey_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    survey_id INTEGER,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, survey_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(survey_id) REFERENCES surveys(id) ON DELETE CASCADE
  );
`);

// Migration: Update questions table CHECK constraint to include 'time'
try {
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='questions'").get();
  if (tableInfo && tableInfo.sql && !tableInfo.sql.includes("'time'")) {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      BEGIN TRANSACTION;
      CREATE TABLE questions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        survey_id INTEGER,
        text TEXT,
        type TEXT CHECK(type IN ('mcq', 'text', 'date', 'number', 'time')),
        question_order INTEGER,
        FOREIGN KEY(survey_id) REFERENCES surveys(id) ON DELETE CASCADE
      );
      INSERT INTO questions_new (id, survey_id, text, type, question_order)
      SELECT id, survey_id, text, type, question_order FROM questions;
      DROP TABLE questions;
      ALTER TABLE questions_new RENAME TO questions;
      COMMIT;
      PRAGMA foreign_keys=ON;
    `);
  }
} catch (e) {
  console.error("Migration failed for questions table:", e);
}

// Migration: Add language to surveys if not exists
try {
  db.prepare("ALTER TABLE surveys ADD COLUMN language TEXT DEFAULT 'en'").run();
} catch (e) {}

// Migration: Add submission_id to responses if not exists
try {
  db.prepare('ALTER TABLE responses ADD COLUMN submission_id TEXT').run();
} catch (e) {}

// Migration: Add is_public to surveys if not exists
try {
  db.prepare('ALTER TABLE surveys ADD COLUMN is_public INTEGER DEFAULT 0').run();
} catch (e) {}

// Migration: Add next_question_order to options if not exists
try {
  db.exec('ALTER TABLE options ADD COLUMN next_question_order INTEGER');
} catch (e) {}

// Migration: Add survey_id to questions if not exists
try {
  db.exec('ALTER TABLE questions ADD COLUMN survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE');
} catch (e) {}

// Migration: Ensure at least one survey exists if there are questions
const surveyCount = db.prepare('SELECT COUNT(*) as count FROM surveys').get() as any;
if (surveyCount.count === 0) {
  const result = db.prepare('INSERT INTO surveys (title, description) VALUES (?, ?)').run('Default Survey', 'Initial survey created during migration');
  const defaultSurveyId = result.lastInsertRowid;
  db.prepare('UPDATE questions SET survey_id = ? WHERE survey_id IS NULL').run(defaultSurveyId);
}

// Seed Admin if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Middleware
  const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  };

  // Auth Routes
  app.post('/api/register', (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, 'respondent');
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: 'Username already exists' });
    }
  });

  app.post('/api/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });

  // Admin: Survey Management
  app.get('/api/admin/surveys', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const surveys = db.prepare('SELECT * FROM surveys ORDER BY created_at DESC').all();
    res.json(surveys);
  });

  app.post('/api/admin/surveys', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { title, description, is_public, language } = req.body;
    try {
      const result = db.prepare('INSERT INTO surveys (title, description, is_public, language) VALUES (?, ?, ?, ?)').run(title, description, is_public ? 1 : 0, language || 'en');
      res.json({ id: result.lastInsertRowid, title, description, is_public, language: language || 'en' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/admin/surveys/:id', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
      db.prepare('DELETE FROM surveys WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/admin/surveys/:id', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { title, description, is_public, language } = req.body;
    try {
      db.prepare('UPDATE surveys SET title = ?, description = ?, is_public = ?, language = ? WHERE id = ?').run(title, description, is_public ? 1 : 0, language || 'en', id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Admin: Upload Questions
  app.post('/api/admin/surveys/:surveyId/upload', authenticate, isAdmin, upload.single('file'), (req: AuthRequest, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { surveyId } = req.params;
    const filePath = req.file.path;

    try {
      const workbook = readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error('Excel file is empty');

      const worksheet = workbook.Sheets[sheetName];
      const rawData: any[][] = utils.sheet_to_json(worksheet, { header: 1 });
      if (rawData.length < 2) throw new Error('Excel file must have a header row and at least one data row');

      const headers = rawData[0].map(h => String(h).toLowerCase().trim());
      const dataRows = rawData.slice(1);

      const textIdx = headers.indexOf('text');
      const typeIdx = headers.indexOf('type');
      const optionsIdx = headers.indexOf('options');

      if (textIdx === -1 || typeIdx === -1) {
        throw new Error('Excel file must contain "text" and "type" columns');
      }

      const validTypes = ['mcq', 'text', 'date', 'time', 'number'];
      const processedData = dataRows.map(row => ({
        text: row[textIdx],
        type: String(row[typeIdx] || '').toLowerCase().trim(),
        options: optionsIdx !== -1 ? row[optionsIdx] : null
      })).filter(row => row.text && validTypes.includes(row.type));

      if (processedData.length === 0) {
        throw new Error('No valid questions found.');
      }

      // Clear existing questions for this survey
      const existingQuestions = db.prepare('SELECT id FROM questions WHERE survey_id = ?').all(surveyId);
      const questionIds = existingQuestions.map((q: any) => q.id);
      if (questionIds.length > 0) {
        db.prepare(`DELETE FROM options WHERE question_id IN (${questionIds.join(',')})`).run();
        db.prepare('DELETE FROM questions WHERE survey_id = ?').run(surveyId);
      }

      const insertQuestion = db.prepare('INSERT INTO questions (survey_id, text, type, question_order) VALUES (?, ?, ?, ?)');
      const insertOption = db.prepare('INSERT INTO options (question_id, text, next_question_order) VALUES (?, ?, ?)');

      const transaction = db.transaction((questions) => {
        questions.forEach((q: any, index: number) => {
          const result = insertQuestion.run(surveyId, q.text, q.type, index);
          const questionId = result.lastInsertRowid;

          if (q.type === 'mcq' && q.options) {
            // Split by standard comma (,) or Arabic comma (،) used in Dhivehi
            const opts = q.options.toString().split(/[,،]/).map((o: string) => o.trim()).filter((o: string) => o);
            opts.forEach((optStr: string) => {
              let text = optStr;
              let nextOrder = null;
              const jumpMatch = optStr.match(/\[Jump:(\d+)\]/);
              if (jumpMatch) {
                text = optStr.replace(jumpMatch[0], '').trim();
                nextOrder = parseInt(jumpMatch[1]) - 1;
              }
              insertOption.run(questionId, text, nextOrder);
            });
          }
        });
      });

      transaction(processedData);
      res.json({ success: true, count: processedData.length });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });

  // Admin: Create Individual Question
  app.post('/api/admin/surveys/:surveyId/questions', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { surveyId } = req.params;
    const { text, type, options } = req.body; // options is an array of strings for mcq
    
    try {
      const lastOrder = db.prepare('SELECT MAX(question_order) as maxOrder FROM questions WHERE survey_id = ?').get(surveyId) as any;
      const nextOrder = (lastOrder.maxOrder === null ? -1 : lastOrder.maxOrder) + 1;
      
      const result = db.prepare('INSERT INTO questions (survey_id, text, type, question_order) VALUES (?, ?, ?, ?)').run(surveyId, text, type, nextOrder);
      const questionId = result.lastInsertRowid;
      
      if (type === 'mcq' && Array.isArray(options)) {
        const insertOption = db.prepare('INSERT INTO options (question_id, text, next_question_order) VALUES (?, ?, ?)');
        options.forEach(opt => insertOption.run(questionId, opt, null));
      }
      
      res.json({ id: questionId, text, type, question_order: nextOrder });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Admin: Get Stats
  app.get('/api/admin/surveys/:surveyId/stats', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { surveyId } = req.params;
    const stats = db.prepare(`
      SELECT q.id as question_id, q.text, q.type, r.answer, COUNT(*) as count 
      FROM responses r 
      JOIN questions q ON r.question_id = q.id 
      WHERE q.survey_id = ?
      GROUP BY q.id, r.answer
    `).all(surveyId);
    res.json(stats);
  });

  // Admin: User Management for Assignments
  app.get('/api/admin/respondents', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const respondents = db.prepare('SELECT id, username FROM users WHERE role = ?').all('respondent');
    res.json(respondents);
  });

  app.get('/api/admin/surveys/:surveyId/assignments', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { surveyId } = req.params;
    const assignments = db.prepare('SELECT user_id FROM survey_assignments WHERE survey_id = ?').all(surveyId);
    res.json(assignments.map((a: any) => a.user_id));
  });

  app.post('/api/admin/surveys/:surveyId/assign', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { surveyId } = req.params;
    const { userId } = req.body;
    try {
      db.prepare('INSERT OR IGNORE INTO survey_assignments (user_id, survey_id) VALUES (?, ?)').run(userId, surveyId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/admin/surveys/:surveyId/unassign', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { surveyId } = req.params;
    const { userId } = req.body;
    try {
      db.prepare('DELETE FROM survey_assignments WHERE user_id = ? AND survey_id = ?').run(userId, surveyId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Respondent: Get Available Surveys (Only assigned ones OR public ones)
  app.get('/api/surveys', authenticate, (req: AuthRequest, res: Response) => {
    const surveys = db.prepare(`
      SELECT s.* FROM surveys s
      LEFT JOIN survey_assignments sa ON s.id = sa.survey_id AND sa.user_id = ?
      WHERE sa.user_id IS NOT NULL OR s.is_public = 1
      ORDER BY s.created_at DESC
    `).all(req.user.id);
    res.json(surveys);
  });

  // Public: Get Survey Info
  app.get('/api/public/surveys/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ? AND is_public = 1').get(id);
    if (!survey) return res.status(404).json({ error: 'Survey not found or not public' });
    res.json(survey);
  });

  // Public: Get Questions
  app.get('/api/public/surveys/:id/questions', (req: Request, res: Response) => {
    const { id } = req.params;
    const survey = db.prepare('SELECT id FROM surveys WHERE id = ? AND is_public = 1').get(id);
    if (!survey) return res.status(404).json({ error: 'Survey not found or not public' });

    const questions = db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY question_order').all(id);
    const questionsWithOptions = questions.map((q: any) => {
      if (q.type === 'mcq') {
        q.options = db.prepare('SELECT id, text, next_question_order FROM options WHERE question_id = ?').all(q.id);
      }
      return q;
    });
    res.json(questionsWithOptions);
  });

  // Public: Submit Responses
  app.post('/api/public/surveys/:id/responses', (req: Request, res: Response) => {
    const { id } = req.params;
    const { answers } = req.body; // { questionId: answer }
    
    const survey = db.prepare('SELECT id FROM surveys WHERE id = ? AND is_public = 1').get(id);
    if (!survey) return res.status(404).json({ error: 'Survey not found or not public' });

    const submission_id = crypto.randomUUID();
    const insertResponse = db.prepare('INSERT INTO responses (user_id, submission_id, question_id, answer) VALUES (?, ?, ?, ?)');
    const transaction = db.transaction((data) => {
      for (const [qId, ans] of Object.entries(data)) {
        insertResponse.run(null, submission_id, qId, ans);
      }
    });

    try {
      transaction(answers);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Respondent: Get Questions for a Survey
  app.get('/api/surveys/:surveyId/questions', authenticate, (req: AuthRequest, res: Response) => {
    const { surveyId } = req.params;
    const questions = db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY question_order').all(surveyId);
    const questionsWithOptions = questions.map((q: any) => {
      if (q.type === 'mcq') {
        q.options = db.prepare('SELECT id, text, next_question_order FROM options WHERE question_id = ?').all(q.id);
      }
      return q;
    });
    res.json(questionsWithOptions);
  });

  // Admin: Update Option Jump
  app.post('/api/admin/options/:id/jump', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { next_question_order } = req.body; // 0-based index or null
    
    try {
      db.prepare('UPDATE options SET next_question_order = ? WHERE id = ?').run(next_question_order, id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Admin: Delete Individual Question
  app.delete('/api/admin/surveys/:surveyId/questions/:id', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { surveyId, id } = req.params;
    try {
      db.prepare('DELETE FROM questions WHERE id = ? AND survey_id = ?').run(id, surveyId);
      // Re-order remaining questions for this survey
      const remaining = db.prepare('SELECT id FROM questions WHERE survey_id = ? ORDER BY question_order').all(surveyId);
      const updateOrder = db.prepare('UPDATE questions SET question_order = ? WHERE id = ?');
      const transaction = db.transaction((items) => {
        items.forEach((item: any, idx: number) => updateOrder.run(idx, item.id));
      });
      transaction(remaining);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Admin: Update Question (Type/Text)
  app.patch('/api/admin/surveys/:surveyId/questions/:id', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { surveyId, id } = req.params;
    const { text, type } = req.body;
    try {
      if (text !== undefined && type !== undefined) {
        db.prepare('UPDATE questions SET text = ?, type = ? WHERE id = ? AND survey_id = ?').run(text, type, id, surveyId);
      } else if (text !== undefined) {
        db.prepare('UPDATE questions SET text = ? WHERE id = ? AND survey_id = ?').run(text, id, surveyId);
      } else if (type !== undefined) {
        db.prepare('UPDATE questions SET type = ? WHERE id = ? AND survey_id = ?').run(type, id, surveyId);
      }

      // If type changed from mcq, delete options
      if (type !== undefined && type !== 'mcq') {
        db.prepare('DELETE FROM options WHERE question_id = ?').run(id);
      }
      // If type changed to mcq and no options exist, add a default one
      if (type === 'mcq') {
        const options = db.prepare('SELECT id FROM options WHERE question_id = ?').all(id);
        if (options.length === 0) {
          db.prepare('INSERT INTO options (question_id, text) VALUES (?, ?)').run(id, 'Option 1');
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Admin: Reorder Question
  app.post('/api/admin/surveys/:surveyId/questions/:id/reorder', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { surveyId, id } = req.params;
    const { direction } = req.body; // 'up' or 'down'
    try {
      const current = db.prepare('SELECT question_order FROM questions WHERE id = ? AND survey_id = ?').get(id, surveyId) as any;
      if (!current) return res.status(404).json({ error: 'Question not found' });

      const currentOrder = current.question_order;
      let targetOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;

      const target = db.prepare('SELECT id FROM questions WHERE survey_id = ? AND question_order = ?').get(surveyId, targetOrder) as any;
      
      if (target) {
        const transaction = db.transaction(() => {
          db.prepare('UPDATE questions SET question_order = ? WHERE id = ?').run(targetOrder, id);
          db.prepare('UPDATE questions SET question_order = ? WHERE id = ?').run(currentOrder, target.id);
        });
        transaction();
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Cannot move further in this direction' });
      }
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Admin: Delete All Questions for a Survey
  app.delete('/api/admin/surveys/:surveyId/questions', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { surveyId } = req.params;
    try {
      const questions = db.prepare('SELECT id FROM questions WHERE survey_id = ?').all(surveyId);
      const questionIds = questions.map((q: any) => q.id);
      if (questionIds.length > 0) {
        db.prepare(`DELETE FROM options WHERE question_id IN (${questionIds.join(',')})`).run();
        db.prepare(`DELETE FROM responses WHERE question_id IN (${questionIds.join(',')})`).run();
        db.prepare('DELETE FROM questions WHERE survey_id = ?').run(surveyId);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Respondent: Submit Answers
  app.post('/api/submit', authenticate, (req: AuthRequest, res: Response) => {
    const { answers } = req.body; // Array of { questionId, answer }
    const submission_id = crypto.randomUUID();
    const insertResponse = db.prepare('INSERT INTO responses (user_id, submission_id, question_id, answer) VALUES (?, ?, ?, ?)');
    
    const transaction = db.transaction((data) => {
      for (const item of data) {
        insertResponse.run(req.user.id, submission_id, item.questionId, item.answer.toString());
      }
    });

    transaction(answers);
    res.json({ success: true });
  });

  // Admin: Export Survey Results
  app.get('/api/admin/surveys/:id/export', authenticate, isAdmin, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const survey = db.prepare('SELECT title FROM surveys WHERE id = ?').get(id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });

    const questions = db.prepare('SELECT id, text FROM questions WHERE survey_id = ? ORDER BY question_order').all(id);
    const responses = db.prepare(`
      SELECT r.submission_id, r.question_id, r.answer, r.submitted_at, u.username
      FROM responses r
      LEFT JOIN users u ON r.user_id = u.id
      JOIN questions q ON r.question_id = q.id
      WHERE q.survey_id = ?
      ORDER BY r.submitted_at DESC
    `).all(id);

    // Group by submission_id
    const submissions: Record<string, any> = {};
    responses.forEach((r: any) => {
      if (!submissions[r.submission_id]) {
        submissions[r.submission_id] = {
          'Submission ID': r.submission_id,
          'Submitted At': r.submitted_at,
          'User': r.username || 'Anonymous'
        };
      }
      const question = questions.find((q: any) => q.id === r.question_id);
      if (question) {
        submissions[r.submission_id][question.text] = r.answer;
      }
    });

    const data = Object.values(submissions);
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(data);
    utils.book_append_sheet(wb, ws, 'Results');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="survey_results_${id}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile(path.resolve('dist/index.html')));
  }

  console.log('Vite middleware initialized');

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
