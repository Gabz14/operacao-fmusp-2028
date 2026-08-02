"""Dados fixos: matérias, tópicos, fases, patentes, conquistas, cartas, frases, missões."""

from datetime import date

# ---------------------------------------------------------------------------
# Fases do cronograma (de 06/07/2026 até a 2ª fase da FUVEST 2028)
# ---------------------------------------------------------------------------
PHASES = [
    {"num": 1, "name": "Construção do Hábito", "start": date(2026, 7, 6), "end": date(2026, 10, 25)},
    {"num": 2, "name": "Base", "start": date(2026, 10, 26), "end": date(2027, 4, 25)},
    {"num": 3, "name": "Aprofundamento", "start": date(2027, 4, 26), "end": date(2027, 10, 31)},
    {"num": 4, "name": "Nível FUVEST", "start": date(2027, 11, 1), "end": date(2028, 8, 28)},
    {"num": 5, "name": "Aprovação", "start": date(2028, 8, 29), "end": date(2028, 12, 17)},
]

# ---------------------------------------------------------------------------
# Patentes (RPG)
# ---------------------------------------------------------------------------
RANKS = [
    ("recruta", "Recruta", 0),
    ("cadete", "Cadete", 500),
    ("investigadora", "Investigadora", 1500),
    ("analista", "Analista", 3000),
    ("especialista", "Especialista", 6000),
    ("elite", "Elite", 10000),
    ("veterana", "Veterana", 16000),
    ("operadora", "Operadora", 24000),
    ("agente_fmusp", "Agente FMUSP", 35000),
]

LEVEL_XP = 100  # 1 nível a cada 100 XP


def level_for_xp(xp: int) -> int:
    return xp // LEVEL_XP + 1


def rank_for_xp(xp: int):
    current = RANKS[0]
    for slug, name, threshold in RANKS:
        if xp >= threshold:
            current = (slug, name, threshold)
        else:
            break
    return current


def next_rank(xp: int):
    for slug, name, threshold in RANKS:
        if xp < threshold:
            return {"slug": slug, "name": name, "threshold": threshold, "needed": threshold - xp}
    return None


SUBJECT_WEIGHT = {"matematica": 5, "biologia": 4, "quimica": 4, "fisica": 4,
                  "portugues": 3, "historia": 3, "geografia": 3, "literatura": 2,
                  "ingles": 1, "redacao": 2, "atualidades": 1, "obras": 1}

# ---------------------------------------------------------------------------
# Matérias e tópicos (alinhado ENEM/FUVEST)
# ---------------------------------------------------------------------------
SUBJECTS = [
    ("matematica", "Matemática", "sigma", "#f5c518", 1),
    ("biologia", "Biologia", "dna", "#34d399", 2),
    ("quimica", "Química", "flask-conical", "#60a5fa", 3),
    ("fisica", "Física", "atom", "#f87171", 4),
    ("portugues", "Português", "book-open", "#a78bfa", 5),
    ("historia", "História", "landmark", "#fbbf24", 6),
    ("geografia", "Geografia", "globe", "#4ade80", 7),
    ("literatura", "Literatura", "feather", "#f472b6", 8),
    ("ingles", "Inglês", "languages", "#22d3ee", 9),
    ("redacao", "Redação", "pen-tool", "#e879f9", 10),
    ("atualidades", "Atualidades", "newspaper", "#fb923c", 11),
    ("obras", "Obras FUVEST", "library", "#facc15", 12),
]

