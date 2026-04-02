import type { Base24Palette } from '../data/themes'

export function createPrismStyleFromBase24(
  palette: Base24Palette,
): Record<string, React.CSSProperties> {
  const h = (hex: string) => '#' + hex

  const bg = h(palette.base00)
  const fg = h(palette.base05)
  const comment = h(palette.base03)
  const variable = h(palette.base12)
  const number = h(palette.base09)
  const className = h(palette.base13)
  const string = h(palette.base14)
  const regex = h(palette.base15)
  const func = h(palette.base16)
  const keyword = h(palette.base17)
  const tag = h(palette.base12)
  const attr = h(palette.base09)
  const lineHighlight = h(palette.base01)

  return {
    'code[class*="language-"]': {
      color: fg,
      background: 'none',
      fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      textAlign: 'left',
      whiteSpace: 'pre',
      wordSpacing: 'normal',
      wordBreak: 'normal',
      wordWrap: 'normal',
      lineHeight: '1.5',
      tabSize: 4,
    },
    'pre[class*="language-"]': {
      color: fg,
      background: bg,
      padding: '1em',
      margin: '0.5em 0',
      overflow: 'auto',
      borderRadius: '0.3em',
    },
    comment: { color: comment, fontStyle: 'italic' },
    prolog: { color: comment },
    doctype: { color: comment },
    cdata: { color: comment },
    punctuation: { color: fg },
    operator: { color: fg },
    'operator.arrow': { color: keyword },
    entity: { color: keyword, cursor: 'help' },
    'tag.punctuation': { color: comment },
    variable: { color: variable },
    property: { color: variable },
    parameter: { color: variable },
    console: { color: variable },
    interpolation: { color: variable },
    'imports.maybe-class-name': { color: variable },
    'exports.maybe-class-name': { color: variable },
    boolean: { color: number },
    number: { color: number },
    constant: { color: number },
    symbol: { color: number },
    'attr-name': { color: attr },
    'class-name': { color: className },
    'maybe-class-name': { color: className },
    namespace: { color: className },
    'doctype.name': { color: className },
    string: { color: string },
    char: { color: string },
    inserted: { color: string },
    selector: { color: string },
    'attr-value': { color: string },
    'attr-value.punctuation': { color: string },
    regex: { color: regex },
    url: { color: regex },
    escape: { color: regex },
    function: { color: func },
    'function.maybe-class-name': { color: func },
    'atrule.url.function': { color: func },
    keyword: { color: keyword },
    'keyword.module': { color: keyword },
    'keyword.control-flow': { color: keyword },
    atrule: { color: keyword },
    'atrule.rule': { color: keyword },
    important: { color: keyword, fontWeight: 'bold' },
    tag: { color: tag },
    'doctype.doctype-tag': { color: tag },
    deleted: { color: variable },
    builtin: { color: variable },
    'pre[class*="language-javascript"]': { color: variable },
    'code[class*="language-javascript"]': { color: variable },
    'pre[class*="language-jsx"]': { color: variable },
    'code[class*="language-jsx"]': { color: variable },
    'pre[class*="language-typescript"]': { color: variable },
    'code[class*="language-typescript"]': { color: variable },
    'pre[class*="language-tsx"]': { color: variable },
    'code[class*="language-tsx"]': { color: variable },
    bold: { fontWeight: 'bold' },
    italic: { fontStyle: 'italic' },
    'pre[class*="language-"]::selection': { background: lineHighlight },
    'pre[class*="language-"] *::selection': { background: lineHighlight },
    'code[class*="language-"]::selection': { background: lineHighlight },
    'code[class*="language-"] *::selection': { background: lineHighlight },
  }
}

export function getInlineCodeColors(
  palette: Base24Palette,
  isDark: boolean
): { background: string; color: string } {
  const fg = palette.base05
  const r = parseInt(fg.slice(0, 2), 16)
  const g = parseInt(fg.slice(2, 4), 16)
  const b = parseInt(fg.slice(4, 6), 16)
  return {
    background: `rgba(${r}, ${g}, ${b}, ${isDark ? 0.15 : 0.08})`,
    color: '#' + (isDark ? palette.base06 : palette.base00),
  }
}

