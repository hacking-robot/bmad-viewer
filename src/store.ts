import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Epic,
  Story,
  StoryContent,
  StoryStatus,
  ProjectType,
} from "./types";
import type { SprintData, VelocityLog } from "./types";
import type { BmadScanResult } from "./types/bmadScan";
import type { WorkflowConfig } from "./types/bmadScan";

export type ViewMode = "board" | "dashboard";

export interface ArtifactViewerTarget {
  name: string;
  path: string;
  displayName: string;
  type: string;
}

export interface RecentProject {
  name: string;
  projectType: ProjectType;
  outputFolder?: string;
  colorTheme?: string;
}

const MAX_RECENT_PROJECTS = 10;

interface AppState {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  themeMode: "light" | "dark";
  setThemeMode: (mode: "light" | "dark") => void;
  toggleTheme: () => void;
  colorTheme: string;
  setColorTheme: (theme: string) => void;

  projectName: string | null;
  projectType: ProjectType | null;
  outputFolder: string;
  setProjectName: (name: string | null) => void;
  setProjectType: (type: ProjectType | null) => void;
  setOutputFolder: (folder: string) => void;

  bmadScanResult: BmadScanResult | null;
  scannedWorkflowConfig: WorkflowConfig | null;
  setBmadScanResult: (result: BmadScanResult | null) => void;
  setScannedWorkflowConfig: (config: WorkflowConfig | null) => void;

  recentProjects: RecentProject[];
  addRecentProject: (project: RecentProject) => void;
  removeRecentProject: (name: string) => void;