TOPICS = {
    "matematica": [
        "Conjuntos e operações", "Função afim", "Função quadrática", "Função exponencial",
        "Função logarítmica", "Sequências: PA", "Sequências: PG", "Análise combinatória",
        "Probabilidade", "Estatística: média e mediana", "Estatística: desvio e variância",
        "Porcentagem e juros", "Razão e proporção", "Grandezas proporcionais",
        "Matemática financeira", "Teorema de Pitágoras", "Semelhança de triângulos",
        "Geometria plana: triângulos", "Geometria plana: quadriláteros",
        "Geometria plana: círculo e circunferência", "Áreas e perímetros",
        "Geometria espacial: prismas e cilindro", "Geometria espacial: pirâmide e cone",
        "Geometria espacial: esfera", "Geometria analítica: ponto e reta",
        "Geometria analítica: circunferência", "Geometria analítica: cônicas",
        "Trigonometria no triângulo retângulo", "Trigonometria: ciclo e identidades",
        "Funções trigonométricas", "Matrizes", "Determinantes", "Sistemas lineares",
        "Números complexos", "Polinômios", "Equações algébricas",
        "Leitura e interpretação de gráficos", "Funções aplicadas a problemas",
        "Resolução de problemas contextualizados", "Revisão geral de Matemática",
    ],
    "biologia": [
        "Introdução à biologia celular", "Membrana plasmática e transporte",
        "Citoplasma e organelas", "Núcleo e cromossomos", "Divisão celular: mitose",
        "Divisão celular: meiose", "Fotossíntese", "Respiração celular", "Tecidos animais",
        "Tecidos vegetais", "Sistema digestório", "Sistema respiratório",
        "Sistema circulatório", "Sistema excretor", "Sistema nervoso",
        "Sistema endócrino", "Sistema reprodutor", "Embriologia",
        "Genética: leis de Mendel", "Probabilidade genética",
        "Herança e cromossomos sexuais", "Genética molecular: DNA e RNA",
        "Síntese proteica", "Biotecnologia", "Evolução: teorias",
        "Especiação e isolamento", "Ecologia: níveis de organização",
        "Cadeias e teias alimentares", "Ciclos biogeoquímicos", "Relações ecológicas",
        "Dinâmica de populações e sucessão", "Impactos ambientais",
        "Vírus e Reino Monera", "Protoctistas e fungos",
        "Reino Vegetal: briófitas a angiospermas", "Reino Animal: invertebrados",
        "Reino Animal: vertebrados", "Fisiologia comparada", "Revisão geral de Biologia",
    ],
    "quimica": [
        "Matéria e suas transformações", "Modelos atômicos", "Tabela periódica",
        "Ligações químicas", "Geometria e polaridade molecular",
        "Forças intermoleculares", "Funções inorgânicas: ácidos e bases",
        "Sais e óxidos", "Reações inorgânicas", "Estequiometria: mol e massa",
        "Cálculo estequiométrico", "Soluções e concentração", "Diluição e misturas",
        "Propriedades coligativas", "Termoquímica", "Cinética química",
        "Equilíbrio químico", "Equilíbrio iônico: pH e pOH", "Hidrólise e tampões",
        "Produto de solubilidade", "Eletroquímica: pilhas", "Eletrólise",
        "Radioatividade", "Hidrocarbonetos", "Funções oxigenadas",
        "Funções nitrogenadas", "Isomeria", "Reações orgânicas",
        "Polímeros e compostos do cotidiano", "Química ambiental", "Gases",
        "Físico-química aplicada", "Química experimental e gráficos",
        "Interpretação de experimentos", "Revisão geral de Química",
    ],
    "fisica": [
        "Cinemática: MU e MUV", "Queda livre e lançamentos", "Vetores",
        "Leis de Newton", "Forças em planos", "Atrito e força elástica",
        "Trabalho e potência", "Energia cinética e potencial",
        "Conservação de energia", "Quantidade de movimento", "Colisões",
        "Gravitação universal", "Estática e máquinas simples",
        "Hidrostática: pressão e empuxo", "Hidrodinâmica",
        "Termometria e dilatação", "Calorimetria", "Mudanças de fase",
        "Transmissão de calor", "Gases ideais", "Termodinâmica",
        "Óptica geométrica: espelhos", "Lentes e instrumentos ópticos",
        "Óptica da visão e fenômenos", "Ondas: classificação",
        "Ondas periódicas e acústica", "Efeito Doppler", "Ondas estacionárias",
        "Eletrostática: carga e campo", "Potencial e energia elétrica",
        "Capacitores", "Corrente e resistores", "Circuitos elétricos",
        "Magnetismo e força magnética", "Indução eletromagnética",
        "Física moderna", "Revisão geral de Física",
    ],
    "portugues": [
        "Fonética e fonologia", "Ortografia", "Acentuação gráfica",
        "Estrutura e formação de palavras", "Substantivo e artigo", "Adjetivo e numeral",
        "Pronomes", "Verbos: tempos e modos", "Verbos: concordância",
        "Advérbios e palavras invariáveis", "Período simples e orações",
        "Período composto: coordenação", "Período composto: subordinação",
        "Orações reduzidas", "Concordância nominal", "Regência nominal e verbal",
        "Crase", "Pontuação", "Figuras de linguagem", "Funções da linguagem",
        "Variação linguística", "Interpretação de texto", "Coesão e coerência",
        "Tipos e gêneros textuais", "Intertextualidade", "Semântica e ambiguidade",
        "Texto não verbal", "Norma culta e uso social", "Revisão geral de Português",
    ],
    "historia": [
        "Pré-história e primeiras civilizações", "Egito e Mesopotâmia", "Grécia Antiga",
        "Roma Antiga", "Feudalismo medieval", "Renascimento e humanismo",
        "Reformas religiosas", "Grandes navegações e mercantilismo",
        "Estado absolutista", "Pré-colonial e povos indígenas",
        "Colonização portuguesa: economia", "Escravidão e resistência",
        "Brasil colônia: revoltas", "Iluminismo e revoluções inglesas",
        "Revolução Francesa e Napoleão", "Revolução Industrial",
        "Independência das Américas", "Independência do Brasil",
        "Brasil Império: 1º e 2º reinado", "Escravidão e abolição no Brasil",
        "Proclamação da República", "República Velha", "Era Vargas",
        "Período democrático 1946-1964", "Ditadura militar 1964-1985",
        "Redemocratização e Nova República", "Primeira Guerra Mundial",
        "Período entreguerras e crise de 29", "Segunda Guerra Mundial",
        "Guerra Fria", "Revolução Russa", "Descolonização da África e Ásia",
        "Oriente Médio e mundo árabe", "América Latina no século XX",
        "Brasil contemporâneo", "Revisão geral de História",
    ],
    "geografia": [
        "Cartografia: escalas e projeções", "Fusos horários", "Estrutura da Terra",
        "Relevo e agentes modeladores", "Clima: elementos e fatores",
        "Massas de ar e tipos de clima", "Hidrografia e recursos hídricos",
        "Biomas do mundo", "Biomas do Brasil", "Ecossistemas e degradação",
        "Demografia e transição", "Migrações", "Urbanização e cidades",
        "Hierarquia e rede urbana", "Agropecuária e modernização",
        "Questão agrária no Brasil", "Industrialização: modelos",
        "Indústria no Brasil", "Fontes de energia", "Energia no Brasil",
        "Comércio e globalização", "Blocos econômicos",
        "Meio ambiente e sustentabilidade", "Geopolítica mundial",
        "Ordem mundial e conflitos", "América Latina", "África", "Europa",
        "Ásia: China, Japão e Tigres", "Oriente Médio e petróleo",
        "População brasileira", "Questões socioambientais",
        "Revisão geral de Geografia",
    ],
    "literatura": [
        "Trovadorismo", "Humanismo", "Classicismo e Camões",
        "Barroco: Gregório de Matos", "Barroco: Padre Vieira", "Arcadismo",
        "Romantismo: 1ª geração", "Romantismo: 2ª geração", "Romantismo: 3ª geração",
        "Realismo: Machado de Assis", "Naturalismo", "Parnasianismo", "Simbolismo",
        "Pré-modernismo", "Modernismo: 1ª fase", "Modernismo: 2ª fase",
        "Modernismo: 3ª fase", "Poesia contemporânea", "Prosa contemporânea",
        "Literatura africana e periférica", "Análise de poemas", "Análise de prosa",
        "Gêneros literários", "Figuras de linguagem na literatura",
        "Estilo e linguagem literária", "Contexto histórico e literatura",
        "Revisão geral de Literatura",
    ],
    "ingles": [
        "Interpretação de texto", "Cognatos e falsos cognatos", "Present tenses",
        "Past tenses", "Future tenses", "Modal verbs", "Conditionals",
        "Passive voice", "Pronouns", "Prepositions", "Linking words",
        "Vocabulary: temas ENEM", "Phrasal verbs", "Gerunds and infinitives",
        "Comparatives and superlatives", "Reported speech",
        "Estrutura do texto em inglês", "Inferência e referência",
        "Simulado de interpretação", "Revisão geral de Inglês",
    ],
    "redacao": [
        "Estrutura da dissertação", "Tema e tese", "Introdução: técnicas",
        "Desenvolvimento: argumentação", "Conclusão e proposta",
        "Competência 1: norma culta", "Competência 2: repertório",
        "Competência 3: argumentação", "Competência 4: coesão",
        "Competência 5: proposta de intervenção", "Análise de temas ENEM",
        "Análise de temas FUVEST", "Repertório sociocultural",
        "Repertório filosófico", "Citações e dados estatísticos",
        "Intertextualidade na redação", "Redação nota 1000: análise",
        "Erros mais comuns", "Correção e reescrita", "Temas polêmicos",
        "Simulado de redação", "Revisão geral de Redação",
    ],
    "atualidades": [
        "Atualidades: política brasileira", "Atualidades: economia",
        "Atualidades: meio ambiente", "Atualidades: tecnologia e IA",
        "Atualidades: saúde pública", "Atualidades: educação",
        "Atualidades: relações internacionais", "Atualidades: sociedade e cultura",
        "Atualidades: ciência", "Atualidades: Brasil no mundo",
    ],
    "obras": [
        "Memórias Póstumas de Brás Cubas — Machado de Assis",
        "Dom Casmurro — Machado de Assis",
        "O Cortiço — Aluísio Azevedo",
        "Macunaíma — Mário de Andrade",
        "Os Sertões — Euclides da Cunha",
        "Sentimento do Mundo — Carlos Drummond de Andrade",
        "Água Funda — Ruth Guimarães",
        "Quarto de Despejo — Carolina Maria de Jesus",
        "Terra Sonâmbula — Mia Couto",
        "A Falência — Júlia Lopes de Almeida",
        "Poemas Escolhidos — Gregório de Matos",
        "Dois Irmãos — Milton Hatoum",
    ],
}

