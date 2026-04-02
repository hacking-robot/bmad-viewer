import { useCallback } from 'react'
import { useStore } from '../store'
import { useDocuments, type DocumentFile } from './useDocuments'

/**
 * Normalize a requirement ID for search.
 * "FR6" → "FR6:", "NFR-PERF-1" → "NFR-PERF-1:", "ARCH-1" → "ARCH-1:"
 * We append ":" because requirement definitions in the markdown are formatted as "- FR6: description"
 */
function buildSearchText(reqId: string): string {
  // Clean up: remove parenthetical notes like "(partial)", trim
  const clean = reqId.replace(/\s*\(.*?\)\s*$/, '').trim()
  return `${clean}:`
}

/**
 * Determine which document type to search for a given requirement prefix.
 * All requirement types (FR, NFR, ARCH, AR) live in the epics file.
 */
function getDocumentPriority(): string[] {
  return ['epics', 'prd']
}

/**
 * Hook that provides a function to open the artifact viewer scrolled to a requirement definition.
 */
export function useRequirementLookup() {
  const openArtifactViewer = useStore((state) => state.openArtifactViewer)
  const { allFiles } = useDocuments()

  const openRequirement = useCallback((reqId: string) => {
    const searchText = buildSearchText(reqId)
    const priorities = getDocumentPriority()

    // Find the best matching document file
    let targetFile: DocumentFile | undefined
    for (const docType of priorities) {
      targetFile = allFiles.find(f => f.type === docType)
      if (targetFile) break
    }

    if (!targetFile) {
      // Fallback: try any markdown file
      targetFile = allFiles[0]
    }

    if (targetFile) {
      openArtifactViewer(targetFile, searchText)
    }
  }, [allFiles, openArtifactViewer])

  return { openRequirement }
}
