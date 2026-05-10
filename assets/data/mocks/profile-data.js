window.DokeProfileData = {
  professionalPublic: {
    pageTitle: 'Doke | Perfil público do profissional',
    hero: {
      avatar: 'SA',
      name: 'Studio Aquarela',
      username: '@studioaquarela',
      location: 'Salvador, BA',
      verified: true,
      headline: 'Pintura residencial e acabamento com escopo claro, comunicação organizada e execução limpa do início ao pós-obra.',
      badges: [
        { label: 'Profissional verificado', tone: 'accent' },
        { label: 'Pintura e acabamento', iconKey: 'painting' }
      ],
      stats: [
        { value: '4,9', label: 'nota média' },
        { value: '128', label: 'avaliações' },
        { value: '18,4 mil', label: 'seguidores' }
      ],
      actions: [
        { label: 'Solicitar orçamento', href: 'detalhe-anuncio.html', tone: 'primary' },
        { label: 'Mensagem', href: 'mensagens.html' },
        { label: 'Compartilhar', tone: 'ghost' }
      ],
      rotatingHighlights: [
        { label: 'Tempo de resposta', value: 'Até 1h', detail: 'em horário comercial' },
        { label: 'Ticket médio', value: 'R$ 180', detail: 'projetos residenciais leves' },
        { label: 'Entrega combinada', value: '2 a 4 dias', detail: 'para pintura interna padrão' },
        { label: 'Comunidade', value: '18,4 mil', detail: 'seguidores acompanhando o perfil' }
      ]
    },
    tabs: {
      services: 'Serviços',
      workers: 'Workers',
      beforeAfter: 'Publicações',
      reviews: 'Avaliações'
    },
    sections: {
      services: {
        layout: 'services',
        title: 'Serviços em destaque',
        intro: 'Vitrine pública focada em anúncios ativos, com leitura rápida de especialidade, reputação e faixa inicial.',
        items: [
          {
            badge: 'Disponível hoje',
            catégory: 'Pintura residencial',
            title: 'Pintura premium para sala e quartos',
            price: 'R$ 180',
            rating: '4,9',
            reviews: '28 avaliações',
            location: 'Itaigara, Salvador',
            mediaClass: 'service-card__media--painter',
            avatarClass: 'service-card__avatar--blue',
            tags: ['#acabamento', '#massa-corrida', '#interna'],
            ctaHref: 'detalhe-anuncio.html'
          },
          {
            badge: 'Resposta rápida',
            badgeTone: 'mint',
            catégory: 'Consultoria de cor',
            title: 'Direção visual para reforma leve',
            price: 'R$ 120',
            rating: '4,8',
            reviews: '11 avaliações',
            location: 'Pituba, Salvador',
            mediaClass: 'service-card__media--consulting',
            avatarClass: 'service-card__avatar--mint',
            tags: ['#curadoria', '#paleta', '#reforma-leve'],
            ctaHref: 'detalhe-anuncio.html'
          },
          {
            badge: 'Top da semana',
            catégory: 'Pós-obra',
            title: 'Acabamento fino e revisão final',
            price: 'R$ 140',
            rating: '5,0',
            reviews: '9 avaliações',
            location: 'Caminho das Árvores, Salvador',
            mediaClass: 'service-card__media--finish',
            avatarClass: 'service-card__avatar--navy',
            tags: ['#posobra', '#retoque', '#finalização'],
            ctaHref: 'detalhe-anuncio.html'
          }
        ]
      },
      posts: {
        layout: 'feed',
        title: 'Publicações recentes',
        intro: 'Conteúdo público que ajuda o cliente a entender processo, bastidores e padrão de execução antes do contato.',
        items: [
          {
            eyebrow: 'Bastidor de obra',
            title: 'Como alinhamos escopo antes de pintar um apartamento ocupado',
            text: 'Checklist de proteção, cronograma por cômodo e regra de comunicação para não transformar uma visita simples em ruído operacional.',
            footer: ['18 comentários', '52 curtidas']
          },
          {
            eyebrow: 'Antes e depois',
            title: 'Sala compacta com acabamento mais claro e sensação de amplitude',
            text: 'Caso curto mostrando preparação de parede, escolha de tom e fechamento com leitura visual mais limpa.',
            footer: ['12 salvamentos', 'Caso recente']
          },
          {
            eyebrow: 'Educativo',
            title: '3 erros que encarecem uma pintura sem melhorar o resultado',
            text: 'Post objetivo para filtrar expectativa irreal e explicar por que acabamento depende de preparo, não só da cor final.',
            footer: ['Post técnico', 'Bom alcance']
          }
        ]
      },
      reviews: {
        layout: 'review-groups',
        title: 'Avaliações por anúncio',
        intro: 'O feedback é agrupado por anúncio para não misturar experiências de serviços com escopos diferentes.',
        groups: [
          {
            title: 'Pintura premium para sala e quartos',
            score: '4,9',
            count: '28 avaliações recentes',
            highlights: [
              { label: 'Acabamento', value: '4,9', text: 'resultado final' },
              { label: 'Prazo', value: '4,8', text: 'entrega combinada' },
              { label: 'Organização', value: '4,9', text: 'obra organizada' },
              { label: 'Preço', value: '4,7', text: 'custo-benefício' },
              { label: 'Atendimento', value: '5,0', text: 'contato e clareza' },
              { label: 'Limpeza', value: '4,8', text: 'cuidado no ambiente' }
            ],
            items: [
              {
                author: 'Marina Alves',
                meta: 'Apartamento 72 m² · cliente verificada',
                rating: '5,0',
                text: 'A proteção foi muito bem feita, o cronograma foi respeitado e o resultado final ficou uniforme sem correria.',
                tags: ['Pintura interna', 'Cliente verificada']
              },
              {
                author: 'Bruno Costa',
                meta: 'Cobertura duplex · atendimento recente',
                rating: '4,8',
                text: 'Gostei da clareza no escopo, do cuidado com a limpeza e da forma de sinalizar cada etapa antes da execução.',
                tags: ['Escopo claro', 'Boa comunicação']
              }
            ]
          },
          {
            title: 'Consultoria de cor e acabamento',
            score: '4,8',
            count: '11 avaliações recentes',
            highlights: [
              { label: 'Clareza', value: '4,9', text: 'explicação do escopo' },
              { label: 'Agilidade', value: '4,7', text: 'tempo de retorno' },
              { label: 'Utilidade', value: '4,8', text: 'aplicação prática' },
              { label: 'Preço', value: '4,6', text: 'valor percebido' },
              { label: 'Atendimento', value: '4,9', text: 'escuta e suporte' },
              { label: 'Organização', value: '4,8', text: 'entrega estruturada' }
            ],
            items: [
              {
                author: 'Juliana Prado',
                meta: 'Casa nova · cliente verificada',
                rating: '4,8',
                text: 'A consultoria evitou compra errada e ajudou a priorizar o que realmente fazia diferença no ambiente.',
                tags: ['Curadoria', 'Direção visual']
              },
              {
                author: 'Renata Lima',
                meta: 'Apartamento alugado · atendimento recente',
                rating: '4,9',
                text: 'As recomendações vieram organizadas e foram fáceis de aplicar. Não ficou com cara de relatório genérico.',
                tags: ['Retorno rápido', 'Aplicável']
              }
            ]
          }
        ]
      },
      about: {
        layout: 'about',
        title: 'Sobre o profissional',
        intro: 'Página pública orientada à decisão do cliente, sem estatística interna nem ação de dono misturada com a vitrine.',
        facts: [
          { label: 'Atendimento', value: 'Residencial e comercial leve' },
          { label: 'Formato', value: 'Visita técnica + execução' },
          { label: 'Regiões', value: 'Salvador e Lauro de Freitas' },
          { label: 'Especialidade', value: 'Pintura, retoque e acabamento fino' }
        ],
        blocks: [
          {
            title: 'Como trabalha',
            text: 'Começa filtrando objetivo, área e urgência. Depois transforma o pedido em escopo visual simples para reduzir retrabalho e alinhar expectativa antes da visita.'
          },
          {
            title: 'Critério de atendimento',
            text: 'Aceita menos volume quando o pedido exige cuidado maior com acabamento, proteção do ambiente e leitura estética do espaço.'
          },
          {
            title: 'O que evita',
            text: 'Não promete prazo agressivo sem ver o ambiente e não empilha serviços diferentes em um único anúncio sem separar contexto.'
          }
        ]
      },
      portfolio: {
        layout: 'portfolio',
        title: 'Portfólio selecionado',
        intro: 'Casos públicos organizados por contexto, para mostrar resultado e não só volume de imagens.',
        items: [
          {
            title: 'Sala contemporânea em tons claros',
            subtitle: 'Pintura + revisão de acabamento',
            text: 'Ambiente com correção de textura, iluminação valorizada e leitura mais leve na área social.',
            chips: ['Antes e depois', '2 dias de execução']
          },
          {
            title: 'Quarto infantil com paleta suave',
            subtitle: 'Consultoria de cor + execução',
            text: 'Definição de paleta, teste de amostra e acabamento final com foco em conforto visual.',
            chips: ['Paleta guiada', 'Cliente recorrente']
          },
          {
            title: 'Revisão fina em apartamento alugado',
            subtitle: 'Retoque pós-obra',
            text: 'Intervenção rápida para corrigir falhas visuais sem transformar o pedido em obra longa.',
            chips: ['Retorno rápido', 'Alto índice de satisfação']
          }
        ]
      },
      achievements: {
        layout: 'achievements',
        title: 'Conquistas públicas',
        intro: 'Sinais de confiança que ajudam o cliente a decidir mais rápido.',
        items: [
          {
            title: 'Top profissional da semana',
            detail: 'Perfil com alta taxa de resposta e avaliações consistentes.',
            icon: '★',
            theme: 'gold',
            shape: 'shield',
            progress: 100,
            status: 'Desbloqueada',
            metric: 'Top 3 da categoria'
          },
          {
            title: 'Resposta rápida',
            detail: 'Maior parte dos contatos respondida em até 1 hora.',
            icon: '↗',
            theme: 'blue',
            shape: 'ticket',
            progress: 82,
            status: '82% para elite',
            metric: 'Meta: 95% em 1h'
          },
          {
            title: 'Cliente recorrente',
            detail: 'Boa retenção em serviços residenciais leves e retoques.',
            icon: '❤',
            theme: 'coral',
            shape: 'blob',
            progress: 67,
            status: '67% concluída',
            metric: '8 de 12 retornos'
          },
          {
            title: 'Mestre do acabamento',
            detail: 'Mantém padrão visual elevado em serviços com revisão final aprovada.',
            icon: '✦',
            theme: 'mint',
            shape: 'diamond',
            progress: 44,
            status: '44% da trilha',
            metric: 'Faltam 5 projetos'
          }
        ]
      },
      certificates: {
        layout: 'certificates',
        title: 'Certificados e validações',
        intro: 'Comprovações públicas do profissional para reforçar confiança antes do primeiro contato.',
        items: [
          {
            title: 'Identidade validada',
            issuer: 'Equipe Doke',
            meta: 'Documento e selfie aprovados',
            status: 'Verificado'
          },
          {
            title: 'Curso de Design de Interiores',
            issuer: 'SENAC Bahia',
            meta: 'Concluído em 2021',
            status: 'Certificado'
          },
          {
            title: 'Boas práticas de atendimento',
            issuer: 'Formação complementar',
            meta: 'Atualização recente',
            status: 'Atualizado'
          }
        ]
      },
      faq: {
        layout: 'faq',
        title: 'Perguntas frequentes',
        intro: 'Dúvidas comuns antes de solicitar orçamento.',
        items: [
          {
            question: 'Você atende só Salvador?',
            answer: 'Atendo Salvador e Lauro de Freitas. Para outras regiões, avalio deslocamento conforme o escopo.'
          },
          {
            question: 'Você faz visita antes de fechar?',
            answer: 'Sim. Em projetos com maior variação de acabamento ou metragem, a visita técnica ajuda a alinhar prazo e custo com mais precisão.'
          },
          {
            question: 'O orçamento já inclui material?',
            answer: 'Depende do serviço. Posso trabalhar com material do cliente ou incluir uma estimativa separada para manter o escopo mais claro.'
          }
        ]
      }
    }
  },

  clientPublic: {
    pageTitle: 'Doke | Perfil público do cliente',
    hero: {
      avatar: 'GA',
      name: 'Gabriel Antonio',
      username: '@gabriel',
      location: 'Salvador, BA',
      verified: true,
      headline: 'Cliente que publica pedidos com briefing organizado, responde rápido e prefere propostas objetivas antes de fechar atendimento.',
      badges: [
        { label: 'Cliente verificado', tone: 'accent' },
        { label: 'Reformas residenciais' },
        { label: 'Briefings claros' }
      ],
      stats: [
        { value: '14', label: 'pedidos publicados' },
        { value: '4,9', label: 'nota como cliente' },
        { value: '86%', label: 'resposta em até 2h' }
      ],
      actions: [
        { label: 'Convidar para proposta', href: 'mensagens.html', tone: 'primary' },
        { label: 'Seguir', tone: 'ghost' },
        { label: 'Compartilhar', tone: 'ghost' }
      ]
    },
    tabs: {
      requests: 'Pedidos públicos',
      references: 'Referências',
      reviews: 'Avaliações',
      about: 'Sobre',
      collections: 'Coleções'
    },
    sections: {
      requests: {
        layout: 'requests',
        title: 'Pedidos públicos recentes',
        intro: 'Aqui a leitura é de demanda e contexto de contratação, não de vitrine de serviço profissional.',
        items: [
          {
            status: 'Aberto',
            title: 'Pintura interna para apartamento de 72 m²',
            text: 'Busca profissional com proteção do ambiente, etapa por cômodo e proposta clara antes da visita.',
            meta: ['Orçamento previsto: até R$ 2.800', 'Resposta esperada hoje']
          },
          {
            status: 'Em curadoria',
            title: 'Consultoria de acabamento para reforma leve',
            text: 'Precisa de direção de cor, ajuste visual e validação de matériais para não extrapolar o escopo.',
            meta: ['Paleta e referências já separadas', 'Atendimento remoto inicial']
          },
          {
            status: 'Fechado recentemente',
            title: 'Revisão pós-obra em sala e corredor',
            text: 'Pedido curto para pequenos retoques, alinhado com documentação visual e prioridade por limpeza.',
            meta: ['Prazo curto', 'Avaliação já publicada']
          }
        ]
      },
      references: {
        layout: 'feed',
        title: 'Referências e publicações',
        intro: 'Área pública mais editorial, usada para reunir referências, inspirações e observações do cliente.',
        items: [
          {
            eyebrow: 'Moodboard',
            title: 'Sala clara com contraste leve e menos ruído visual',
            text: 'Coleção com referências de pintura, marcenaria simples e iluminação indireta para orientar próximas propostas.',
            footer: ['16 salvamentos', 'Atualizado ontem']
          },
          {
            eyebrow: 'Pergunta pública',
            title: 'Vale contratar consultoria de cor antes da compra dos matériais?',
            text: 'Publicação para ouvir profissionais e evitar custo com teste errado de acabamento.',
            footer: ['9 respostas', 'Discussão ativa']
          }
        ]
      },
      reviews: {
        layout: 'review-groups',
        title: 'Avaliações recebidas como cliente',
        intro: 'A reputação aqui mostra organização, respeito ao escopo e qualidade da comunicação durante a contratação.',
        groups: [
          {
            title: 'Feedbacks de profissionais aténdidos',
            score: '4,9',
            count: '31 avaliações públicas',
            highlights: [
              { label: 'Clareza do briefing', value: '5,0' },
              { label: 'Pontualidade', value: '4,8' },
              { label: 'Negociação', value: '4,9' }
            ],
            items: [
              {
                author: 'Studio Aquarela',
                meta: 'Pintura interna · atendimento finalizado',
                rating: '5,0',
                text: 'O briefing estava organizado, as aprovações foram rápidas e o escopo ficou claro desde o primeiro contato.',
                tags: ['Cliente organizada', 'Pagamento em dia']
              },
              {
                author: 'Luz Técnica',
                meta: 'Ajuste elétrico · serviço concluído',
                rating: '4,8',
                text: 'Boa comunicação e prioridade bem definida. Isso reduziu idas e vindas durante a execução.',
                tags: ['Resposta rápida', 'Objetividade']
              }
            ]
          }
        ]
      },
      about: {
        layout: 'about',
        title: 'Sobre o cliente',
        intro: 'Página pública pensada para ajudar profissionais a entender o perfil de contratação antes de enviar proposta.',
        facts: [
          { label: 'Foco atual', value: 'Reforma residencial leve' },
          { label: 'Formato preferido', value: 'Proposta com escopo e faixa de preço' },
          { label: 'Critério', value: 'Clareza visual + previsibilidade' },
          { label: 'Interesse recorrente', value: 'Pintura, marcenaria e iluminação' }
        ],
        blocks: [
          {
            title: 'Como publica pedidos',
            text: 'Normalmente já sobe o pedido com fotos, objetivo, prioridade e restrições principais para filtrar proposta genérica.'
          },
          {
            title: 'O que valoriza em um profissional',
            text: 'Portfólio organizado, linguagem direta, leitura estética do ambiente e capacidade de dividir etapas com clareza.'
          },
          {
            title: 'O que evita',
            text: 'Perfis que misturam serviço, painel interno e informação demais sem ajudar na decisão de contratação.'
          }
        ]
      },
      collections: {
        layout: 'portfolio',
        title: 'Coleções públicas',
        intro: 'Coleções servem como referência para profissionais entenderem estilo, padrão e expectativa visual.',
        items: [
          {
            title: 'Acabamentos claros para áreas sociais',
            subtitle: 'Coleção de referências',
            text: 'Seleção de ambientes com menos contraste pesado, foco em amplitude e acabamento limpo.',
            chips: ['Sala', 'Pintura', 'Iluminação']
          },
          {
            title: 'Reformas leves com cronograma curto',
            subtitle: 'Coleção de processo',
            text: 'Referências de intervenções rápidas e organizadas, boas para profissionais que trabalham com agenda enxuta.',
            chips: ['Curto prazo', 'Baixa sujeira']
          }
        ]
      }
    }
  },

  professionalOwner: {
    pageTitle: 'Doke | Meu perfil profissional',
    hero: {
      avatar: 'SA',
      name: 'Studio Aquarela',
      username: '@studioaquarela',
      location: 'Salvador, BA',
      verified: true,
      headline: 'Área interna para gerir anúncios, reputação e apresentação do perfil sem misturar isso com a vitrine pública.',
      badges: [
        { label: 'Modo dono', tone: 'accent' },
        { label: '3 anúncios ativos' },
        { label: 'Perfil completo 86%' }
      ],
      stats: [
        { value: '17', label: 'leads na semana' },
        { value: '3', label: 'anúncios ativos' },
        { value: 'R$ 6,4k', label: 'potencial em aberto' }
      ],
      actions: [
        { label: 'Editar vitrine pública', href: 'perfil.html', tone: 'primary' },
        { label: 'Novo anúncio', href: 'detalhe-anuncio.html' },
        { label: 'Ver perfil público', href: 'perfil.html', tone: 'ghost' }
      ]
    },
    tabs: {
      overview: 'Visão geral',
      listings: 'Anúncios',
      reputation: 'Reputação',
      content: 'Conteúdo',
      settings: 'Ajustes'
    },
    sections: {
      overview: {
        layout: 'owner-overview',
        title: 'Visão geral da operação',
        intro: 'Painel interno com foco em próximos passos, gargalos e qualidade da apresentação pública.',
        metrics: [
          { value: '6', label: 'novas conversas', text: 'Leads que entraram nas últimas 24h.' },
          { value: '2', label: 'orçamentos pendentes', text: 'Pedidos que já têm contexto suficiente para resposta.' },
          { value: '86%', label: 'perfil completo', text: 'Ainda falta enriquecer portfólio e prova social por anúncio.' },
          { value: '4,9', label: 'nota atual', text: 'Reputação boa, mas com espaço para segmentar melhor os anúncios.' }
        ],
        priorities: [
          { title: 'Subir mais 2 casos no portfólio', text: 'Hoje a vitrine pública está boa, mas ainda depende demais de texto e pouco de prova visual.' },
          { title: 'Separar anúncio de consultoria do anúncio de execução', text: 'Misturar intenção de compra diferente no mesmo anúncio reduz taxa de conversão.' },
          { title: 'Responder leads mornos com recorte de escopo', text: 'Mensagens genéricas precisam voltar com pergunta filtradora, não com proposta completa.' }
        ]
      },
      listings: {
        layout: 'owner-listings',
        title: 'Gestão de anúncios',
        intro: 'Leitura interna para decidir o que manter, pausar ou reescrever na vitrine pública.',
        items: [
          {
            status: 'Ativo',
            title: 'Pintura premium para sala e quartos',
            text: 'Melhor anúncio atual em prova social, mas ainda pode ganhar fotos de processo e CTA mais específica.',
            meta: ['11 leads na semana', 'Conversão estimada: 21%']
          },
          {
            status: 'Ajustar',
            title: 'Consultoria de cor e acabamento',
            text: 'Bom interesse, porém descrição ainda genérica demais para separar quem quer direção visual de quem quer execução completa.',
            meta: ['4 leads na semana', 'Revisar headline']
          },
          {
            status: 'Pausado',
            title: 'Retoque pós-obra',
            text: 'Anúncio útil, mas hoje compete com o premium e rouba tráfego sem ter volume suficiente para sustentar destaque.',
            meta: ['1 lead na semana', 'Reavaliar posicionamento']
          }
        ]
      },
      reputation: {
        layout: 'owner-reputation',
        title: 'Reputação e prova social',
        intro: 'Área interna para interpretar feedback e corrigir ponto de fricção antes que vire débito de marca.',
        metrics: [
          { label: 'Força principal', value: 'Acabamento e organização' },
          { label: 'Risco atual', value: 'Consultoria ainda pouco explicada' },
          { label: 'Pedido recorrente', value: 'Escopo mais visual e menos genérico' }
        ],
        items: [
          {
            title: 'O que mais aparece nas avaliações',
            text: 'Acabamento limpo, escopo claro, cuidado com o ambiente e comunicação objetiva durante a obra.'
          },
          {
            title: 'Onde pode melhorar',
            text: 'Separar melhor o que é consultoria do que é execução e padronizar mais as imagens por anúncio.'
          },
          {
            title: 'Ação recomendada',
            text: 'Criar prova visual curta por tipo de serviço e vincular cada avaliação ao anúncio certo.'
          }
        ]
      },
      content: {
        layout: 'feed',
        title: 'Conteúdo e presença',
        intro: 'Aqui o objetivo é sustentar autoridade da vitrine pública e alimentar descoberta dentro da plataforma.',
        items: [
          {
            eyebrow: 'Roteiro pendente',
            title: 'Gravar antes e depois em formato curto',
            text: 'Publicação simples com 3 frames já ajuda mais do que texto longo sem prova visual.',
            footer: ['Prioridade alta', 'Prazo sugerido: hoje']
          },
          {
            eyebrow: 'Post técnico',
            title: 'Explicar diferença entre consultoria e execução',
            text: 'Esse conteúdo reduz lead desalinhado e melhora a leitura do anúncio de consultoria.',
            footer: ['Prioridade média', 'Bom para captação']
          }
        ]
      },
      settings: {
        layout: 'owner-settings',
        title: 'Ajustes recomendados',
        intro: 'Checklist interno para profissionalizar a base sem improviso visual nem mistura de contexto.',
        items: [
          {
            title: 'Hero público',
            text: 'Manter headline curta, especialidade clara e CTA principal orientada a orçamento. Nada de métrica interna na vitrine.'
          },
          {
            title: 'Anúncios',
            text: 'Separar anúncios por intenção de compra. Um anúncio para consultoria e outro para execução evita ruído comercial.'
          },
          {
            title: 'Portfólio',
            text: 'Subir casos com contexto, não só imagem. Resultado sem história vira prova social fraca.'
          }
        ]
      }
    }
  }
};