function blendColors(fg: string, bg: string, amount: number): string {
  const parse = (hex: string) => {
    const c = hex.replace('#', '')
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
  }
  const [fr, fgG, fb] = parse(fg)
  const [br, bgG, bb] = parse(bg)
  const r = Math.round(fr * amount + br * (1 - amount))
  const g = Math.round(fgG * amount + bgG * (1 - amount))
  const b = Math.round(fb * amount + bb * (1 - amount))
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

export function createDiffViewStyles(palette: Base24Palette, isDark: boolean): string {
  const h = (hex: string) => '#' + hex
  const bg = h(palette.base00)
  const paper = h(palette.base01)
  const selection = h(palette.base02)
  const comment = h(palette.base03)
  const secondary = h(palette.base04)
  const fg = h(palette.base05)
  const red = h(palette.base12)
  const green = h(palette.base14)
  const blue = h(palette.base16)
  const addBg = blendColors(green, bg, isDark ? 0.15 : 0.2)
  const addBgLine = blendColors(green, bg, isDark ? 0.12 : 0.15)
  const addBgHighlight = blendColors(green, bg, isDark ? 0.25 : 0.3)
  const delBg = blendColors(red, bg, isDark ? 0.15 : 0.2)
  const delBgLine = blendColors(red, bg, isDark ? 0.12 : 0.15)
  const delBgHighlight = blendColors(red, bg, isDark ? 0.25 : 0.3)
  const variable = h(palette.base12)
  const number = h(palette.base09)
  const string = h(palette.base14)
  const func = h(palette.base16)
  const keyword = h(palette.base17)
  const mode = isDark ? 'dark' : 'light'
  const w = `.diff-view-wrapper.${mode}`
  const tw = `.diff-view-wrapper.${mode} .diff-tailwindcss-wrapper[data-theme="${mode}"]`
  const syn = `${tw} .diff-line-syntax-raw`

  return `
${tw} .diff-style-root {
  --diff-border--: ${selection};
  --diff-add-content--: ${addBg};
  --diff-del-content--: ${delBg};
  --diff-add-lineNumber--: ${addBgLine};
  --diff-del-lineNumber--: ${delBgLine};
  --diff-add-content-highlight--: ${addBgHighlight};
  --diff-del-content-highlight--: ${delBgHighlight};
  --diff-plain-content--: ${bg};
  --diff-plain-lineNumber--: ${paper};
  --diff-plain-lineNumber-color--: ${secondary};
  --diff-expand-content--: ${paper};
  --diff-expand-lineNumber--: ${paper};
  --diff-expand-lineNumber-color--: ${comment};
  --diff-empty-content--: ${isDark ? blendColors(bg, '#000000', 0.8) : blendColors(bg, '#ffffff', 0.8)};
  --diff-hunk-content--: ${paper};
  --diff-hunk-lineNumber--: ${selection};
  --diff-hunk-lineNumber-hover--: ${blue};
  --diff-hunk-content-color--: ${secondary};
  --diff-add-widget--: ${blue};
  --diff-add-widget-color--: ${bg};
  color: ${fg};
}
${syn} .hljs { color: ${fg}; background: ${bg}; }
${syn} .hljs-doctag, ${syn} .hljs-keyword, ${syn} .hljs-meta .hljs-keyword, ${syn} .hljs-template-tag, ${syn} .hljs-template-variable, ${syn} .hljs-type, ${syn} .hljs-variable.language_ { color: ${keyword}; }
${syn} .hljs-title, ${syn} .hljs-title.class_, ${syn} .hljs-title.class_.inherited__, ${syn} .hljs-title.function_ { color: ${func}; }
${syn} .hljs-attr, ${syn} .hljs-attribute, ${syn} .hljs-literal, ${syn} .hljs-meta, ${syn} .hljs-number, ${syn} .hljs-operator, ${syn} .hljs-variable, ${syn} .hljs-selector-attr, ${syn} .hljs-selector-class, ${syn} .hljs-selector-id { color: ${number}; }
${syn} .hljs-regexp, ${syn} .hljs-string, ${syn} .hljs-meta .hljs-string { color: ${string}; }
${syn} .hljs-built_in, ${syn} .hljs-symbol { color: ${variable}; }
${syn} .hljs-comment, ${syn} .hljs-code, ${syn} .hljs-formula { color: ${comment}; }
${syn} .hljs-name, ${syn} .hljs-quote, ${syn} .hljs-selector-tag, ${syn} .hljs-selector-pseudo { color: ${variable}; }
${syn} .hljs-subst { color: ${fg}; }
${syn} .hljs-section { color: ${blue}; font-weight: bold; }
${syn} .hljs-bullet { color: ${h(palette.base13)}; }
${syn} .hljs-emphasis { color: ${fg}; font-style: italic; }
${syn} .hljs-strong { color: ${fg}; font-weight: bold; }
${syn} .hljs-addition { color: ${green}; background-color: ${addBg}; }
${syn} .hljs-deletion { color: ${red}; background-color: ${delBg}; }
${w} ::-webkit-scrollbar { width: 8px; height: 8px; }
${w} ::-webkit-scrollbar-track { background: ${paper}; }
${w} ::-webkit-scrollbar-thumb { background: ${comment}; border-radius: 4px; }
${w} ::-webkit-scrollbar-thumb:hover { background: ${secondary}; }
`
}
