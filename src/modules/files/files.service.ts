import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { can, scopedPlants, type User } from '../../core/auth.ts'
import { forbidden, notFound, unprocessable } from '../../core/http.ts'
import { masters } from '../../core/masters.ts'
import type { FileRepository } from './files.repository.ts'

/** Shared with the OCR worker (same machine). shortcut: local disk, move to MinIO/S3 when BE and worker run on different hosts. */
export const STORAGE_DIR = resolve(process.env.STORAGE_DIR ?? '../storage')

/** Absolute path of a stored file; refuses paths that escape the storage folder. */
export function storagePath(relative: string) {
  const full = resolve(STORAGE_DIR, relative)
  if (!full.startsWith(STORAGE_DIR + '/')) throw notFound('File')
  return full
}

export class FileService {
  constructor(private readonly repo: FileRepository) {}

  /** Stores an upload on disk (content-addressed by sha256) and returns its id. */
  async save(value: unknown, createdBy: number): Promise<number> {
    if (!(value instanceof File) || value.size === 0) throw unprocessable('File artwork wajib diunggah')
    // Allowed formats = active rows of the file_types master (code = extension); size limit = setting file_max_mb.
    const maxMb = masters.number('file_max_mb', 200)
    const ext = value.name.split('.').pop()?.toLowerCase() ?? ''
    const type = masters.get('file_types', ext)
    if (!type?.is_active) throw unprocessable(`Tipe file tidak didukung. Gunakan: ${masters.active('file_types').map((t) => t.code).join(', ')}`)
    if (value.size > maxMb * 1024 * 1024) throw unprocessable(`Ukuran file maksimal ${maxMb} MB`)
    const data = Buffer.from(await value.arrayBuffer())
    const sha256 = createHash('sha256').update(data).digest('hex')
    const path = join('originals', `${sha256}.${ext}`)
    await mkdir(join(STORAGE_DIR, 'originals'), { recursive: true })
    await writeFile(storagePath(path), data)
    return this.repo.insert({ name: value.name.slice(0, 255), mime: type.mime, size: value.size, path, sha256, created_by: createdBy })
  }

  /** A file is readable only through a label the user may see (plant scope). */
  async download(id: number, user: User) {
    if (!can(user, 'admin') && !(await this.repo.isAccessible(id, scopedPlants(user)))) throw forbidden('Anda tidak memiliki akses ke dokumen ini')
    const file = await this.repo.findById(id)
    if (!file) throw notFound('File')
    return { ...file, data: await readFile(storagePath(file.path)) }
  }
}
