# Portfólio de Ricardo

Site estático, responsivo e em português do Brasil com todos os repositórios públicos de **borgesrbj-oss**. O visual usa lilás e laranja pastel, com apresentação, foto pública do GitHub, busca, filtro por linguagens, links de código e demo quando cadastrados.

## Execução local

Requisito: Node.js 22 ou superior. Validação realizada com Node.js 24.14.0. O projeto não possui dependências externas e não precisa de `npm install`.

```powershell
npm run dev
```

Abra [http://127.0.0.1:4173](http://127.0.0.1:4173). Para usar outra porta, defina a variável `PORT` antes de iniciar. Use um servidor HTTP: abrir `index.html` diretamente pelo sistema de arquivos impede o funcionamento normal dos módulos JavaScript e das consultas ao JSON.

```powershell
npm run check
npm run atualizar
```

O primeiro comando verifica sintaxe e testes. O segundo coleta novamente todos os repositórios públicos e suas linguagens, atualizando o JSON de fallback e a cópia do README de perfil em `data/README-perfil.md`.

## Dados e atualização automática

- A página consulta a API pública do GitHub a cada abertura, com paginação de 100 itens, tempo limite e até quatro consultas de linguagens simultâneas.
- Novos repositórios públicos aparecem automaticamente. Repositórios privados não entram na lista; nenhuma autenticação ou chave é enviada pelo navegador.
- Cada card exibe nome, descrição cadastrada, linguagens, estrelas, link, demo (campo `homepage`, quando disponível) e data de atualização.
- A busca considera nome, descrição e linguagens, sem diferenciar acentos ou maiúsculas. O filtro considera também as linguagens secundárias.
- Se o GitHub estiver fora do ar ou limitar as consultas, a página usa `data/repositorios.json` e informa a data da cópia.
- A API pública tem limites de requisições. O fallback continua utilizável sem token. Uma falha parcial na consulta de linguagens usa os metadados disponíveis, preservando os projetos novos.
- O workflow atualiza a cópia diariamente às 09h20 UTC (06h20 em São Paulo, sujeito à fila do GitHub Actions) e permite atualização manual.
- Não existem variáveis de ambiente obrigatórias, tokens de API ou serviços pagos.

## Publicação no GitHub Pages

Repositório previsto: `borgesrbj-oss/borgesrbj-oss.github.io`, branch `main`.

1. Publique os arquivos neste repositório sem substituir conteúdo existente sem revisão.
2. Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions**.
3. O workflow `.github/workflows/publicar.yml` testa e publica a página em cada push para `main`. Execuções agendadas ou manuais também atualizam os dados antes de publicar.
4. O endereço esperado é [https://borgesrbj-oss.github.io](https://borgesrbj-oss.github.io), depois de uma execução bem-sucedida.

O workflow usa o `GITHUB_TOKEN` automático do próprio GitHub, com permissões restritas por job. Nenhum token pessoal é necessário no código. A publicação envia apenas `index.html`, `.nojekyll`, `assets/` e `data/`.

## README de perfil

O arquivo gerado `data/README-perfil.md` pode ser usado como `README.md` do repositório público `borgesrbj-oss/borgesrbj-oss`. A pasta de entrega `perfil-github`, preparada junto deste site, contém o README e um workflow independente para manter essa lista atualizada no repositório de perfil.

Também é possível gerar diretamente outro arquivo local:

```powershell
node scripts/atualizar-projetos.mjs --perfil "CAMINHO_DO_PERFIL/README.md"
```

## Estrutura

```text
portfolio/
├── index.html                  # Apresentação, projetos e contato
├── assets/
│   ├── app.mjs                 # Interface e filtros acessíveis
│   ├── projects.mjs            # API, paginação, busca e fallback
│   ├── styles.css              # Layout responsivo e movimento reduzido
│   ├── ricardo.jpg             # Foto pública do perfil GitHub
│   └── favicon.svg
├── data/
│   ├── repositorios.json       # Última cópia dos dados públicos
│   └── README-perfil.md        # README de perfil gerado
├── scripts/
│   ├── atualizar-projetos.mjs  # Atualização sem credenciais
│   └── serve.mjs               # Servidor local
├── tests/projects.test.mjs     # Busca, segurança, paginação e fallback
└── .github/workflows/publicar.yml
```

## Acessibilidade e compatibilidade

HTML semântico, navegação por teclado, foco visível, rótulos de formulário, avisos de carregamento e erros, região de resultados anunciada por leitores de tela e respeito à preferência por movimento reduzido. O layout adapta-se a computador e celular, incluindo telas estreitas. Usa recursos web disponíveis em versões atuais de Chrome e Safari; uma validação em aparelhos físicos continua recomendada para confirmar o comportamento específico de cada dispositivo.

## Fontes

[Perfil e repositórios públicos](https://github.com/borgesrbj-oss), [API de repositórios do GitHub](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user) e [publicação com GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
