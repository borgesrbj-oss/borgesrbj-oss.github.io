export const USERNAME = 'borgesrbj-oss';
export const API_BASE = 'https://api.github.com';

export function safePublicUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function normalizeProject(repo) {
  if (!repo || repo.private !== false || !repo.name || !safePublicUrl(repo.html_url)) return null;
  const languages = Array.isArray(repo.languages) ? repo.languages : Object.keys(repo.languages || {});
  if (repo.language && !languages.includes(repo.language)) languages.unshift(repo.language);
  return {
    name: String(repo.name), description: repo.description ? String(repo.description) : null,
    language: repo.language || languages[0] || null, languages: [...new Set(languages.map(String))],
    stargazers_count: Math.max(0, Number(repo.stargazers_count) || 0), html_url: safePublicUrl(repo.html_url),
    homepage: safePublicUrl(repo.homepage), updated_at: repo.updated_at || null,
    archived: Boolean(repo.archived), fork: Boolean(repo.fork), private: false,
  };
}

export function normalizeProjects(repos) {
  if (!Array.isArray(repos)) throw new Error('A lista de projetos recebida é inválida.');
  return repos.map(normalizeProject).filter(Boolean).sort((a, b) =>
    (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0) || a.name.localeCompare(b.name, 'pt-BR'));
}

const searchable = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export function filterProjects(projects, query = '', language = '') {
  const terms = searchable(query).trim().split(/\s+/).filter(Boolean);
  return projects.filter((repo) => (!language || repo.languages.includes(language)) &&
    terms.every((term) => searchable(`${repo.name} ${repo.description || ''} ${repo.languages.join(' ')}`).includes(term)));
}

export function projectLanguages(projects) {
  return [...new Set(projects.flatMap((repo) => repo.languages))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export async function requestJson(url, { fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`A consulta respondeu HTTP ${response.status}.`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

export async function fetchPublicProjects({ username = USERNAME, fetchImpl = fetch, fallbackProjects = [], timeoutMs = 10000 } = {}) {
  const repositories = [];
  let complete = false;
  for (let page = 1; page <= 50; page += 1) {
    const batch = await requestJson(`${API_BASE}/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&per_page=100&page=${page}`, { fetchImpl, timeoutMs });
    if (!Array.isArray(batch)) throw new Error('Resposta inesperada da API do GitHub.');
    repositories.push(...batch.filter((repo) => repo.private === false));
    if (batch.length < 100) { complete = true; break; }
  }
  if (!complete) throw new Error('A lista é maior que o limite de consulta desta página.');
  let incompleteLanguages = 0;
  const fallback = new Map(fallbackProjects.map((repo) => [repo.name, repo]));
  // Quatro consultas simultâneas evitam uma rajada por repositório.
  for (let offset = 0; offset < repositories.length; offset += 4) {
    await Promise.all(repositories.slice(offset, offset + 4).map(async (repo) => {
      try {
        const languages = await requestJson(`${API_BASE}/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}/languages`, { fetchImpl, timeoutMs });
        if (!languages || Array.isArray(languages) || typeof languages !== 'object') throw new Error('Linguagens inválidas.');
        repo.languages = Object.keys(languages);
      } catch {
        incompleteLanguages += 1;
        repo.languages = fallback.get(repo.name)?.languages || (repo.language ? [repo.language] : []);
      }
    }));
  }
  return { projects: normalizeProjects(repositories), incompleteLanguages };
}

export async function loadProjects({ fetchImpl = fetch, fallbackUrl = './data/repositorios.json', timeoutMs = 10000 } = {}) {
  let snapshot;
  try { snapshot = await requestJson(fallbackUrl, { fetchImpl, timeoutMs }); } catch { snapshot = null; }
  const fallbackProjects = snapshot?.username === USERNAME && Array.isArray(snapshot.repositories)
    ? normalizeProjects(snapshot.repositories) : [];
  try {
    const live = await fetchPublicProjects({ fetchImpl, timeoutMs, fallbackProjects });
    return { ...live, source: 'github', generatedAt: new Date().toISOString() };
  } catch (error) {
    if (snapshot?.username === USERNAME && Array.isArray(snapshot.repositories)) {
      return { projects: fallbackProjects, source: 'fallback', generatedAt: snapshot.generated_at || null, error, incompleteLanguages: 0 };
    }
    throw new Error('Não foi possível carregar os projetos. Tente novamente em alguns instantes.');
  }
}

export function profileMarkdown(projects, generatedAt) {
  const escapeCell = (value) => String(value || '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
  const date = new Date(generatedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return `# Olá, eu sou o Ricardo!\n\nEste é meu espaço para compartilhar projetos, experimentar ideias e acompanhar o que estou construindo.\n\n[Conheça meu portfólio](https://${USERNAME}.github.io) · [Meus repositórios](https://github.com/${USERNAME}?tab=repositories)\n\n## Projetos públicos\n\nA lista abaixo reúne meus repositórios públicos e é atualizada automaticamente pela API do GitHub.\n\n| Projeto | Descrição | Linguagens | Estrelas | Atualização | Demo |\n| --- | --- | --- | ---: | --- | --- |\n${projects.map((repo) => `| [${escapeCell(repo.name)}](${repo.html_url}) | ${escapeCell(repo.description || 'Descrição não informada no GitHub.')} | ${escapeCell(repo.languages.join(', ') || 'Não identificadas')} | ${repo.stargazers_count} | ${repo.updated_at ? new Date(repo.updated_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Não informada'} | ${repo.homepage ? `[Abrir](${repo.homepage})` : '—'} |`).join('\n')}\n\n_Última atualização da lista: ${date}._\n`;
}
