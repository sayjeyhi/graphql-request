import { createFromBuffer } from '@dprint/formatter'
import { getPath } from '@dprint/typescript'
import _ from 'json-bigint'
import fs from 'node:fs/promises'
import * as Path from 'node:path'
import { fileExists } from '../lib/prelude.js'
import { generateCode, type Input as GenerateInput } from './code/generateCode.js'

export interface Input {
  outputDirPath: string
  code?: Omit<GenerateInput, 'schemaSource' | 'sourceDirPath' | 'options'>
  sourceDirPath?: string
  sourceCustomScalarCodecsFilePath?: string
  schemaPath?: string
  format?: boolean
}

export const generateFiles = async (input: Input) => {
  const sourceDirPath = input.sourceDirPath ?? process.cwd()
  const schemaPath = input.schemaPath ?? Path.join(sourceDirPath, `schema.graphql`)
  const schemaSource = await fs.readFile(schemaPath, `utf8`)

  // todo support other extensions: .tsx,.js,.mjs,.cjs
  const customScalarCodecsFilePath = input.sourceCustomScalarCodecsFilePath
    ?? Path.join(sourceDirPath, `customScalarCodecs.ts`)
  const customScalarCodecsImportPath = Path.relative(
    input.outputDirPath,
    customScalarCodecsFilePath.replace(/\.ts$/, `.js`),
  )
  const customScalarCodecsPathExists = await fileExists(customScalarCodecsFilePath)
  const typeScriptFormatter = (input.format ?? true) ? createFromBuffer(await fs.readFile(getPath())) : undefined

  const codes = generateCode({
    schemaSource,
    importPaths: {
      customScalarCodecs: customScalarCodecsImportPath,
    },
    ...input.code,
    options: {
      formatter: typeScriptFormatter,
      customScalars: customScalarCodecsPathExists,
    },
  })

  await fs.mkdir(input.outputDirPath, { recursive: true })
  await Promise.all(
    codes.map((code) => {
      return fs.writeFile(`${input.outputDirPath}/${code.moduleName}.ts`, code.code, { encoding: `utf8` })
    }),
  )
}
