import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const MODEL_CANDIDATES = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/**
 * Company-specific interview style context
 */
const COMPANY_STYLES = {
  Google: `Google interviews focus on LeetCode-hard algorithmic problems, data structures, 
    system design at massive scale, and assessing "Googleyness" (intellectual humility, 
    comfort with ambiguity, passion for technology). Questions are precise and deeply technical.`,

  Amazon: `Amazon interviews revolve around the 16 Leadership Principles (Customer Obsession, 
    Ownership, Invent and Simplify, Dive Deep, etc.). Candidates are expected to use the STAR 
    method (Situation, Task, Action, Result). Technical questions emphasize scalable OOP design 
    and distributed systems.`,

  Microsoft: `Microsoft focuses on problem-solving ability, teamwork, and growth mindset. 
    Coding questions are moderate to hard, emphasizing clean solutions. Design questions test 
    real-world product thinking. Culture fit around collaboration and learning is key.`,

  Meta: `Meta (Facebook) prizes coding speed and accuracy, product sense, scalability to 
    billions of users, and ML/AI awareness. Expect graph problems, dynamic programming, and 
    system design for social-network-scale products. Move fast and iterate.`,

  Apple: `Apple interviews test attention to detail, user-centric thinking, clean and elegant 
    code, and deep domain expertise. Candidates should demonstrate obsessive quality, 
    understanding of hardware-software interplay, and pride in craftsmanship.`,

  Netflix: `Netflix interviews focus on culture fit ("Freedom & Responsibility"), innovation, 
    senior-level independent judgment, and streaming/media technology. Expect questions on 
    distributed systems, CDN design, and evidence of autonomous high-impact work.`,

  Uber: `Uber interviews emphasize real-world engineering challenges: maps, routing, 
    geospatial systems, and distributed systems at scale. Problems are grounded in practical 
    transportation/logistics scenarios. Strong focus on scalability and reliability.`,
};

function getCompanyStyle(company) {
  const key = Object.keys(COMPANY_STYLES).find(
    (k) => k.toLowerCase() === String(company || '').trim().toLowerCase()
  );
  return (key && COMPANY_STYLES[key]) || `${company} is a leading tech company. Ask professional, 
    relevant technical and behavioral questions appropriate for a software engineering role.`;
}

/**
 * Generate text via Gemini, trying candidate models in order, and return the response string.
 */
async function generateText(prompt) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not configured in server/.env');
  }
  let lastErr;
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const m = genAI.getGenerativeModel({ model: modelName });
      const result = await m.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastErr = err;
      console.error(`[Gemini Error] model=${modelName} status=${err.status || 'unknown'}:`, err.message);
    }
  }
  throw lastErr;
}

/**
 * Fallback question bank when GEMINI_API_KEY is not configured or invalid.
 */
function fallbackResumeQuestions(resumeText, company) {
  const snippet = resumeText.split(/\s+/).slice(0, 12).join(' ');
  return [
    `Walk me through the most technically challenging project on your resume ("${snippet}...") and how you architected it.`,
    `At ${company}, scalability and reliability are critical. Which project from your resume would need the biggest redesign to handle 100x traffic, and why?`,
    `Tell me about a production bug or performance bottleneck you resolved in one of your listed projects. How did you diagnose and fix it?`,
    `Looking at the tech stack on your resume, what trade-offs did you make when choosing those technologies over alternatives?`,
    `What measurable impact did your work have on users or engineering velocity, and what would you do differently today?`
  ];
}