  epics: Epic[];
  stories: Story[];
  loading: boolean;
  error: string | null;
  lastRefreshed: Date | null;
  isWatching: boolean;
  documentsRevision: number;
  bumpDocumentsRevision: () => void;
  setEpics: (epics: Epic[]) => void;
  setStories: (stories: Story[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastRefreshed: (date: Date | null) => void;
  setIsWatching: (watching: boolean) => void;

  selectedEpicId: number | null;
  setSelectedEpicId: (id: number | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  collapsedColumnsByEpic: Record<string, StoryStatus[]>;
  toggleColumnCollapse: (status: StoryStatus) => void;
  getCollapsedColumns: () => StoryStatus[];

  storyOrder: Record<string, Record<string, string[]>>;
  setStoryOrder: (epicId: string, status: string, storyIds: string[]) => void;
  getStoryOrder: (epicId: string, status: string) => string[];

  selectedStory: Story | null;
  storyContent: StoryContent | null;
  setSelectedStory: (story: Story | null) => void;
  setStoryContent: (content: StoryContent | null) => void;

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  sprints: SprintData[];
  velocityLog: VelocityLog | null;
  selectedSprintNumber: number | null;
  isMultiSprint: boolean;
  setSprints: (sprints: SprintData[]) => void;
  setVelocityLog: (log: VelocityLog | null) => void;
  setSelectedSprintNumber: (num: number | null) => void;
  setIsMultiSprint: (isMulti: boolean) => void;

  artifactViewerFile: ArtifactViewerTarget | null;
  artifactViewerScrollTo: string | null;
  openArtifactViewer: (file: ArtifactViewerTarget, scrollTo?: string) => void;
  closeArtifactViewer: () => void;

  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  jiraDomain: string;
  setJiraDomain: (domain: string) => void;

  getFilteredStories: () => Story[];
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      themeMode: "dark",
      setThemeMode: (mode) => set({ themeMode: mode }),
      toggleTheme: () =>
        set((state) => ({
          themeMode: state.themeMode === "light" ? "dark" : "light",
        })),
      colorTheme: "gruvbox-dark",
      setColorTheme: (theme) =>
        set((state) => ({
          colorTheme: theme,
          recentProjects: state.projectName
            ? state.recentProjects.map((p) =>
                p.name === state.projectName
                  ? { ...p, colorTheme: theme }
                  : p,
              )
            : state.recentProjects,
        })),

      projectName: null,
      projectType: null,
      outputFolder: "_bmad-output",
      setProjectName: (name) => set({ projectName: name }),
      setProjectType: (type) => set({ projectType: type }),
      setOutputFolder: (folder) => set({ outputFolder: folder }),

      bmadScanResult: null,
      scannedWorkflowConfig: null,
      setBmadScanResult: (result) => set({ bmadScanResult: result }),
      setScannedWorkflowConfig: (config) =>
        set({ scannedWorkflowConfig: config }),

      recentProjects: [],
      addRecentProject: (project) =>
        set((state) => {
          const filtered = state.recentProjects.filter(
            (p) => p.name !== project.name,
          );
          return { recentProjects: [project, ...filtered].slice(0, MAX_RECENT_PROJECTS) };
        }),
      removeRecentProject: (name) =>
        set((state) => ({
          recentProjects: state.recentProjects.filter((p) => p.name !== name),
        })),

      epics: [],
      stories: [],
      loading: false,
      error: null,
      lastRefreshed: null,
      isWatching: false,
      setEpics: (epics) => set({ epics }),
      setStories: (stories) => set({ stories }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setLastRefreshed: (date) => set({ lastRefreshed: date }),
      setIsWatching: (watching) => set({ isWatching: watching }),
      documentsRevision: 0,
      bumpDocumentsRevision: () =>
        set((state) => ({ documentsRevision: state.documentsRevision + 1 })),

      selectedEpicId: null,
      setSelectedEpicId: (id) => set({ selectedEpicId: id }),
      searchQuery: "",
      setSearchQuery: (query) => set({ searchQuery: query }),

      collapsedColumnsByEpic: {},
      toggleColumnCollapse: (status) =>
        set((state) => {
          const epicKey =
            state.selectedEpicId === null
              ? "all"
              : String(state.selectedEpicId);
          const currentCollapsed = state.collapsedColumnsByEpic[epicKey] || [];
          const isCollapsed = currentCollapsed.includes(status);
          return {
            collapsedColumnsByEpic: {
              ...state.collapsedColumnsByEpic,
              [epicKey]: isCollapsed
                ? currentCollapsed.filter((s) => s !== status)
                : [...currentCollapsed, status],
            },
          };
        }),
      getCollapsedColumns: () => {
        const state = get();
        const epicKey =
          state.selectedEpicId === null ? "all" : String(state.selectedEpicId);
        return state.collapsedColumnsByEpic[epicKey] || [];
      },

      storyOrder: {},
      setStoryOrder: (epicId, status, storyIds) =>
        set((state) => ({
          storyOrder: {
            ...state.storyOrder,
            [epicId]: {
              ...(state.storyOrder[epicId] || {}),
              [status]: storyIds,
            },
          },
        })),
      getStoryOrder: (epicId, status) => {
        const state = get();
        return state.storyOrder[epicId]?.[status] || [];
      },

      selectedStory: null,
      storyContent: null,
      setSelectedStory: (story) => set({ selectedStory: story }),
      setStoryContent: (content) => set({ storyContent: content }),

      viewMode: "board",
      setViewMode: (mode) => set({ viewMode: mode }),

      sprints: [],
      velocityLog: null,
      selectedSprintNumber: null,
      isMultiSprint: false,
      setSprints: (sprints) => set({ sprints }),
      setVelocityLog: (log) => set({ velocityLog: log }),
      setSelectedSprintNumber: (num) => set({ selectedSprintNumber: num }),
      setIsMultiSprint: (isMulti) => set({ isMultiSprint: isMulti }),

      artifactViewerFile: null,
      artifactViewerScrollTo: null,
      openArtifactViewer: (file, scrollTo) =>
        set({ artifactViewerFile: file, artifactViewerScrollTo: scrollTo ?? null }),
      closeArtifactViewer: () =>
        set({ artifactViewerFile: null, artifactViewerScrollTo: null }),

      zoomLevel: 100,
      setZoomLevel: (level) => {
        const clamped = Math.max(50, Math.min(200, level));
        set({ zoomLevel: clamped });
      },
      jiraDomain: "",
      setJiraDomain: (domain) => set({ jiraDomain: domain }),

      getFilteredStories: () => {
        const { stories, selectedEpicId, epics, searchQuery } = get();
        let filtered = stories;

        if (
          selectedEpicId !== null &&
          epics.some((e) => e.id === selectedEpicId)
        ) {
          filtered = filtered.filter((s) => s.epicId === selectedEpicId);
        }

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (s) =>
              s.title.toLowerCase().includes(query) ||
              s.id.toLowerCase().includes(query),
          );
        }

        return filtered;
      },
    }),
    {
      name: "bmad-viewer-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        colorTheme: state.colorTheme,
        selectedEpicId: state.selectedEpicId,
        collapsedColumnsByEpic: state.collapsedColumnsByEpic,
        recentProjects: state.recentProjects,
        storyOrder: state.storyOrder,
        zoomLevel: state.zoomLevel,
        jiraDomain: state.jiraDomain,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    },
  ),
);
