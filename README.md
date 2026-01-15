# Canban

A sleek, locally-running Kanban board application for project management, feature tracking, and idea organization.

## Features

- **Multiple Boards** - Create and manage separate boards for different projects
- **Drag & Drop** - Intuitive card movement between columns and reordering
- **Dark/Light Mode** - Toggle between themes with persistent preference
- **Local Storage** - All data saved to a local JSON file for privacy and portability
- **Real-time Sync** - Changes auto-save immediately
- **Mobile Responsive** - Works on phones, tablets, and desktops
- **Docker Support** - Run in a container for easy deployment

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Drag & Drop**: @dnd-kit (with touch support)
- **State Management**: Zustand
- **Backend**: Express.js
- **Storage**: Local JSON file

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Clone or navigate to the project
cd canban

# Install all dependencies (root, client, and server)
npm run install:all
```

### Running the App (Development)

```bash
# Start both frontend and backend
npm run dev
```

This will start:

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## Docker

### Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The app will be available at **http://localhost:3000**

### Using Docker directly

```bash
# Build the image
docker build -t canban .

# Run the container
docker run -d \
  --name canban \
  -p 3000:3000 \
  -v canban-data:/app/data \
  canban

# Stop the container
docker stop canban
```

### Data Persistence

Board data is stored in a Docker volume (`canban-data`) which persists across container restarts.

To backup your data:

```bash
docker cp canban:/app/data/boards.json ./boards-backup.json
```

To restore data:

```bash
docker cp ./boards-backup.json canban:/app/data/boards.json
```

## Project Structure

```
canban/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── store/          # Zustand state management
│   │   ├── App.jsx         # Main app component
│   │   └── index.css       # Global styles
│   └── package.json
├── server/                 # Express backend
│   ├── index.js            # Development server
│   ├── production.js       # Production server (Docker)
│   └── package.json
├── data/
│   └── boards.json         # Your board data (auto-created)
├── Dockerfile              # Docker build instructions
├── docker-compose.yml      # Docker Compose config
├── package.json            # Root scripts
└── README.md
```

## Usage

### Boards

- Click **+** in the sidebar to create a new board
- Click a board name to switch to it
- Hover over a board to rename or delete it

### Columns

- Click **Add Column** to create a new column
- Click the column title to rename it
- Use the **⋮** menu to delete a column
- Drag columns to reorder them

### Cards

- Click **Add a card** at the bottom of any column
- Click a card to open the detail modal
- Edit title and description in the modal
- Drag cards between columns or reorder within a column

### Mobile

- Tap the hamburger menu (☰) to open the sidebar
- Long-press and drag to move cards on touch devices
- Swipe horizontally to scroll through columns

### Theme

- Click the sun/moon icon in the sidebar footer to toggle dark/light mode

## Data Storage

All your data is stored locally in `data/boards.json`. This file is:

- Automatically created on first run
- Human-readable JSON format
- Easy to backup or transfer

## Keyboard Shortcuts

- `Escape` - Close modals
- `Enter` - Save when editing titles

## Development

```bash
# Run frontend only
cd client && npm run dev

# Run backend only
cd server && npm run dev

# Build for production
cd client && npm run build
```

## Environment Variables

| Variable     | Default         | Description                      |
| ------------ | --------------- | -------------------------------- |
| `PORT`       | `3000`          | Server port (production)         |
| `DATA_DIR`   | `./data`        | Directory for storing board data |
| `STATIC_DIR` | `./client/dist` | Directory for static files       |

## License

Private