# ---------------------------------------------------------------------------
# Conquistas
# ---------------------------------------------------------------------------
ACHIEVEMENTS = [
    ("primeira_questao", "Primeira Questão", "Resolveu a primeira questão da operação.", 10),
    ("primeiro_pomodoro", "Primeiro Foco", "Completou o primeiro pomodoro.", 10),
    ("primeiro_flashcard", "Primeira Memória", "Revisou o primeiro flashcard.", 10),
    ("primeira_redacao", "Primeira Redação", "Escreveu a primeira redação.", 50),
    ("primeira_semana", "Semana Completa", "Concluiu 100% de uma semana do cronograma.", 100),
    ("q100", "100 Questões", "Resolveu 100 questões.", 50),
    ("q1000", "1000 Questões", "Resolveu 1.000 questões.", 150),
    ("h100", "100 Horas", "Acumulou 100 horas de estudo.", 100),
    ("h500", "500 Horas", "Acumulou 500 horas de estudo.", 300),
    ("d30", "30 Dias", "Manteve 30 dias seguidos de estudo.", 100),
    ("d100", "100 Dias", "Manteve 100 dias seguidos de estudo.", 250),
    ("ano1", "1 Ano de Operação", "Completou um ano inteiro de jornada.", 300),
    ("fim_matematica", "Matemática Dominada", "Concluiu todo o conteúdo de Matemática.", 150),
    ("fim_biologia", "Biologia Dominada", "Concluiu todo o conteúdo de Biologia.", 150),
    ("fim_fisica", "Física Dominada", "Concluiu todo o conteúdo de Física.", 150),
    ("fim_quimica", "Química Dominada", "Concluiu todo o conteúdo de Química.", 150),
    ("fim_cronograma", "Missão Cumprida", "Concluiu o cronograma completo até a FUVEST.", 1000),
    ("nivel10", "Nível 10", "Alcançou o nível 10.", 100),
    ("patente_especialista", "Especialista", "Alcançou a patente Especialista.", 200),
]

