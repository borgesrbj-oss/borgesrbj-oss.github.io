import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProjects, filterProjects, projectLanguages, safePublicUrl, fetchPublicProjects, loadProjects, USERNAME } from '../assets/projects.mjs';

const repo = (name, extra = {}) => ({ name, private: false, html_url: `https://github.com/${USERNAME}/${name}`, description: 'Gestão de natação', language: 'JavaScript', updated_at: '2026-11-13T12:00:00Z', ...extra });
const json = (body, ok = true) => ({ ok, status: ok ? 200 : 403, json: async () => body });

test('busca ignora acentos, combina termos e filtra linguagem secundária', () => {
  const projects = normalizeProjects([repo('treinos', { languages: ['JavaScript', 'CSS'] }), repo('agenda', { description: 'Eventos', language: 'HTML' })]);
  assert.equal(filterProjects(projects, 'gestao natacao', 'CSS').length, 1);
  assert.equal(filterProjects(projects, 'eventos', 'CSS').length, 0);
  assert.deepEqual(projectLanguages(projects), ['CSS', 'HTML', 'JavaScript']);
});
test('dados privados e protocolos inseguros não são renderizados', () => {
  const projects = normalizeProjects([repo('publico', { homepage: 'javascript:alert(1)' }), repo('segredo', { private: true }), repo('outro', { html_url: 'data:text/html,oi' })]);
  assert.equal(projects.length, 1); assert.equal(projects[0].homepage, null);
  assert.equal(safePublicUrl('https://usuario:senha@example.com'), null);
});
test('consulta pagina todos os repositórios e coleta linguagens', async () => {
  const first = Array.from({ length: 100 }, (_, i) => repo(`projeto-${i}`));
  const calls = [];
  const fetchImpl = async (url) => { calls.push(url); return json(url.includes('/languages') ? { JavaScript: 20, CSS: 10 } : url.includes('page=2') ? [repo('ultimo')] : first); };
  const result = await fetchPublicProjects({ fetchImpl });
  assert.equal(result.projects.length, 101); assert.equal(result.incompleteLanguages, 0);
  assert.ok(calls.some((url) => url.includes('page=2')));
  assert.deepEqual(result.projects[0].languages, ['JavaScript', 'CSS']);
});
test('falha de API usa JSON de fallback e conserva somente projetos públicos', async () => {
  const fetchImpl = async (url) => url.startsWith('./') ? json({ username: USERNAME, generated_at: '2026-11-13T12:00:00Z', repositories: [repo('salvo'), repo('privado', { private: true })] }) : json({}, false);
  const result = await loadProjects({ fetchImpl });
  assert.equal(result.source, 'fallback'); assert.equal(result.projects.length, 1); assert.equal(result.projects[0].name, 'salvo');
});
test('falha no fallback ainda permite usar API disponível', async () => {
  const result = await loadProjects({ fetchImpl: async (url) => url.startsWith('./') ? json({}, false) : json(url.includes('/languages') ? { HTML: 10 } : [repo('online', { language: 'HTML' })]) });
  assert.equal(result.source, 'github'); assert.equal(result.projects[0].name, 'online');
});
test('falha parcial de linguagens preserva fallback sem ocultar novos projetos', async () => {
  const result = await fetchPublicProjects({ fallbackProjects: [repo('salvo', { languages: ['JavaScript', 'CSS'] })], fetchImpl: async (url) => url.includes('/languages') ? json({}, false) : json([repo('salvo'), repo('novo', { language: 'HTML' })]) });
  assert.equal(result.projects.length, 2); assert.equal(result.incompleteLanguages, 2);
  assert.ok(result.projects.find((p) => p.name === 'salvo').languages.includes('CSS'));
});
test('falha em ambas as fontes informa indisponibilidade', async () => {
  await assert.rejects(loadProjects({ fetchImpl: async () => json({}, false) }), /Não foi possível carregar/);
});
