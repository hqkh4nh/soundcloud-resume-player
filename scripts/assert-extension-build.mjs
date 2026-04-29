import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const classicScripts = ['content.js', 'inject.js']

const failures = []

for (const fileName of classicScripts) {
  const filePath = join('dist', fileName)
  const source = await readFile(filePath, 'utf8')
  const violation = findTopLevelModuleSyntax(source)

  if (violation) {
    failures.push(`${filePath}:${violation.line}:${violation.column} contains top-level ${violation.keyword}`)
  }
}

if (failures.length > 0) {
  console.error('Classic extension scripts must not contain static module syntax:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

function findTopLevelModuleSyntax(source) {
  let braceDepth = 0
  let bracketDepth = 0
  let parenDepth = 0
  let line = 1
  let column = 1
  let index = 0

  while (index < source.length) {
    const char = source[index]
    const next = source[index + 1]

    if (char === '\n') {
      line += 1
      column = 1
      index += 1
      continue
    }

    if (char === '/' && next === '/') {
      index += 2
      column += 2
      while (index < source.length && source[index] !== '\n') {
        index += 1
        column += 1
      }
      continue
    }

    if (char === '/' && next === '*') {
      index += 2
      column += 2
      while (index < source.length) {
        if (source[index] === '*' && source[index + 1] === '/') {
          index += 2
          column += 2
          break
        }
        if (source[index] === '\n') {
          line += 1
          column = 1
          index += 1
        } else {
          index += 1
          column += 1
        }
      }
      continue
    }

    if (char === '"' || char === "'") {
      const quote = char
      index += 1
      column += 1
      while (index < source.length) {
        if (source[index] === '\\') {
          index += 2
          column += 2
          continue
        }
        if (source[index] === quote) {
          index += 1
          column += 1
          break
        }
        if (source[index] === '\n') {
          line += 1
          column = 1
          index += 1
        } else {
          index += 1
          column += 1
        }
      }
      continue
    }

    if (char === '`') {
      index += 1
      column += 1
      while (index < source.length) {
        if (source[index] === '\\') {
          index += 2
          column += 2
          continue
        }
        if (source[index] === '`') {
          index += 1
          column += 1
          break
        }
        if (source[index] === '\n') {
          line += 1
          column = 1
          index += 1
        } else {
          index += 1
          column += 1
        }
      }
      continue
    }

    const isTopLevel = braceDepth === 0 && bracketDepth === 0 && parenDepth === 0
    if (isTopLevel && startsWithKeyword(source, index, 'import')) {
      const nextToken = source.slice(index + 'import'.length).trimStart()[0]
      if (nextToken !== '(' && nextToken !== '.') {
        return { keyword: 'static import', line, column }
      }
    }

    if (isTopLevel && startsWithKeyword(source, index, 'export')) {
      return { keyword: 'export', line, column }
    }

    if (char === '{') braceDepth += 1
    if (char === '}') braceDepth -= 1
    if (char === '[') bracketDepth += 1
    if (char === ']') bracketDepth -= 1
    if (char === '(') parenDepth += 1
    if (char === ')') parenDepth -= 1

    index += 1
    column += 1
  }

  return null
}

function startsWithKeyword(source, index, keyword) {
  if (!source.startsWith(keyword, index)) return false

  const before = source[index - 1]
  const after = source[index + keyword.length]

  return !isIdentifierPart(before) && !isIdentifierPart(after)
}

function isIdentifierPart(char) {
  return Boolean(char && /[$\w]/.test(char))
}
