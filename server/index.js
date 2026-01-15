import express from 'express';
import cors from 'cors';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Data file path
const DATA_DIR = join(__dirname, '..', 'data');
const DATA_FILE = join(DATA_DIR, 'boards.json');
const CURSOR_JOBS_FILE = join(DATA_DIR, 'cursor-jobs.json');

// Default data structure
const DEFAULT_DATA = {
  boards: [
    {
      id: 'default-board',
      name: 'My First Project',
      columns: [
        {
          id: 'col-backlog',
          title: 'Backlog',
          cards: [
            {
              id: 'card-1',
              title: 'Welcome!',
              description: 'This is your first card. Drag it to another column or create new cards to get started.',
              createdAt: new Date().toISOString()
            }
          ]
        },
        { id: 'col-todo', title: 'To Do', cards: [] },
        { id: 'col-progress', title: 'In Progress', cards: [] },
        { id: 'col-done', title: 'Done', cards: [] }
      ],
      archivedCards: []
    }
  ],
  activeBoard: 'default-board',
  theme: 'dark',
  activeView: 'boards',
  bookmarks: [],
  collections: [
    { id: 'all', name: 'All Bookmarks', icon: 'bookmark' },
    { id: 'favorites', name: 'Favorites', icon: 'star' },
    { id: 'archive', name: 'Archive', icon: 'archive' }
  ]
};

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory and file exist
async function ensureDataFile() {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    if (!existsSync(DATA_FILE)) {
      await writeFile(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
    }
    if (!existsSync(CURSOR_JOBS_FILE)) {
      await writeFile(CURSOR_JOBS_FILE, JSON.stringify({ jobs: {} }, null, 2));
    }
  } catch (error) {
    console.error('Error ensuring data file:', error);
  }
}

