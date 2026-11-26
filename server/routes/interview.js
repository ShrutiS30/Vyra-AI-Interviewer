import express from 'express';
import multer from 'multer';
import { generateInterviewQuestions, evaluateAnswers, transcribeAudio } from '../utils/gemini.js';

const router = express.Router();
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

const VALID_ROUND_TYPES = ['Full SDE Loop', 'DSA', 'System Design', 'Behavioral', 'HR'];

/**
 * POST /api/interview/questions
 * Body: { company: string, roundType: "DSA" | "System Design" | "Behavioral" | "HR" }
 * Returns 5 interview questions styled for that company and round.
 */
router.post('/questions', async (req, res) => {
  try {
    const { company, roundType } = req.body;

    if (!company || !company.trim()) {
      return res.status(400).json({ error: 'company is required.' });
    }
    if (!roundType || !roundType.trim()) {
      return res.status(400).json({ error: 'roundType is required.' });
    }
    if (!VALID_ROUND_TYPES.includes(roundType.trim())) {
      return res.status(400).json({
        error: `Invalid roundType. Must be one of: ${VALID_ROUND_TYPES.join(', ')}`,
      });
    }

    const questions = await generateInterviewQuestions(company.trim(), roundType.trim());

    return res.json({
      success: true,
      company,
      roundType,
      questions,
    });
  } catch (err) {
    console.error('Interview questions error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate interview questions.' });
  }
});

/**
 * POST /api/interview/evaluate
 * Body: {
 *   company: string,
 *   answers: Array<{ question: string, answer: string }>
 * }
 * Returns structured evaluation with score, feedback, strengths, areas for improvement, verdict.
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { company, answers } = req.body;

    if (!company || !company.trim()) {
      return res.status(400).json({ error: 'company is required.' });
    }
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'answers must be a non-empty array of { question, answer } objects.' });
    }

    // Validate structure
    for (let i = 0; i < answers.length; i++) {
      if (!answers[i].question) {
        return res.status(400).json({ error: `answers[${i}].question is required.` });
      }
    }

    const evaluation = await evaluateAnswers(answers, company.trim());

    return res.json({
      success: true,
      company,
      evaluation,
    });
  } catch (err) {
    console.error('Evaluate error:', err);
    return res.status(500).json({ error: err.message || 'Failed to evaluate answers.' });
  }
});

/**
 * POST /api/interview/transcribe
 * Multipart form-data with field "audio" -> returns { success: true, transcript }
 */
router.post('/transcribe', audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No audio file received.' });
    }
    const mimeType = (req.file.mimetype || 'audio/webm').split(';')[0];
    const transcript = await transcribeAudio(req.file.buffer, mimeType);
    return res.json({ success: true, transcript });
  } catch (err) {
    console.error('Audio transcription error:', err);
    return res.status(500).json({ error: err.message || 'Failed to transcribe audio.' });
  }
});

export default router;
