import { loadProjects, filterProjects, projectLanguages } from './projects.mjs';

const grid = document.querySelector('#projects-grid');
const search = document.querySelector('#project-search');
const language = document.querySelector('#language-filter');
const results = document.querySelector('#results-count');
const notice = document.querySelector('#data-notice');
const empty = document.querySelector('#empty-state');
let projects = [];

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function link(label, href, className) {
  const node = element('a', className, label);
  node.href = href; node.target = '_blank'; node.rel = 'noopener noreferrer';
  return node;
}

function card(repo, index) {
  const article = element('article', 'project-card');
  const top = element('div', 'card-top');
  const icon = element('span', 'project-icon', ['</>', '{ }', '⌘'][index % 3]);
  icon.setAttribute('aria-hidden', 'true');
  top.append(icon, element('span', 'card-index', String(index + 1).padStart(2, '0')));
  const title = element('h3'); title.append(link(repo.name, repo.html_url));
  const description = element('p', 'project-description', repo.description || 'Uma ideia no meu caderno. A descrição ainda não foi adicionada no GitHub.');
  const tags = element('div', 'language-tags');
  for (const name of repo.languages.length ? repo.languages : ['Linguagem não identificada']) tags.append(element('span', 'language-tag', name));
  if (repo.archived) tags.append(element('span', 'language-tag', 'Arquivado'));
  if (repo.fork) tags.append(element('span', 'language-tag', 'Fork'));
  const meta = element('div', 'card-meta');
  const stars = element('span', 'card-stars', `☆ ${repo.stargazers_count}`);
  stars.setAttribute('aria-label', `${repo.stargazers_count} ${repo.stargazers_count === 1 ? 'estrela' : 'estrelas'} no GitHub`);
  let updated = 'Data não informada';
  if (repo.updated_at && !Number.isNaN(Date.parse(repo.updated_at))) {
    updated = `Atualizado em ${new Date(repo.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' })}`;
  }
  meta.append(stars, element('span', '', updated));
  const links = element('div', 'card-links');
  links.append(link('Ver código ↗', repo.html_url));
  if (repo.homepage) links.append(link('Abrir demo ↗', repo.homepage, 'demo-link'));
  article.append(top, title, description, tags, meta, links);
  return article;
}

function render() {
  const visible = filterProjects(projects, search.value, language.value);
  const fragment = document.createDocumentFragment();
  visible.forEach((repo, index) => fragment.append(card(repo, index)));
  grid.replaceChildren(fragment);
  empty.hidden = visible.length > 0;
  results.textContent = `${visible.length} ${visible.length === 1 ? 'projeto encontrado' : 'projetos encontrados'}${search.value || language.value ? ` de ${projects.length}` : ''}`;
}

document.querySelector('#filters-form').addEventListener('submit', (event) => event.preventDefault());
search.addEventListener('input', render);
language.addEventListener('change', render);
document.querySelector('#reset-filters').addEventListener('click', () => { search.value = ''; language.value = ''; render(); search.focus(); });
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); search.focus(); }
});

try {
  const data = await loadProjects(); projects = data.projects;
  document.querySelector('#total-count').textContent = projects.length;
  for (const name of projectLanguages(projects)) {
    const option = element('option', '', name); option.value = name; language.append(option);
  }
  const source = document.querySelector('#source-note');
  if (data.source === 'fallback') {
    const date = data.generatedAt && !Number.isNaN(Date.parse(data.generatedAt)) ? new Date(data.generatedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null;
    source.textContent = 'Cópia local dos projetos';
    notice.textContent = `O GitHub está indisponível ou atingiu o limite de consultas. Exibindo a última lista salva${date ? ` em ${date}` : ''}. Novos projetos aparecerão quando a conexão voltar.`;
    notice.hidden = false;
  } else {
    source.textContent = 'Atualizado direto do GitHub';
    if (data.incompleteLanguages) { notice.textContent = 'A lista de projetos está atualizada. Algumas linguagens usam a última informação disponível porque o GitHub limitou essas consultas.'; notice.hidden = false; }
  }
  render();
} catch (error) {
  grid.replaceChildren(); results.textContent = 'Não foi possível carregar a lista.';
  document.querySelector('#source-note').textContent = 'Conexão indisponível';
  notice.append(document.createTextNode(`${error.message} `), link('Ver repositórios no GitHub ↗', 'https://github.com/borgesrbj-oss?tab=repositories'));
  notice.hidden = false;
  const retry = element('button', 'button button-outline', 'Tentar novamente');
  retry.type = 'button'; retry.addEventListener('click', () => location.reload()); grid.append(retry);
} finally { grid.setAttribute('aria-busy', 'false'); }
