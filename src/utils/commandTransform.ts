import { AITool, AI_TOOLS } from '../types'

export function transformCommand(command: string | null | undefined, aiTool?: AITool): string {
  if (!command) return ''
  if (!aiTool) return command
  const tool = AI_TOOLS.find(t => t.id === aiTool)
  if (tool?.commandFormat === 'name-only') {
    return command.replace(/^\//, '')
  }
  return command
}

export function shouldShowAgentCommand(command: string, aiTool?: AITool): boolean {
  if (!aiTool) return true
  if (!command.includes(':agents:') && !command.includes('-agent-')) return true
  const tool = AI_TOOLS.find(t => t.id === aiTool)
  return tool?.commandFormat === 'slash' || !tool
}
