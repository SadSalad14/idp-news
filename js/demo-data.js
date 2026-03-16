// js/demo-data.js
// Notícias de exemplo usadas quando o Firebase não está configurado.
// Todas as interações (votos, publicações) ficam apenas na memória
// e são perdidas ao recarregar — isso é intencional no modo demo.

export const DEMO_NOTICIAS = [
    {
        id: 'demo-1',
        titulo: 'Buraco na Av. Central compromete trânsito há mais de 30 dias',
        conteudo: 'Moradores do bairro relatam que um buraco de aproximadamente 1 metro de diâmetro na Avenida Central está causando acidentes e lentidão desde o início do mês. A prefeitura foi notificada três vezes mas nenhuma equipe apareceu para fazer o reparo. Motoristas precisam desviar pela contramão, gerando riscos para pedestres.',
        categoria: 'descasos',
        localizacao: 'Recife, PE',
        autor: { id: 'demo-user-1', nome: 'João Silva', reputacao: 80 },
        dataPublicacao: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'verificada',
        pontuacao: 74,
        reportCount: 0,
        votos: { positivos: 74, negativos: 0, usuarios: {} }
    },
    {
        id: 'demo-2',
        titulo: 'Farmácia popular fecha sem aviso e deixa pacientes sem remédios',
        conteudo: 'A farmácia popular do Posto de Saúde do bairro encerrou o atendimento às 14h de ontem, duas horas antes do horário previsto, sem qualquer comunicado. Dezenas de pacientes com doenças crônicas ficaram sem retirar medicamentos de uso contínuo. A UBS informou que houve "problema no sistema" mas não deu prazo para normalização.',
        categoria: 'saude',
        localizacao: 'Caruaru, PE',
        autor: { id: 'demo-user-2', nome: 'Maria Santos', reputacao: 120 },
        dataPublicacao: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        status: 'verificada',
        pontuacao: 52,
        reportCount: 0,
        votos: { positivos: 52, negativos: 0, usuarios: {} }
    },
    {
        id: 'demo-3',
        titulo: 'Vereador vota contra projeto de iluminação pública e depois justifica ausência',
        conteudo: 'O vereador Marcos Pereira votou contra o projeto que previa instalação de 200 postes de LED no bairro durante a sessão de terça-feira. No dia seguinte, publicou nas redes sociais que havia estado "ausente" da votação por motivos de saúde. O vídeo da sessão, disponível no canal da Câmara, mostra claramente sua presença e seu voto contrário.',
        categoria: 'politica',
        localizacao: 'Olinda, PE',
        autor: { id: 'demo-user-3', nome: 'Carlos Ferreira', reputacao: 65 },
        dataPublicacao: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        status: 'averiguar',
        pontuacao: 18,
        reportCount: 0,
        votos: { positivos: 20, negativos: 2, usuarios: {} }
    },
    {
        id: 'demo-4',
        titulo: 'Empresa de ônibus cobra tarifa dobrada em linha intermunicipal sem autorização',
        conteudo: 'Passageiros da linha 301 (Recife-Caruaru) relatam que desde a última segunda-feira a empresa passou a cobrar R$28,00 no trecho, quando a tarifa homologada pela ARPE é de R$14,50. Ao questionar os cobrados, motoristas informam que "houve reajuste". A agência reguladora não registra nenhum reajuste autorizado para essa linha nos últimos seis meses.',
        categoria: 'denuncias',
        localizacao: 'Região Metropolitana do Recife, PE',
        autor: { id: 'demo-user-4', nome: 'Ana Oliveira', reputacao: 95 },
        dataPublicacao: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        status: 'averiguar',
        pontuacao: 34,
        reportCount: 0,
        votos: { positivos: 36, negativos: 2, usuarios: {} }
    },
    {
        id: 'demo-5',
        titulo: 'Homem é preso tentando aplicar golpe do falso alvará em estabelecimentos comerciais',
        conteudo: 'A Polícia Civil prendeu em flagrante um homem de 38 anos que se passava por fiscal da prefeitura para extorquir donos de bares e restaurantes. A vítima que denunciou relatou que o suspeito exigiu R$800 para "regularizar documentação" de um estabelecimento que já possuía todos os alvarás em dia. O suspeito possui passagens por estelionato e foi levado à delegacia.',
        categoria: 'crimes',
        localizacao: 'Boa Viagem, Recife, PE',
        autor: { id: 'demo-user-5', nome: 'Pedro Lima', reputacao: 70 },
        dataPublicacao: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'verificada',
        pontuacao: 61,
        reportCount: 0,
        votos: { positivos: 61, negativos: 0, usuarios: {} }
    },
    {
        id: 'demo-6',
        titulo: 'Campeonato regional de eSports reúne mais de 400 participantes em Recife',
        conteudo: 'O Nordeste Game Cup reuniu este fim de semana mais de 400 jogadores competindo em modalidades como CS2, Valorant e Free Fire no Centro de Convenções do Recife. O evento, considerado um dos maiores da região Norte-Nordeste, distribuiu R$15.000 em prêmios e contou com transmissão ao vivo que atingiu pico de 12 mil espectadores simultâneos.',
        categoria: 'games',
        localizacao: 'Recife, PE',
        autor: { id: 'demo-user-6', nome: 'Lucas Gamer', reputacao: 55 },
        dataPublicacao: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        status: 'averiguar',
        pontuacao: 28,
        reportCount: 0,
        votos: { positivos: 28, negativos: 0, usuarios: {} }
    }
];
