import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { parseCsv } from './crud.ts'
import { pool } from './database.ts'

after(() => pool.end())

test('parseCsv: quotes, escaped quotes, newline inside a field, blank lines, BOM', () => {
  const rows = parseCsv('﻿code,name\r\nA-1,"Pocari, 500 ml"\n\nA-2,"He said ""ok""\nline 2"\n')
  assert.deepEqual(rows, [
    { code: 'A-1', name: 'Pocari, 500 ml' },
    { code: 'A-2', name: 'He said "ok"\nline 2' },
  ])
})

test('parseCsv: semicolon separator (Excel, Indonesian locale) and missing cells', () => {
  assert.deepEqual(parseCsv('code;name;brand\nA-1;Satu, dua\n'), [{ code: 'A-1', name: 'Satu, dua', brand: '' }])
})

test('parseCsv: header only or empty file gives no rows', () => {
  assert.deepEqual(parseCsv('code,name\n'), [])
  assert.deepEqual(parseCsv(''), [])
})
