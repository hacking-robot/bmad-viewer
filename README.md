<div align="center">

# BMad Viewer

<p><strong>A read-only web viewer for BMAD projects — sprint boards, stories, epics, planning artifacts, and multi-sprint support</strong></p>

![License](https://img.shields.io/badge/license-MIT-blue) ![Platform](https://img.shields.io/badge/platform-Web%20%7C%20GitHub%20Pages-lightgrey)
</div>

---

## 👉 [Use it live](https://hacking-robot.github.io/bmad-viewer/)

*Compatible with Chrome only (requires File System Access API)*

---

<img src="assets/screenshot1.png" alt="BMad Viewer Screenshot" width="100%">

## Features

### Workflow Dashboard
- **Dashboard View**: Projects without a board module (BMM/GDS) launch into a dedicated dashboard showing all available workflows and agents
- **Module Discovery**: Auto-detects BMAD add-on modules (bmb, cis, tea, etc.) with color-coded module chips

### Sprint Board
- **Sprint Board**: View stories organized across columns (Backlog, Ready for Dev, In Progress, Review, Done, Optional)
- **Multi-Sprint Support**: Switch between sprints with a dedicated sprint switcher
- **Sprint Info Panel**: View sprint details including date range, velocity metrics, story point totals grouped by epic, and team progress
- **Epic Organization**: Stories grouped by epic with color-coded badges
- **Story Details**: View acceptance criteria, tasks, subtasks, and file changes
- **Search & Filter**: Find stories by text or filter by epic
- **Collapsible Columns**: Minimize columns with per-epic state persistence

### Project Management
- **Project Switcher**: Quickly switch between recent projects (up to 10)
- **BMAD Scanner**: Auto-discovers agents, workflows, and version info from `_bmad/` directory
- **Version Gate**: Blocks usage with pre-BMAD 6 projects and prompts for upgrade
- **Planning Artifacts**: View epics, goals, and planning documents within the app

### Developer Experience
- **100+ Color Themes**: Base24 color schemes with dark/light variants, persisted per-project
- **Command Palette**: Quick actions via `Cmd/Ctrl+K`
- **Keyboard Shortcuts**: Comprehensive shortcuts with `Cmd/Ctrl+/` reference dialog

## Compatibility

| Requirement | Supported |
|-------------|-----------|
| BMAD Version | **BMAD 6** |
| Project Types | BMM (BMAD Method), GDS (BMAD Game Dev), Dashboard (module-only) |
| Browser | Chrome, Edge (File System Access API required) |

## Build from Source

```bash
git clone https://github.com/hacking-robot/bmad-viewer.git
cd bmad-viewer
npm install
npm run dev
```

## Usage

1. Open [BMad Viewer](https://hacking-robot.github.io/bmad-viewer/)
2. Select your BMAD or BMAD game project folder
3. View your stories organized by sprint and status
4. Click a story card to view full details
5. Use `Cmd+K` to open the command palette for quick actions

## Tech Stack

- React 18 + TypeScript
- MUI (Material UI) 6
- Zustand for state management
- Vite
- Emotion (CSS-in-JS) with Base24 color themes

## License

MIT
