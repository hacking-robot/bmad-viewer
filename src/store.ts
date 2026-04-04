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
import type { SetupProgress } from "./types/bmadScan";

export type ViewMode = "board" | "dashboard" | "setup";

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
  isRemote?: boolean;
  remoteUrl?: string;
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
  removeRecentProject: (name: string, isRemote?: boolean) => void;

  epics: Epic[];
  stories: Story[];
  loading: boolean;
  loadingStatus: string;
  error: string | null;
  lastRefreshed: Date | null;
  isWatching: boolean;
  documentsRevision: number;
  bumpDocumentsRevision: () => void;
  setEpics: (epics: Epic[]) => void;
  setStories: (stories: Story[]) => void;
  setLoading: (loading: boolean) => void;
  setLoadingStatus: (status: string) => void;
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

  boardAvailable: boolean;
  setupProgress: SetupProgress | null;
  setBoardAvailable: (available: boolean) => void;
  setSetupProgress: (progress: SetupProgress | null) => void;

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

  remoteViewingBranch: string | null;
  isRemoteProject: boolean;
  remoteProjectUrl: string | null;
  remoteOwner: string;
  remoteRepo: string;
  remoteUpdateAvailable: boolean;
  hasGitHubToken: boolean;
  setRemoteViewingBranch: (branch: string | null) => void;
  setIsRemoteProject: (remote: boolean) => void;
  setRemoteProjectUrl: (url: string | null) => void;
  setRemoteOwner: (owner: string) => void;
  setRemoteRepo: (repo: string) => void;
  setRemoteUpdateAvailable: (available: boolean) => void;
  setHasGitHubToken: (hasToken: boolean) => void;
  isReadOnly: () => boolean;

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
            (p) => !(p.name === project.name && p.isRemote === project.isRemote),
          );
          return { recentProjects: [project, ...filtered].slice(0, MAX_RECENT_PROJECTS) };
        }),
      removeRecentProject: (name, isRemote) =>
        set((state) => {
          const removed = state.recentProjects.find(
            (p) => p.name === name && p.isRemote === isRemote,
          );
          if (!removed) return {};
          const isCurrentProject =
            state.projectName === name &&
            (state.isRemoteProject ?? false) === (isRemote ?? false);
          return {
            recentProjects: state.recentProjects.filter(
              (p) => !(p.name === name && p.isRemote === isRemote),
            ),
            ...(isCurrentProject
              ? {
                  projectName: null,
                  projectType: null,
                  selectedEpicId: null,
                  collapsedColumnsByEpic: {},
                  storyOrder: {},
                  epics: [],
                  stories: [],
                  selectedStory: null,
                  storyContent: null,
                  sprints: [],
                  velocityLog: null,
                  selectedSprintNumber: null,
                  isMultiSprint: false,
                }
              : {}),
          };
        }),

      epics: [],
      stories: [],
      loading: false,
      loadingStatus: '',
      error: null,
      lastRefreshed: null,
      isWatching: false,
      setEpics: (epics) => set({ epics }),
      setStories: (stories) => set({ stories }),
      setLoading: (loading) => set({ loading, loadingStatus: loading ? '' : '' }),
      setLoadingStatus: (loadingStatus) => set({ loadingStatus }),
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

      boardAvailable: false,
      setupProgress: null,
      setBoardAvailable: (available) => set({ boardAvailable: available }),
      setSetupProgress: (progress) => set({ setupProgress: progress }),

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

      remoteViewingBranch: null,
      isRemoteProject: false,
      remoteProjectUrl: null,
      remoteOwner: '',
      remoteRepo: '',
      remoteUpdateAvailable: false,
      hasGitHubToken: false,
      setRemoteViewingBranch: (branch) => set({ remoteViewingBranch: branch, remoteUpdateAvailable: false }),
      setIsRemoteProject: (remote) => set({ isRemoteProject: remote }),
      setRemoteProjectUrl: (url) => set({ remoteProjectUrl: url }),
      setRemoteOwner: (owner) => set({ remoteOwner: owner }),
      setRemoteRepo: (repo) => set({ remoteRepo: repo }),
      setRemoteUpdateAvailable: (available) => set({ remoteUpdateAvailable: available }),
      setHasGitHubToken: (hasToken) => set({ hasGitHubToken: hasToken }),
      isReadOnly: () => {
        const state = get()
        return state.remoteViewingBranch !== null || state.isRemoteProject
      },

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