# ---------------------------------------------------------------------------
# Cartas colecionáveis (arte procedural SVG — raridades)
# ---------------------------------------------------------------------------
CARDS = [
    ("carta_folha", "A Folha que Venceu", "comum", "Uma folha de caderno dobrada em origami de avião, atravessando a noite.", "Dizem que no primeiro mês de treino, Gabi dobrou uma folha com 100 questões erradas e a fez voar até a FUVEST. O vento devolveu um bilhete: 'ainda não'.", 1),
    ("carta_relogio", "O Relógio de Ouro", "comum", "Um relógio de bolso dourado parado exatamente às 25:00.", "Há um pomodoro que nunca termina: aquele que ela decide não começar. Este relógio marca a única derrota da operação — e por isso nunca mais foi visto.", 1),
    ("carta_caderno", "O Caderno Vivo", "comum", "Um caderno cujas páginas crescem galhos e folhas douradas.", "Todo resumo escrito com verdade faz o caderno florescer. O caderno central da operação já é uma pequena floresta.", 1),
    ("carta_caneta", "A Caneta Tática", "comum", "Uma caneta preta com detalhes dourados, presa por uma corrente.", "O equipamento oficial da operação. Nenhuma redação foi escrita sem ela; nenhum medo sobreviveu à tinta dela.", 1),
    ("carta_biblioteca", "A Biblioteca Silenciosa", "rara", "Uma biblioteca infinita sob a luz de uma lua dourada.", "Cada livro estudado vira um corredor novo. Quem conhece todos os corredores chega à sala onde a FUVEST esconde as questões do ano.", 2),
    ("carta_pomodoro", "O Tomate de Guerra", "rara", "Um tomate de metal dourado com engrenagens e um visor de contagem.", "A arma mais simples e mais temida da operação: 25 minutos de silêncio absoluto. O inimigo? Tudo o que não é a aprovação.", 2),
    ("carta_flashcard", "O Baralho da Memória", "rara", "Um baralho de cartas brilhando em neon, flutuando sobre a mesa.", "Cada carta guarda uma ideia. Jogar o baralho certo na hora da prova é o segredo dos que saem sorrindo da sala.", 2),
    ("carta_questao", "A Questão Espelho", "rara", "Uma questão que reflete quem a resolve.", "Dizem que cada questão da FUVEST é um espelho: mostra não o que você sabe, mas o que você escolheu estudar nos últimos três anos.", 2),
    ("carta_prova", "O Templo do Simulado", "rara", "Um templo futurista onde simulados são disputados sob holofotes dourados.", "Sábado é dia de batalha. Os que sangram no templo não sangram na prova.", 3),
    ("carta_redacao", "A Pena de Luz", "épica", "Uma pena que escreve com luz dourada sobre o ar.", "Reza a lenda que apenas três redações nota mil foram escritas com ela. A quarta está sendo escrita agora, página por página.", 3),
    ("carta_revisao", "O Guardião das Revisões", "épica", "Um guardião de pedra negra com olhos dourados, vigiando o portão da memória.", "Ele não deixa nada ser esquecido. Quem passa pelo portão a cada 7 e 21 dias entra na prova com tudo na memória.", 3),
    ("carta_cidade", "A Cidade Dourada", "épica", "Uma cidade futurista inteira acesa, vista do alto do distrito mais alto.", "Cada distrito dominado acende um setor da cidade. Quando a cidade estiver toda acesa, as portas da FMUSP se abrem sozinhas.", 4),
    ("carta_fm", "A Torre FMUSP", "lendária", "Uma torre de vidro e ouro cortando as nuvens no centro da cidade.", "No topo da torre, uma sala com uma única cadeira. A cadeira tem o nome de quem atravessar os cinco distritos sem desistir.", 5),
    ("carta_estrela", "A Estrela do Primeiro Dia", "lendária", "Uma estrela cadente dourada caindo sobre um caderno aberto no dia 01/07/2026.", "No primeiro dia da operação, uma estrela caiu sobre o caderno de Gabi e sussurrou: 'os três anos mais importantes da sua vida começam agora' — e virou a capa da missão.", 1),
    ("carta_final", "A Fase Final", "lendária", "Um portão de ouro se abrindo para um corredor de luz.", "Só existe uma regra para atravessar: não deixar nada para trás. Todas as revisões feitas, todas as redações corrigidas, todas as cartas no baralho.", 5),
]

