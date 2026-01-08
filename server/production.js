import express from 'express';
import cors from 'cors';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Data file path - use environment variable or default
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'data');
const DATA_FILE = join(DATA_DIR, 'boards.json');

// Static files directory
const STATIC_DIR = process.env.STATIC_DIR || join(__dirname, '..', 'client', 'dist');

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
              title: 'Welcome to Canban!',
              description: 'This is your first card. Drag it to another column or create new cards to get started.',
              createdAt: new Date().toISOString()
            }
          ]
        },
        { id: 'col-todo', title: 'To Do', cards: [] },
        { id: 'col-progress', title: 'In Progress', cards: [] },
        { id: 'col-done', title: 'Done', cards: [] }
      ]
    }
  ],
  activeBoard: 'default-board',
  theme: 'dark'
};

// Middleware
app.use(cors());
app.use(express.json());

// Service worker must be served with no-cache and correct scope
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(join(STATIC_DIR, 'sw.js'));
});

// Serve static files from the built client
app.use(express.static(STATIC_DIR));

// Ensure data directory and file exist
async function ensureDataFile() {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    if (!existsSync(DATA_FILE)) {
      await writeFile(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
    }
  } catch (error) {
    console.error('Error ensuring data file:', error);
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

// Catch-all route - serve the SPA for client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(STATIC_DIR, 'index.html'));
});

// Start server
await ensureDataFile();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Canban running at http://localhost:${PORT}`);
});
