import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { USERNAME, fetchPublicProjects, profileMarkdown } from '../assets/projects.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { projects, incompleteLanguages } = await fetchPublicProjects();
if (incompleteLanguages) throw new Error('A consulta de linguagens ficou incompleta. A cópia anterior foi preservada.');
const generatedAt = new Date().toISOString();
await mkdir(resolve(root, 'data'), { recursive: true });
await writeFile(resolve(root, 'data/repositorios.json'), `${JSON.stringify({ username: USERNAME, generated_at: generatedAt, repositories: projects }, null, 2)}\n`);
await writeFile(resolve(root, 'data/README-perfil.md'), profileMarkdown(projects, generatedAt));
if (process.argv.includes('--perfil')) {
  const path = process.argv[process.argv.indexOf('--perfil') + 1];
  if (!path) throw new Error('Informe o caminho de saída depois de --perfil.');
  await writeFile(resolve(path), profileMarkdown(projects, generatedAt));
}
console.log(`Lista pública atualizada: ${projects.length} projetos de ${USERNAME}.`);