// Read cursor jobs from file
async function readCursorJobs() {
  try {
    const content = await readFile(CURSOR_JOBS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading cursor jobs:', error);
    return { jobs: {} };
  }
}

// Write cursor jobs to file
async function writeCursorJobs(data) {
  try {
    await writeFile(CURSOR_JOBS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing cursor jobs:', error);
    return false;
  }
}

// Read data from file
async function readData() {
  try {
    const content = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading data:', error);
    return DEFAULT_DATA;
  }
}

// Write data to file
async function writeData(data) {
  try {
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data:', error);
    return false;
  }
}

// API Routes

// Get all data
app.get('/api/data', async (req, res) => {
  const data = await readData();
  res.json(data);
});

// Save all data
app.put('/api/data', async (req, res) => {
  const success = await writeData(req.body);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Get all boards
app.get('/api/boards', async (req, res) => {
  const data = await readData();
  res.json(data.boards);
});

// Get single board
app.get('/api/boards/:id', async (req, res) => {
  const data = await readData();
  const board = data.boards.find(b => b.id === req.params.id);
  if (board) {
    res.json(board);
  } else {
    res.status(404).json({ error: 'Board not found' });
  }
});

// Create board
app.post('/api/boards', async (req, res) => {
  const data = await readData();
  const newBoard = {
    id: req.body.id || `board-${Date.now()}`,
    name: req.body.name || 'New Board',
    columns: req.body.columns || [
      { id: `col-${Date.now()}-1`, title: 'To Do', cards: [] },
      { id: `col-${Date.now()}-2`, title: 'In Progress', cards: [] },
      { id: `col-${Date.now()}-3`, title: 'Done', cards: [] }
    ]
  };
  data.boards.push(newBoard);
  data.activeBoard = newBoard.id;
  await writeData(data);
  res.json(newBoard);
});

// Update board
app.put('/api/boards/:id', async (req, res) => {
  const data = await readData();
  const index = data.boards.findIndex(b => b.id === req.params.id);
  if (index !== -1) {
    data.boards[index] = { ...data.boards[index], ...req.body };
    await writeData(data);
    res.json(data.boards[index]);
  } else {
    res.status(404).json({ error: 'Board not found' });
  }
});

// Delete board
app.delete('/api/boards/:id', async (req, res) => {
  const data = await readData();
  const index = data.boards.findIndex(b => b.id === req.params.id);
  if (index !== -1) {
    data.boards.splice(index, 1);
    if (data.activeBoard === req.params.id) {
      data.activeBoard = data.boards[0]?.id || null;
    }
    await writeData(data);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Board not found' });
  }
});

// Update active board
app.put('/api/active-board', async (req, res) => {
  const data = await readData();
  data.activeBoard = req.body.activeBoard;
  await writeData(data);
  res.json({ activeBoard: data.activeBoard });
});

// Update theme
app.put('/api/theme', async (req, res) => {
  const data = await readData();
  data.theme = req.body.theme;
  await writeData(data);
  res.json({ theme: data.theme });
});

// ============================================
// CURSOR JOB ENDPOINTS
// ============================================

// Create a new Cursor job from a card's checklist
app.post('/api/cursor/jobs', async (req, res) => {
  const { cardId, columnId, boardId, cardTitle, checklistItems } = req.body;

  if (!cardId || !columnId || !boardId || !checklistItems || !Array.isArray(checklistItems)) {
    return res.status(400).json({ error: 'Missing required fields: cardId, columnId, boardId, checklistItems' });
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const job = {
    id: jobId,
    cardId,
    columnId,
    boardId,
    cardTitle: cardTitle || 'Untitled Card',
    status: 'queued', // queued | running | completed | failed
    createdAt: now,
    updatedAt: now,
    items: checklistItems.map(item => ({
      id: item.id,
      text: item.text,
      status: 'pending', // pending | running | completed | failed
      notes: null,
      completedAt: null
    }))
  };

  const jobsData = await readCursorJobs();
  jobsData.jobs[jobId] = job;
  await writeCursorJobs(jobsData);

  res.json(job);
});

// Get a Cursor job by ID
app.get('/api/cursor/jobs/:id', async (req, res) => {
  const jobsData = await readCursorJobs();
  const job = jobsData.jobs[req.params.id];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

// List all Cursor jobs (optionally filter by cardId)
app.get('/api/cursor/jobs', async (req, res) => {
  const jobsData = await readCursorJobs();
  let jobs = Object.values(jobsData.jobs);

  // Filter by cardId if provided
  if (req.query.cardId) {
    jobs = jobs.filter(j => j.cardId === req.query.cardId);
  }

  // Sort by createdAt descending (newest first)
  jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(jobs);
});

// Update a Cursor job (used by external runner to report progress/results)
app.patch('/api/cursor/jobs/:id', async (req, res) => {
  const jobsData = await readCursorJobs();
  const job = jobsData.jobs[req.params.id];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const { status, itemUpdates } = req.body;
  const now = new Date().toISOString();

  // Update overall job status if provided
  if (status && ['queued', 'running', 'completed', 'failed'].includes(status)) {
    job.status = status;
  }

  // Update individual items if provided
  // itemUpdates: [{ id: string, status?: string, notes?: string }]
  if (itemUpdates && Array.isArray(itemUpdates)) {
    for (const update of itemUpdates) {
      const item = job.items.find(i => i.id === update.id);
      if (item) {
        if (update.status && ['pending', 'running', 'completed', 'failed'].includes(update.status)) {
          item.status = update.status;
          if (update.status === 'completed') {
            item.completedAt = now;
          }
        }
        if (update.notes !== undefined) {
          item.notes = update.notes;
        }
      }
    }
  }

  // Auto-complete job if all items are completed
  const allCompleted = job.items.every(i => i.status === 'completed');
  const anyFailed = job.items.some(i => i.status === 'failed');
  if (allCompleted && job.status !== 'completed') {
    job.status = 'completed';
  } else if (anyFailed && job.status !== 'failed') {
    job.status = 'failed';
  }

  job.updatedAt = now;
  jobsData.jobs[req.params.id] = job;
  await writeCursorJobs(jobsData);

  res.json(job);
});

// Delete a Cursor job
app.delete('/api/cursor/jobs/:id', async (req, res) => {
  const jobsData = await readCursorJobs();

  if (!jobsData.jobs[req.params.id]) {
    return res.status(404).json({ error: 'Job not found' });
  }

  delete jobsData.jobs[req.params.id];
  await writeCursorJobs(jobsData);

  res.json({ success: true });
});

// Start server
await ensureDataFile();
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
