import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { generateResumeQuestions, extractResumeProfile } from '../utils/gemini.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config — PDF only, max 10MB
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === 'application/pdf' || file.mimetype === 'application/x-pdf';
    const isPdfExt = file.originalname && file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdfMime || isPdfExt) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

/**
 * POST /api/resume/upload
 * Upload a PDF resume, extract text, return extracted text.
 */
router.post('/upload', (req, res) => {
  upload.single('resume')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message || 'Invalid file upload.' });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Please upload a PDF.' });
      }

      const filePath = req.file.path;
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const extractedText = (pdfData.text || '').trim();

      if (!extractedText) {
        return res.status(422).json({ error: 'Could not extract text from the PDF. It may be image-based or scanned.' });
      }

      const extractedProfile = await extractResumeProfile(extractedText);

      return res.json({
        success: true,
        filename: req.file.originalname,
        text: extractedText,
        wordCount: extractedText.split(/\s+/).length,
        extractedProfile,
      });
    } catch (err) {
      console.error('Resume upload error:', err);
      return res.status(500).json({ error: err.message || 'Failed to parse PDF resume.' });
    }
  });
});

/**
 * POST /api/resume/questions
 * Body: { resumeText: string, company: string }
 * Returns 5 resume-based questions tailored to the company.
 */
router.post('/questions', async (req, res) => {
  try {
    const { resumeText, company } = req.body;

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ error: 'resumeText is required.' });
    }
    if (!company || !company.trim()) {
      return res.status(400).json({ error: 'company is required.' });
    }

    const questions = await generateResumeQuestions(resumeText.trim(), company.trim());

    return res.json({
      success: true,
      company,
      questions,
    });
  } catch (err) {
    console.error('Resume questions error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate resume questions.' });
  }
});

/**
 * POST /api/resume/parse-text
 * Body: { resumeText: string }
 * Extracts candidate profile and skills from pasted resume text.
 */
router.post('/parse-text', async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ error: 'resumeText is required.' });
    }
    const extractedProfile = await extractResumeProfile(resumeText.trim());
    return res.json({ success: true, extractedProfile });
  } catch (err) {
    console.error('Parse text error:', err);
    return res.status(500).json({ error: err.message || 'Failed to parse resume text.' });
  }
});

/**
 * POST /api/resume/from-url
 * Body: { url: string }
 * Fetches a resume from a URL (PDF or HTML) and extracts text.
 */
router.post('/from-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.trim()) return res.status(400).json({ error: 'url is required.' });
    const resp = await fetch(url.trim());
    if (!resp.ok) return res.status(400).json({ error: 'Failed to fetch URL.' });
    const buf = Buffer.from(await resp.arrayBuffer());
    let text = '';
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
      const pdfData = await pdfParse(buf);
      text = (pdfData.text || '').trim();
    } else {
      text = buf.toString('utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    if (!text) return res.status(422).json({ error: 'Could not extract text from URL.' });
    const extractedProfile = await extractResumeProfile(text);
    return res.json({ success: true, text, wordCount: text.split(/\s+/).length, extractedProfile });
  } catch (err) {
    console.error('Resume from URL error:', err);
    return res.status(500).json({ error: err.message || 'Failed to parse resume from URL.' });
  }
});

export default router;
