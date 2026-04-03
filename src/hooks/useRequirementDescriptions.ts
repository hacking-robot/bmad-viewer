import { useState, useEffect, useCallback } from 'react'
import { useDocuments } from './useDocuments'
import { getFs } from '../services/fsRouter'

export function useRequirementDescriptions() {
  const { allFiles } = useDocuments()
  const [descriptions, setDescriptions] = useState<Map<string, string>>(new Map())

  const load = useCallback(async () => {
    const targets = allFiles.filter(f => f.type === 'epics' || f.type === 'prd')
    if (targets.length === 0) { setDescriptions(new Map()); return }

    const map = new Map<string, string>()
    for (const file of targets) {
      try {
        const result = await getFs().readFile(file.path)
        if (!result.content) continue
        for (const line of result.content.split('\n')) {
          const m = line.match(/^[-*]\s+\*{0,2}((?:FR|NFR|ARCH|AR)[-]?[\w-]+)\*{0,2}[:\s]+(.+)$/i)
          if (m) {
            const id = m[1].replace(/\s*\(.*?\)\s*$/, '').trim().toUpperCase()
            const desc = m[2].replace(/\*{1,2}/g, '').trim()
            if (desc && !map.has(id)) map.set(id, desc)
          }
        }
      } catch { /* skip unreadable files */ }
    }
    setDescriptions(map)
  }, [allFiles])

  useEffect(() => { load() }, [load])

  const getDescription = useCallback((reqId: string): string | undefined => {
    const key = reqId.replace(/\s*\(.*?\)\s*$/, '').trim().toUpperCase()
    return descriptions.get(key)
  }, [descriptions])

  return { descriptions, getDescription }
}