# ---------------------------------------------------------------------------
# Frases motivacionais EXCLUSIVAS (sem frases genéricas)
# ---------------------------------------------------------------------------
QUOTES = {
    "dia": [
        "Cada questão dominada hoje é um quarteirão a mais no mapa da Medicina. A cidade inteira já sabe seu nome.",
        "A FMUSP não quer a mais inteligente da sala. Quer a que não desistiu na terça-feira.",
        "Enquanto a cidade dorme, seu caderno acende. É isso que separa quem sonha de quem passa.",
        "Três anos parecem uma eternidade até o dia em que viram três segundos de resposta correta.",
        "Você não está estudando. Você está construindo a versão de você que anda pelo campus em 2029.",
        "O cansaço de hoje é o combustível que a aprovação de 2028 vai queimar.",
        "Distrito Matemática não foi dominado em um dia. Foi dominado em domingos comuns, sem plateia.",
        "A prova dura 4 horas. A preparação dura 3 anos. Quem faz as contas antes, chora depois — de felicidade.",
        "A FUVEST não mede seu talento. Mede sua rotina sob pressão. Hoje é dia de treinar sob pressão.",
        "Um dia sem revisão é uma rua que você esqueceu de iluminar na cidade.",
        "Ela não sabe seu nome. Mas quando você assinar a lista de aprovados, ela vai olhar a folha duas vezes.",
        "O frio na barriga antes do simulado é o mesmo de antes da prova real. Acostume-se a vencer com ele.",
        "Nota não é sorte. É a soma de pomodoros que ninguém viu.",
        "Cada flashcard revisado é um tijolo. A torre FMUSP é construída com 3.000 tijolos desses.",
        "Hoje, escolha ser a versão de você que estuda sem precisar de motivação. Essa versão passa.",
    ],
    "crise": [
        "A operação não acabou. Só pausou. E pausa não é derrota — é respiração antes do próximo distrito.",
        "Três dias de silêncio é o tempo que a dúvida leva para bater à porta. Responda a ela: 5 flashcards. 10 minutos. 3 questões. Volte.",
        "A cidade continuou acesa esperando você. Ela é paciente, mas o cronograma não.",
        "Você não perdeu a sequência. Você só deixou uma mensagem de voz — agora é hora de atender.",
        "Ninguém chegou à FMUSP sem um dia de chuva. A diferença é que o agente volta ao posto. Você volta.",
    ],
    "fase1": [
        "Fase 1 concluída: o hábito nasceu. Agora ele precisa de alimento diário — e você já sabe o cardápio.",
        "Você não construiu uma rotina. Você construiu um reflexo. Os reflexos não falham em dia de prova.",
    ],
    "fase2": [
        "Base concluída. Os alicerces da cidade dourada estão prontos — agora ergueremos os andares.",
        "Você acabou de dominar a língua que a FUVEST fala. A partir de agora, só conversas difíceis.",
    ],
    "fase3": [
        "Aprofundamento concluído. O nível da prova já não te assusta — você treinou acima dele.",
        "Você mergulhou fundo onde a maioria boia. Por isso o topo é seu próximo endereço.",
    ],
    "fase4": [
        "Nível FUVEST alcançado. Agora cada simulado é um ensaio geral, e você é a protagonista.",
        "Você está a um passo do palco. Os 3 anos de treino viram 3 horas de espetáculo.",
    ],
    "fase5": [
        "Fase final. O cronograma está no fim, mas a missão só está começando. Boa prova, Gabi.",
        "Tudo que era para ser estudado, foi. Tudo que era para ser revisado, está. Agora a cidade assiste.",
    ],
    "rank": {
        "cadete": "Patente promovida: Cadete. A cidade reconhece os primeiros passos.",
        "investigadora": "Patente promovida: Investigadora. Você já sabe onde procurar as respostas.",
        "analista": "Patente promovida: Analista. Nenhum assunto escapa da sua análise.",
        "especialista": "Patente promovida: Especialista. Você é referência no distrito.",
        "elite": "Patente promovida: Elite. Os holofotes da cidade encontram você.",
        "veterana": "Patente promovida: Veterana. Os veteranos não tremem em dia de prova.",
        "operadora": "Patente promovida: Operadora. A operação agora opera com você no comando.",
        "agente_fmusp": "Patente máxima: Agente FMUSP. A torre já reservou sua cadeira.",
    },
}

