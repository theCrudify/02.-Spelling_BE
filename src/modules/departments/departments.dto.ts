import { z } from 'zod'
import { reqStr, str } from '../../core/dto.ts'

export const DepartmentDto = z.object({
  code: reqStr(30),
  name: reqStr(150),
  section: str(150),
})
export type DepartmentInput = z.infer<typeof DepartmentDto>