function fallbackInterviewQuestions(company, roundType) {
  const bank = {
    DSA: [
      `[${company} DSA] Given an array of integers and a target sum, how would you find all unique triplets that sum to zero? Discuss time and space complexity.`,
      `[${company} DSA] Design an LRU Cache with O(1) get and put operations. What data structures do you combine and why?`,
      `[${company} DSA] Given a directed graph, how do you detect whether a cycle exists? Compare DFS recursion stack vs. Kahn's topological sort.`,
      `[${company} DSA] How would you find the Kth largest element in an unsorted stream of integers? Compare heap vs. Quickselect.`,
      `[${company} DSA] Given a binary tree, serialize and deserialize it efficiently. How do you handle edge cases like skewed trees?`
    ],
    'System Design': [
      `[${company} System Design] Design a globally distributed URL shortener handling 100M daily active users. Discuss hashing, DB partitioning, and caching.`,
      `[${company} System Design] How would you design a real-time rate limiter for ${company}'s API gateway? Compare token bucket vs. sliding window log.`,
      `[${company} System Design] Design a scalable notification service supporting push, email, and SMS with at-least-once delivery guarantees.`,
      `[${company} System Design] How do you design a news feed or timeline service that balances fan-out-on-write vs. fan-out-on-read?`,
      `[${company} System Design] Explain how consistent hashing works and why it is critical for distributed caches and storage nodes.`
    ],
    Behavioral: [
      `[${company} Behavioral] Tell me about a time you disagreed with a senior engineer or manager on a technical decision. How did you handle it?`,
      `[${company} Behavioral] Describe a situation where you had to deliver a complex feature under a tight deadline with ambiguous requirements.`,
      `[${company} Behavioral] Tell me about a mistake or outage you caused. What did you learn and how did you prevent it from happening again?`,
      `[${company} Behavioral] Give an example of when you went above and beyond your immediate role to improve team productivity or customer experience.`,
      `[${company} Behavioral] Describe a time you mentored someone or received tough feedback. How did you respond?`
    ],
    HR: [
      `[${company} HR] Why are you interested in joining ${company} specifically as a Software Development Engineer?`,
      `[${company} HR] What kind of engineering culture and team environment helps you do your best work?`,
      `[${company} HR] Where do you see your technical career evolving over the next 3 to 5 years?`,
      `[${company} HR] Tell me about a project you are most proud of and why it mattered to you.`,
      `[${company} HR] What are your expectations around role scope, growth, and compensation?`
    ],
    'Full SDE Loop': [
      `[${company} DSA] How would you detect and remove a cycle in a linked list in O(1) space, and how do you prove Floyd's algorithm works?`,
      `[${company} System Design] Design a high-throughput distributed job scheduler. How do you ensure fault tolerance and avoid duplicate execution?`,
      `[${company} CS Core] Explain the difference between processes and threads, how virtual memory works, and what happens during a context switch.`,
      `[${company} CS Core] What are ACID properties in databases, and how do isolation levels prevent dirty reads and phantom reads?`,
      `[${company} Behavioral] Tell me about a time you owned an ambiguous problem end-to-end and drove it to completion.`
    ]
  };
  return bank[roundType] || bank['Full SDE Loop'];
}

const NON_ANSWER_PHRASES = new Set([
  'i dont know', "i don't know", 'idk', 'no idea', 'dont know', "don't know",
  'skip', 'pass', 'nothing', 'none', 'na', 'n/a', 'not sure', 'no', 'yes',
  '(no answer provided)', 'no answer provided', 'not aware'
]);

