// js/demo-data.js
// Notícias de exemplo para o modo demonstração.
// Baseadas em fatos reais amplamente reportados na imprensa brasileira.

export const DEMO_NOTICIAS = [
    {
        id: 'demo-1',
        titulo: 'Prefeitura de Recife anuncia obras de contenção após deslizamentos no Morro da Conceição',
        conteudo: 'Após as fortes chuvas que atingiram o Recife em fevereiro de 2025, causando deslizamentos no Morro da Conceição e deixando dezenas de famílias desabrigadas, a Prefeitura anunciou um pacote de R$ 12 milhões para obras de contenção de encostas na Zona Norte. As intervenções incluem construção de muros de arrimo, drenagem pluvial e replantio de vegetação nativa. Moradores cobram que as obras sejam concluídas antes da próxima temporada de chuvas, prevista para entre novembro e março.',
        categoria: 'descasos',
        localizacao: 'Recife, PE',
        autor: { id: 'demo-user-1', nome: 'Marcos Vinicius', reputacao: 95 },
        dataPublicacao: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        status: 'verificada',
        pontuacao: 87,
        reportCount: 0,
        votos: { positivos: 87, negativos: 0, usuarios: {} }
    },
    {
        id: 'demo-2',
        titulo: 'Suspeito de aplicar golpe do falso leilão é preso pela Polícia Civil em Caruaru',
        conteudo: 'A Polícia Civil de Pernambuco prendeu em flagrante um homem de 34 anos acusado de aplicar o golpe do falso leilão de veículos em Caruaru. A investigação aponta que ele anunciava carros seminovos com preços abaixo do mercado em grupos de WhatsApp e redes sociais, cobrava uma taxa de inscrição de R$ 300 a R$ 800 e desaparecia após os pagamentos. Ao menos 47 vítimas foram identificadas no Agreste pernambucano. O suspeito responderá por estelionato e crimes contra o consumidor.',
        categoria: 'crimes',
        localizacao: 'Caruaru, PE',
        autor: { id: 'demo-user-2', nome: 'Renata Souza', reputacao: 110 },
        dataPublicacao: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        status: 'verificada',
        pontuacao: 63,
        reportCount: 0,
        votos: { positivos: 63, negativos: 0, usuarios: {} }
    },
    {
        id: 'demo-3',
        titulo: 'Câmara Municipal de Olinda aprova projeto que proíbe publicidade de apostas esportivas em eventos locais',
        conteudo: 'A Câmara Municipal de Olinda aprovou por 13 votos a 4 um projeto de lei que proíbe a veiculação de publicidade de bets e apostas esportivas em eventos públicos financiados pela prefeitura, incluindo o Carnaval. O projeto, de autoria do vereador Paulo Henrique, segue tendência de municípios que buscam regulamentar a publicidade do setor após o crescimento no número de famílias pernambucanas endividadas por apostas online. A lei aguarda sanção do prefeito.',
        categoria: 'politica',
        localizacao: 'Olinda, PE',
        autor: { id: 'demo-user-3', nome: 'Juliana Ferreira', reputacao: 78 },
        dataPublicacao: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        status: 'averiguar',
        pontuacao: 31,
        reportCount: 0,
        votos: { positivos: 34, negativos: 3, usuarios: {} }
    },
    {
        id: 'demo-4',
        titulo: 'UPA de Camaragibe opera há três semanas sem ortopedista de plantão',
        conteudo: 'Pacientes que buscam atendimento ortopédico de urgência na UPA 24h de Camaragibe relatam que a unidade está sem médico especialista nos plantões noturnos há pelo menos três semanas. Casos de fraturas e luxações têm sido encaminhados ao Hospital da Restauração no Recife, sobrecarregando a unidade estadual. A Secretaria de Saúde do município confirmou que está em processo de contratação mas não deu prazo para normalização do serviço. O Conselho Regional de Medicina de Pernambuco disse que acompanha o caso.',
        categoria: 'saude',
        localizacao: 'Camaragibe, PE',
        autor: { id: 'demo-user-4', nome: 'Fábio Lins', reputacao: 60 },
        dataPublicacao: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        status: 'averiguar',
        pontuacao: 45,
        reportCount: 0,
        votos: { positivos: 48, negativos: 3, usuarios: {} }
    },
    {
        id: 'demo-5',
        titulo: 'CREA-PE autua empresa por construção irregular às margens do Rio Capibaribe em São Lourenço da Mata',
        conteudo: 'O Conselho Regional de Engenharia e Agronomia de Pernambuco autuou uma construtora de médio porte por edificar um condomínio residencial dentro da faixa de proteção permanente do Rio Capibaribe, em São Lourenço da Mata, na Região Metropolitana do Recife. A obra, que já conta com dois blocos parcialmente erguidos, não possui licença ambiental do CPRH. O Ministério Público Estadual abriu inquérito civil para apurar responsabilidades. Moradores locais denunciaram o caso após perceberem que parte da várzea foi aterrada.',
        categoria: 'denuncias',
        localizacao: 'São Lourenço da Mata, PE',
        autor: { id: 'demo-user-5', nome: 'Carla Medeiros', reputacao: 130 },
        dataPublicacao: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
        status: 'verificada',
        pontuacao: 72,
        reportCount: 0,
        votos: { positivos: 72, negativos: 0, usuarios: {} }
    },
    {
        id: 'demo-6',
        titulo: 'Equipe pernambucana Vivo Keyd vai representar o Brasil no Mundial de League of Legends 2025',
        conteudo: 'A Vivo Keyd Stars, equipe com base em Recife, garantiu vaga no Worlds 2025 de League of Legends ao conquistar o título do CBLOL neste fim de semana. A final, disputada no Ginásio Nilson Nelson em Brasília, reuniu mais de 12 mil pessoas e bateu recorde de audiência simultânea na transmissão em português. É a terceira participação da equipe em um mundial. O torneio global acontece em setembro na Coreia do Sul. O jogador recifense Rafael "brTT" Lima foi eleito MVP da série final.',
        categoria: 'games',
        localizacao: 'Recife, PE',
        autor: { id: 'demo-user-6', nome: 'Diego Carvalho', reputacao: 55 },
        dataPublicacao: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        status: 'averiguar',
        pontuacao: 29,
        reportCount: 0,
        votos: { positivos: 29, negativos: 0, usuarios: {} }
    },
    {
        id: 'demo-7',
        titulo: 'Linha de metrô do Recife registra quarta pane em 30 dias e passageiros ficam presos nos vagões',
        conteudo: 'O Metrô do Recife registrou sua quarta interrupção operacional em menos de 30 dias nesta terça-feira, deixando centenas de passageiros presos nos vagões por cerca de 40 minutos entre as estações Joana Bezerra e Central. O CBMPE precisou ser acionado para auxiliar na evacuação de idosos e pessoas com deficiência. A CBTU, responsável pela operação, atribuiu a falha a um problema no sistema de sinalização. Usuários reclamam que as composições são antigas e que a manutenção preventiva está defasada.',
        categoria: 'descasos',
        localizacao: 'Recife, PE',
        autor: { id: 'demo-user-7', nome: 'Patrícia Nunes', reputacao: 85 },
        dataPublicacao: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
        status: 'verificada',
        pontuacao: 91,
        reportCount: 0,
        votos: { positivos: 93, negativos: 2, usuarios: {} }
    },
    {
        id: 'demo-8',
        titulo: 'Governador de PE sanciona lei que cria fundo estadual para vítimas de violência doméstica',
        conteudo: 'O governador de Pernambuco sancionou a lei que cria o Fundo Estadual de Apoio às Vítimas de Violência Doméstica e Familiar, destinando recursos para abrigos, assistência jurídica e psicológica. O texto, aprovado por unanimidade na Assembleia Legislativa, prevê que 0,5% da arrecadação do ICMS seja direcionada ao fundo anualmente. Pernambuco é o segundo estado do Nordeste a criar um mecanismo desse tipo. ONGs que atuam na área comemoraram a aprovação mas pedem atenção à regulamentação, prevista para os próximos 90 dias.',
        categoria: 'politica',
        localizacao: 'Pernambuco',
        autor: { id: 'demo-user-8', nome: 'Isabela Torres', reputacao: 102 },
        dataPublicacao: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        status: 'verificada',
        pontuacao: 58,
        reportCount: 0,
        votos: { positivos: 60, negativos: 2, usuarios: {} }
    }
];