# ---------------------------------------------------------------------------
# Banco de missões
# ---------------------------------------------------------------------------
MISSIONS_DAILY = [
    ("q30", "Resolver 30 questões", 30, "questoes", 30),
    ("q15", "Resolver 15 questões", 15, "questoes", 20),
    ("pomodoro3", "Fazer 3 pomodoros", 3, "pomodoro", 25),
    ("pomodoro2", "Fazer 2 pomodoros", 2, "pomodoro", 15),
    ("flashcards10", "Revisar 10 flashcards", 10, "flashcards", 20),
    ("flashcards5", "Revisar 5 flashcards", 5, "flashcards", 10),
    ("leitura20", "Ler 20 páginas", 20, "leitura", 20),
    ("revisao1", "Fazer 1 revisão", 1, "revisao", 15),
    ("estudo90", "Estudar 90 minutos", 90, "minutos", 30),
    ("estudo60", "Estudar 60 minutos", 60, "minutos", 25),
    ("acertos80", "Acertar 80% das questões de hoje", 80, "precisao", 20),
    ("redacao1", "Escrever 1 redação", 1, "redacao", 40),
]

MISSIONS_WEEKLY = [
    ("w_questoes100", "Resolver 100 questões na semana", 100, "questoes", 80),
    ("w_pomodoro15", "15 pomodoros na semana", 15, "pomodoro", 60),
    ("w_flashcards50", "Revisar 50 flashcards", 50, "flashcards", 50),
    ("w_redacao2", "2 redações na semana", 2, "redacao", 80),
    ("w_leitura100", "Ler 100 páginas", 100, "leitura", 60),
    ("w_simulado1", "1 simulado na semana", 1, "simulado", 100),
]

MISSIONS_MONTHLY = [
    ("m_questoes400", "400 questões no mês", 400, "questoes", 300),
    ("m_horas30", "30 horas no mês", 30 * 60, "minutos", 300),
    ("m_redacao8", "8 redações no mês", 8, "redacao", 300),
    ("m_simulado4", "4 simulados no mês", 4, "simulado", 400),
    ("m_flashcards150", "150 flashcards no mês", 150, "flashcards", 200),
    ("m_dias25", "Estudar 25 dias no mês", 25, "dias", 350),
]