function classifyAnswer(answer) {
  const raw = String(answer || '').trim();
  const normalized = raw.toLowerCase().replace(/[.,!?'"`]/g, '').replace(/\s+/g, ' ').trim();
  if (!raw || NON_ANSWER_PHRASES.has(normalized)) {
    return { isNonAnswer: true, words: 0 };
  }
  const words = raw.split(/\s+/).filter(Boolean).length;
  if (words < 5) {
    return { isNonAnswer: true, words };
  }
  return { isNonAnswer: false, words };
}

function fallbackEvaluate(qaPairs, company) {
  const perQuestionFeedback = qaPairs.map((qa) => {
    const { isNonAnswer, words } = classifyAnswer(qa.answer);
    if (isNonAnswer) {
      return {
        question: qa.question,
        score: 0,
        feedback: `No substantive technical answer provided. At ${company}'s SDE bar, saying "I don't know" or skipping without attempting a brute-force approach, clarifying constraints, or reasoning through trade-offs scores 0/10.`
      };
    }
    if (words < 12) {
      return {
        question: qa.question,
        score: 1,
        feedback: `Response is far too brief (${words} words) and lacks technical depth. ${company} expects structured problem-solving, edge cases, and time/space complexity analysis.`
      };
    }
    if (words < 28) {
      return {
        question: qa.question,
        score: 3,
        feedback: `Partial answer (${words} words), but lacks depth for ${company}'s SDE bar. Expand on optimal algorithms, Big-O complexity, and concrete trade-offs.`
      };
    }
    const qScore = Math.min(8, Math.round(4 + Math.min((words - 25) / 20, 4)));
    return {
      question: qa.question,
      score: qScore,
      feedback: `Reasonable length (${words} words). To reach a Strong Hire bar at ${company}, ensure you explicitly verify edge cases, Big-O bounds, and system trade-offs.`
    };
  });

  const totalScore = perQuestionFeedback.reduce((sum, item) => sum + item.score, 0);
  const overallScore = qaPairs.length > 0 ? Math.round((totalScore / qaPairs.length) * 10) / 10 : 0;
  const finalVerdict = overallScore >= 8 ? 'Strong Hire' : overallScore >= 6 ? 'Hire' : 'No Hire';
  const anySubstantive = perQuestionFeedback.some((item) => item.score >= 3);

  return {
    overallScore,
    perQuestionFeedback,
    strengths: anySubstantive
      ? [
          'Attempted to explain technical concepts in multiple responses.',
          `Engaged with ${company}-style SDE interview prompts.`
        ]
      : [
          'No technical strengths demonstrated in this session — most responses were skipped or non-answers.'
        ],
    areasForImprovement: [
      'Never stop at "I don\'t know" — always propose a brute-force approach, state assumptions, and reason aloud.',
      'Include explicit Big-O time/space complexity and edge-case analysis for every technical question.',
      'Use the STAR method (Situation, Task, Action, Result) with concrete metrics for behavioral questions.'
    ],
    finalVerdict,
    verdictReason: `Offline strict evaluation (Gemini API unavailable): scored ${overallScore}/10 against ${company}'s SDE hiring bar.`
  };
}

/**
 * Generate resume-based interview questions tailored to a company.
 * @param {string} resumeText - Extracted resume text
 * @param {string} company - Target company name
 * @returns {Promise<string[]>} Array of 5 questions
 */
async function generateResumeQuestions(resumeText, company) {
  try {
    const companyStyle = getCompanyStyle(company);

    const prompt = `You are a senior ${company} interviewer preparing for a candidate interview.

Company Interview Style:
${companyStyle}

Candidate Resume:
${resumeText}

Based on the resume above, generate exactly 5 targeted interview questions that:
1. Directly reference specific projects, technologies, or experiences from the resume
2. Are tailored to how ${company} would probe those experiences
3. Assess depth of knowledge, not just surface-level recall
4. Vary in type (technical depth, impact/results, challenges faced, lessons learned, relevance to ${company}'s domain)

Return ONLY a JSON array of 5 question strings. No explanations, no markdown, just valid JSON.
Example: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

    const text = await generateText(prompt);
    const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('Gemini unavailable for resume questions, using fallback:', err.message);
    return fallbackResumeQuestions(resumeText, company);
  }
}

/**
 * Generate company-style interview questions for a given round type.
 * @param {string} company - Target company name
 * @param {string} roundType - Full SDE Loop | DSA | System Design | Behavioral | HR
 * @returns {Promise<string[]>} Array of 5 questions
 */
async function generateInterviewQuestions(company, roundType) {
  try {
    const companyStyle = getCompanyStyle(company);

    const roundContext = {
      'Full SDE Loop': 'Comprehensive SDE interview covering Data Structures & Algorithms, System Design, CS fundamentals (OS, DBMS, Networking, OOP), and Behavioral/Leadership questions.',
      DSA: 'Data Structures & Algorithms coding round. Focus on problem-solving, time/space complexity, and optimal solutions.',
      'System Design': 'System Design round. Focus on scalable architecture, trade-offs, databases, APIs, and distributed systems.',
      Behavioral: 'Behavioral round. Focus on past experiences, teamwork, conflict resolution, leadership, and cultural fit.',
      HR: 'HR round. Focus on career goals, salary expectations, company fit, work style, and motivation.',
    };

    const context = roundContext[roundType] || `${roundType} round interview.`;

    const prompt = `You are a senior ${company} interviewer conducting a ${roundType} interview.

Company Interview Style:
${companyStyle}

Round Context:
${context}

Generate exactly 5 ${roundType} interview questions that:
1. Authentically reflect how ${company} actually interviews for this round
2. Are appropriately challenging for a software engineering position
3. Test what ${company} specifically values in candidates
4. Are distinct and cover different aspects of the round

Return ONLY a JSON array of 5 question strings. No explanations, no markdown, just valid JSON.
Example: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

    const text = await generateText(prompt);
    const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('Gemini unavailable for interview questions, using fallback:', err.message);
    return fallbackInterviewQuestions(company, roundType);
  }
}

/**
 * Evaluate interview answers and return structured feedback.
 * @param {Array<{question: string, answer: string}>} qaPairs
 * @param {string} company
 * @returns {Promise<Object>} Evaluation result
 */
async function evaluateAnswers(qaPairs, company) {
  try {
    const companyStyle = getCompanyStyle(company);

    const qaBlock = qaPairs
      .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || '(No answer provided)'}`)
      .join('\n\n');

    const prompt = `You are a strict senior ${company} hiring manager evaluating a candidate's SDE interview performance.

Company Interview Style:
${companyStyle}

Interview Q&A:
${qaBlock}

STRICT GRADING RULES:
1. Empty answers, "(No answer provided)", skipped questions, or non-answers like "I don't know", "idk", "no idea", or < 10 words of non-technical filler MUST receive a score of 0 or 1 out of 10.
2. Do NOT give credit or praise ("Good attempt") for empty, vague, or non-technical answers.
3. Calibrate strictly to ${company}'s real SDE hiring bar: reward optimal algorithms, Big-O time/space complexity, edge cases, scalable architecture trade-offs, and STAR-method metrics.
4. "overallScore" must reflect the actual average performance (0-10). If most answers are 0-1, overallScore MUST be 0-1 and finalVerdict MUST be "No Hire".

Evaluate the candidate's performance from ${company}'s perspective. Return a JSON object with EXACTLY this structure:
{
  "overallScore": <number 0-10>,
  "perQuestionFeedback": [
    {
      "question": "<question text>",
      "score": <number 0-10>,
      "feedback": "<strict, specific, actionable feedback for this answer>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "areasForImprovement": ["<area 1>", "<area 2>", "<area 3>"],
  "finalVerdict": "<Strong Hire | Hire | No Hire>",
  "verdictReason": "<1-2 sentence explanation of the verdict from ${company}'s perspective>"
}

Return ONLY valid JSON. No markdown, no extra text.`;

    const text = await generateText(prompt);
    const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Enforce strict floor/ceiling on non-answers even if LLM was overly generous
    if (Array.isArray(parsed.perQuestionFeedback)) {
      parsed.perQuestionFeedback = parsed.perQuestionFeedback.map((item, idx) => {
        const { isNonAnswer } = classifyAnswer(qaPairs[idx]?.answer);
        if (isNonAnswer && item.score > 1) {
          return {
            ...item,
            score: 0,
            feedback: `No substantive technical answer provided. ${item.feedback || ''}`.trim()
          };
        }
        return item;
      });
      const avg = parsed.perQuestionFeedback.reduce((s, x) => s + (Number(x.score) || 0), 0) / Math.max(parsed.perQuestionFeedback.length, 1);
      if (parsed.perQuestionFeedback.every((x) => (Number(x.score) || 0) <= 1)) {
        parsed.overallScore = Math.round(avg * 10) / 10;
        parsed.finalVerdict = 'No Hire';
      }
    }

    return parsed;
  } catch (err) {
    console.warn('Gemini unavailable for evaluation, using fallback:', err.message);
    return fallbackEvaluate(qaPairs, company);
  }
}

/**
 * Deterministic fallback to extract skills & basic profile info from resume text.
 */
const KNOWN_SKILLS = [
  'C', 'C++', 'C#', 'Java', 'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Kotlin', 'Swift', 'PHP', 'Ruby',
  'React', 'Next.js', 'Redux', 'Angular', 'Vue', 'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot',
  'HTML', 'CSS', 'Tailwind CSS', 'Bootstrap', 'SASS', 'SQL', 'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'Firebase', 'Supabase',
  'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'GitHub Actions', 'Git', 'Linux', 'GraphQL', 'REST API', 'gRPC',
  'System Design', 'DSA', 'Data Structures', 'Algorithms', 'OOP', 'DBMS', 'OS', 'Operating Systems', 'Computer Networks',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy',
  'Microservices', 'Kafka', 'RabbitMQ', 'Nginx', 'Jest', 'Playwright', 'Selenium'
];

function fallbackExtractProfile(resumeText) {
  const text = resumeText || '';
  const skills = KNOWN_SKILLS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    return regex.test(text);
  });

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const collegeMatch = text.match(/([A-Z][A-Za-z0-9\s,&.-]{3,60}(?:University|Institute of Technology|College|IIT|NIT|IIIT|BITS)[A-Za-z0-9\s,.-]{0,30})/i);
  const yearMatch = text.match(/\b(202[0-9]|203[0-5])\b/);
  const degreeMatch = text.match(/\b(B\.?Tech|M\.?Tech|B\.?E\.?|B\.?Sc|M\.?Sc|BCA|MCA|Bachelor|Master)[^\n,;]{0,40}/i);

  return {
    name: lines[0] && lines[0].length < 50 && !lines[0].includes('@') ? lines[0] : '',
    college: collegeMatch ? collegeMatch[1].trim() : '',
    degree: degreeMatch ? degreeMatch[0].trim() : '',
    graduationYear: yearMatch ? yearMatch[1] : '',
    skills
  };
}

/**
 * Extract candidate profile (name, college, degree, graduationYear, skills) from resume text.
 * Uses fast deterministic extraction so resume upload responds immediately.
 * @param {string} resumeText
 * @returns {Promise<{name: string, college: string, degree: string, graduationYear: string, skills: string[]}>}
 */
async function extractResumeProfile(resumeText) {
  return fallbackExtractProfile(resumeText);
}

/**
 * Transcribe an audio buffer using Gemini multimodal input.
 * @param {Buffer} audioBuffer
 * @param {string} mimeType
 * @returns {Promise<string>}
 */
async function transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not configured in server/.env');
  }
  const base64Audio = audioBuffer.toString('base64');
  const prompt = 'Transcribe the spoken audio accurately into plain text. Return ONLY the transcription text with no extra commentary. If the audio is silent or unintelligible, return an empty string.';

  let lastErr;
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const m = genAI.getGenerativeModel({ model: modelName });
      const result = await m.generateContent([
        { text: prompt },
        { inlineData: { mimeType, data: base64Audio } }
      ]);
      return (result.response.text() || '').trim();
    } catch (err) {
      lastErr = err;
      console.error(`[Gemini Transcribe Error] model=${modelName} status=${err.status || 'unknown'}:`, err.message);
    }
  }
  throw lastErr;
}

export {
  generateText,
  generateResumeQuestions,
  generateInterviewQuestions,
  evaluateAnswers,
  extractResumeProfile,
  transcribeAudio,
  getCompanyStyle,
};
