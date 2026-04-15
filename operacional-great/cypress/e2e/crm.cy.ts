/// <reference types="cypress" />

// ── Chave do mock localStorage ───────────────────────────────────────────────
const CLIENTS_KEY = 'mock_db_operational_clients'

// ── Clientes de seed que cobrem todos os status, equipes e pacotes ───────────
const SEED_CLIENTS = [
  {
    id: 'crm-ativo-1',
    client_name: 'Clínica Bella Vita',
    clinic_name: 'Bella Vita Estética',
    status_operacional: 'ATIVO',
    onboarding_stage: 'ATIVO',
    team_id: 'equipe-7',
    pacote: 'COMPLETO',
    client_tier: 'PREMIUM',
    deal_value: 2000,
    created_at: '2024-01-15T10:00:00.000Z',
    activated_at: '2024-01-20T10:00:00.000Z',
  },
  {
    id: 'crm-ativacao-1',
    client_name: 'Odontoclínica Sorriso',
    clinic_name: 'Sorriso Pleno',
    status_operacional: 'ONBOARDING',
    onboarding_stage: 'ONBOARDING',
    team_id: 'equipe-7',
    pacote: 'COMPLETO_NOVA_ERA',
    client_tier: 'POPULAR',
    deal_value: 1500,
    created_at: '2024-02-10T10:00:00.000Z',
    activated_at: null,
  },
  {
    id: 'crm-encerrado-1',
    client_name: 'Clínica Saúde Total',
    clinic_name: null,
    status_operacional: 'ENCERRADO',
    onboarding_stage: 'ATIVO',
    churn_status: 'CONFIRMED',
    churn_reason: 'Preço alto',
    team_id: 'tropa-de-elite',
    pacote: 'ATENDIMENTO',
    client_tier: null,
    deal_value: 3000,
    created_at: '2024-03-05T10:00:00.000Z',
    activated_at: null,
  },
  {
    id: 'crm-pausado-1',
    client_name: 'Dr. Paulo Medicina',
    clinic_name: 'Clínica São Paulo',
    status_operacional: 'PAUSADO',
    onboarding_stage: 'ATIVO',
    team_id: 'tropa-de-elite',
    pacote: 'TRAFEGO',
    client_tier: 'PREMIUM',
    deal_value: 2500,
    created_at: '2024-04-01T10:00:00.000Z',
    activated_at: null,
  },
]

function seedCRM(win: Window) {
  win.localStorage.setItem(CLIENTS_KEY, JSON.stringify(SEED_CLIENTS))
  // garante que o filtro de equipe começa em "todos"
  win.sessionStorage.setItem('crm-team-filter', 'all')
}

// ── Helpers de seleção de dropdown (Select shadcn) ───────────────────────────
function abrirSelectPor(texto: string) {
  cy.contains('button[role="combobox"]', texto, { timeout: 8000 }).click()
}

function escolherOpcao(label: string) {
  cy.contains('[role="option"]', label, { timeout: 8000 }).click()
}

// ─────────────────────────────────────────────────────────────────────────────
describe('CRM Operacional', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.session('admin-crm', () => { cy.loginAdmin() }, { cacheAcrossSpecs: false })
    cy.visit('/operacional/crm')
    cy.window().then((win) => { seedCRM(win) })
    cy.reload()
    cy.contains('CRM Operacional', { timeout: 15000 }).should('be.visible')
  })

  // ── 1. Título e estrutura da página ────────────────────────────────────────

  it('exibe o título "CRM Operacional" e subtítulo correto', () => {
    cy.contains('h1', 'CRM Operacional').should('be.visible')
    cy.contains('Gestão de clientes e eventos').should('be.visible')
  })

  it('exibe o botão "Novo Cliente"', () => {
    cy.contains('button', 'Novo Cliente').should('be.visible')
  })

  // ── 2. Cards de estatísticas (Total / Em Ativação / Ativos / Encerrados) ───

  it('exibe os quatro cards de estatísticas com rótulos corretos', () => {
    cy.contains('Total').should('be.visible')
    cy.contains('Em Ativação').should('be.visible')
    cy.contains('Ativos').should('be.visible')
    cy.contains('Encerrados').should('be.visible')
  })

  it('os cards exibem números válidos (≥ 0)', () => {
    cy.get('.text-2xl.font-bold').each(($el) => {
      const num = parseInt($el.text().trim(), 10)
      expect(isNaN(num)).to.equal(false)
      expect(num).to.be.gte(0)
    })
  })

  it('o Total sobe após adicionar um novo cliente', () => {
    // Captura total inicial
    cy.get('.text-2xl.font-bold')
      .first()
      .invoke('text')
      .then((antes) => {
        const totalAntes = parseInt(antes.trim(), 10)

        // Adiciona novo cliente
        cy.contains('button', 'Novo Cliente').click()
        cy.get('[role="dialog"]').should('be.visible')
        cy.get('[role="dialog"]').find('input').first().type('Cypress Nova Clínica')
        cy.get('[role="dialog"]').find('button[role="combobox"]').eq(0).click()
        cy.contains('[role="option"]', 'Completo').click()
        cy.get('[role="dialog"]').find('button[role="combobox"]').eq(1).click()
        cy.contains('[role="option"]', 'Equipe 7').click()
        cy.get('[role="dialog"]').find('button[role="combobox"]').eq(2).click()
        cy.contains('[role="option"]', 'Cliente').click()
        cy.get('[role="dialog"]').find('button[role="combobox"]').eq(3).click()
        cy.contains('[role="option"]', '30 Dias').click()
        cy.get('[role="dialog"]').find('input[type="date"]').type('2024-06-01')
        cy.contains('button', 'Cadastrar Cliente').click()
        cy.get('[role="dialog"]').should('not.exist')

        // Verifica que o Total aumentou
        cy.get('.text-2xl.font-bold')
          .first()
          .invoke('text')
          .then((depois) => {
            const totalDepois = parseInt(depois.trim(), 10)
            expect(totalDepois).to.equal(totalAntes + 1)
          })
      })
  })

  it('o Total desce ao filtrar apenas clientes Encerrados (excluídos da soma)', () => {
    // Com seed: total = ativos(1) + emAtivacao(1) = 2
    cy.get('.text-2xl.font-bold').first().invoke('text').then((t) => {
      expect(parseInt(t.trim(), 10)).to.equal(2)
    })
    // Encerrados: 1
    cy.get('.text-2xl.font-bold').eq(3).invoke('text').then((t) => {
      expect(parseInt(t.trim(), 10)).to.equal(1)
    })
  })

  // ── 3. Adicionar Novo Cliente + Confetes ───────────────────────────────────

  it('abre o dialog "Novo Cliente Operacional" ao clicar no botão', () => {
    cy.contains('button', 'Novo Cliente').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Novo Cliente Operacional').should('be.visible')
  })

  it('o dialog exibe todos os campos obrigatórios', () => {
    cy.contains('button', 'Novo Cliente').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('Nome do Cliente').should('be.visible')
      cy.contains('Pacote').should('be.visible')
      cy.contains('Equipe').should('be.visible')
      cy.contains('Pagador de Anúncio').should('be.visible')
      cy.contains('Período').should('be.visible')
      cy.contains('Data de Entrada').should('be.visible')
    })
  })

  it('cadastra novo cliente com sucesso, fecha o dialog e dispara confetes', () => {
    cy.contains('button', 'Novo Cliente').click()
    cy.get('[role="dialog"]').should('be.visible')

    // Nome
    cy.get('[role="dialog"]').find('input').first().type('Clínica Cypress Confete')

    // Pacote
    cy.get('[role="dialog"]').find('button[role="combobox"]').eq(0).click()
    cy.contains('[role="option"]', 'Completo').click()

    // Equipe
    cy.get('[role="dialog"]').find('button[role="combobox"]').eq(1).click()
    cy.contains('[role="option"]', 'Equipe 7').click()

    // Pagador de anúncio
    cy.get('[role="dialog"]').find('button[role="combobox"]').eq(2).click()
    cy.contains('[role="option"]', 'Cliente').click()

    // Período
    cy.get('[role="dialog"]').find('button[role="combobox"]').eq(3).click()
    cy.contains('[role="option"]', '30 Dias').click()

    // Data de entrada
    cy.get('[role="dialog"]').find('input[type="date"]').type('2024-06-15')

    cy.contains('button', 'Cadastrar Cliente').click()

    // Dialog fecha = sucesso
    cy.get('[role="dialog"]').should('not.exist')

    // Confetes: canvas-confetti injeta um <canvas> no body
    cy.get('canvas', { timeout: 5000 }).should('exist')
  })

  // ── 4. Busca por nome / clínica ────────────────────────────────────────────

  it('busca por nome do cliente filtra corretamente', () => {
    cy.get('input[placeholder*="Buscar"]').type('Bella Vita')
    cy.contains('Clínica Bella Vita').should('be.visible')
    cy.contains('Odontoclínica Sorriso').should('not.exist')
  })

  it('busca por nome da clínica filtra corretamente', () => {
    cy.get('input[placeholder*="Buscar"]').type('Sorriso Pleno')
    cy.contains('Odontoclínica Sorriso').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
  })

  it('busca por texto inexistente exibe mensagem de nenhum resultado', () => {
    cy.get('input[placeholder*="Buscar"]').type('xyzABC_inexistente')
    cy.contains('Nenhum cliente encontrado').should('be.visible')
  })

  it('limpar a busca restaura os clientes visíveis', () => {
    cy.get('input[placeholder*="Buscar"]').type('xyzABC_inexistente')
    cy.contains('Nenhum cliente encontrado').should('be.visible')
    cy.get('input[placeholder*="Buscar"]').clear()
    cy.contains('Clínica Bella Vita').should('be.visible')
  })

  // ── 5. Filtros de Status ───────────────────────────────────────────────────

  it('"Ativos + Em Ativação" (padrão) oculta Encerrados e Pausados', () => {
    cy.contains('Clínica Bella Vita').should('be.visible')       // ATIVO
    cy.contains('Odontoclínica Sorriso').should('be.visible')    // EM_ATIVACAO
    cy.contains('Clínica Saúde Total').should('not.exist')       // ENCERRADO → oculto
    cy.contains('Dr. Paulo Medicina').should('not.exist')        // PAUSADO   → oculto
  })

  it('"Todos" exibe todos os clientes, inclusive Encerrados e Pausados', () => {
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Todos')
    cy.contains('Clínica Bella Vita').should('be.visible')
    cy.contains('Odontoclínica Sorriso').should('be.visible')
    cy.contains('Clínica Saúde Total').should('be.visible')
    cy.contains('Dr. Paulo Medicina').should('be.visible')
  })

  it('"Em Ativação" exibe apenas clientes em ativação', () => {
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Em Ativação')
    cy.contains('Odontoclínica Sorriso').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
    cy.contains('Clínica Saúde Total').should('not.exist')
  })

  it('"Ativo" exibe apenas clientes ativos', () => {
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Ativo')
    cy.contains('Clínica Bella Vita').should('be.visible')
    cy.contains('Odontoclínica Sorriso').should('not.exist')
  })

  it('"Pausado" exibe apenas clientes pausados', () => {
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Pausado')
    cy.contains('Dr. Paulo Medicina').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
    cy.contains('Odontoclínica Sorriso').should('not.exist')
  })

  it('"Encerrado" exibe apenas clientes encerrados', () => {
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Encerrado')
    cy.contains('Clínica Saúde Total').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
    cy.contains('Odontoclínica Sorriso').should('not.exist')
  })

  // ── 6. Filtro de equipe / clínica ──────────────────────────────────────────

  it('pode selecionar a equipe "Equipe 7" e ver apenas seus clientes', () => {
    // com status "Todos" para incluir encerrados
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Todos')

    // clica no select de equipe (placeholder "Equipe" quando valor='all')
    cy.get('button[role="combobox"]').contains(/Equipe|equipe-7|Equipe 7/).click()
    escolherOpcao('Equipe 7')

    cy.contains('Clínica Bella Vita').should('be.visible')
    cy.contains('Odontoclínica Sorriso').should('be.visible')
    cy.contains('Clínica Saúde Total').should('not.exist')   // tropa-de-elite
    cy.contains('Dr. Paulo Medicina').should('not.exist')    // tropa-de-elite
  })

  it('pode selecionar a equipe "Tropa de Elite" e ver apenas seus clientes', () => {
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Todos')

    cy.get('button[role="combobox"]').contains(/Equipe|Equipe 7|Tropa/).click()
    escolherOpcao('Tropa de Elite')

    cy.contains('Clínica Saúde Total').should('be.visible')
    cy.contains('Dr. Paulo Medicina').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
  })

  // ── 7. Filtro de pacote ────────────────────────────────────────────────────

  it('exibe a opção "Todos pacotes" por padrão', () => {
    cy.contains('button[role="combobox"]', 'Todos pacotes').should('be.visible')
  })

  it('filtro "Todos pacotes" não restringe a lista', () => {
    // já está em todos por padrão, verifica que os dois visíveis aparecem
    cy.contains('Clínica Bella Vita').should('be.visible')
    cy.contains('Odontoclínica Sorriso').should('be.visible')
  })

  it('filtro por pacote "Completo" exibe apenas clientes com pacote COMPLETO', () => {
    abrirSelectPor('Todos pacotes')
    escolherOpcao('Completo')
    cy.contains('Clínica Bella Vita').should('be.visible')
    cy.contains('Odontoclínica Sorriso').should('not.exist')
  })

  it('filtro por pacote "COMPLETO_NOVA_ERA" exibe apenas clientes desse pacote', () => {
    // COMPLETO_NOVA_ERA não tem label no mapa → aparece como texto bruto
    abrirSelectPor('Todos pacotes')
    escolherOpcao('COMPLETO_NOVA_ERA')
    cy.contains('Odontoclínica Sorriso').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
  })

  it('filtro por pacote "Atendimento" exibe apenas clientes com ATENDIMENTO', () => {
    // precisa mostrar encerrados para ver Saúde Total
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Todos')
    abrirSelectPor('Todos pacotes')
    escolherOpcao('Atendimento')
    cy.contains('Clínica Saúde Total').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
  })

  // ── 8. Planilha — colunas ─────────────────────────────────────────────────

  it('exibe todas as colunas da planilha (CLIENTE, STATUS, PACOTE, TIER, EQUIPE, ENTRADA, AÇÕES)', () => {
    cy.get('th').contains('CLIENTE').should('be.visible')
    cy.get('th').contains('STATUS').should('be.visible')
    cy.get('th').contains('PACOTE').should('be.visible')
    cy.get('th').contains('TIER').should('be.visible')
    cy.get('th').contains('EQUIPE').should('be.visible')
    cy.get('th').contains('ENTRADA').should('be.visible')
    cy.get('th').contains('AÇÕES').should('be.visible')
  })

  it('a coluna CLIENTE exibe os nomes dos clientes ativos e em ativação', () => {
    cy.contains('td', 'Clínica Bella Vita').should('be.visible')
    cy.contains('td', 'Odontoclínica Sorriso').should('be.visible')
  })

  it('a coluna STATUS exibe selects de status para cada linha', () => {
    // Cada linha da tabela tem um select de status
    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).find('button[role="combobox"]').should('exist')
    })
  })

  it('a coluna PACOTE exibe o badge do pacote', () => {
    cy.contains('Completo').should('be.visible')
  })

  it('a coluna TIER exibe o tier de clientes que possuem (Premium / Popular)', () => {
    cy.contains('Premium').should('be.visible')
  })

  it('a coluna EQUIPE exibe o nome da equipe', () => {
    cy.contains('td', 'Equipe 7').should('be.visible')
  })

  it('a coluna ENTRADA exibe a data formatada', () => {
    // data formatada como dd/MM/yy
    cy.get('table tbody tr').first().find('td').then(($tds) => {
      const textos = Array.from($tds).map((el) => el.textContent || '')
      const temData = textos.some((t) => /\d{2}\/\d{2}\/\d{2}/.test(t))
      expect(temData).to.equal(true)
    })
  })

  it('a coluna AÇÕES exibe botões de ação para cada linha', () => {
    cy.get('button[title="Ver detalhes"]').should('have.length.gte', 1)
    cy.get('button[title="Adicionar criativo"]').should('have.length.gte', 1)
    cy.get('button[title="Adicionar evento"]').should('have.length.gte', 1)
  })

  // ── 9. Olhar dados do cliente ──────────────────────────────────────────────

  it('botão "Ver detalhes" navega para a página de detalhe do cliente', () => {
    cy.get('button[title="Ver detalhes"]').first().click()
    cy.url({ timeout: 10000 }).should('include', '/operacional/crm/cliente/')
  })

  it('clicar no nome do cliente na tabela também navega para seus detalhes', () => {
    cy.contains('td', 'Clínica Bella Vita').find('button').click()
    cy.url({ timeout: 10000 }).should('include', '/operacional/crm/cliente/')
  })

  // ── 10. Adicionar Criativo ─────────────────────────────────────────────────

  it('botão "Adicionar criativo" abre o dialog de criativo com nome do cliente', () => {
    cy.get('button[title="Adicionar criativo"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Adicionar Criativo').should('be.visible')
    // o dialog inclui o nome do cliente no título
    cy.get('[role="dialog"]')
      .invoke('text')
      .then((texto) => {
        expect(texto).to.match(/Clínica Bella Vita|Odontoclínica Sorriso/)
      })
  })

  it('o dialog de criativo exibe o select de responsável e a área de upload', () => {
    cy.get('button[title="Adicionar criativo"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Responsável pela Arte').should('be.visible')
    cy.contains('Clique para selecionar arquivos').should('be.visible')
  })

  it('fechar o dialog de criativo funciona corretamente', () => {
    cy.get('button[title="Adicionar criativo"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="dialog"]').contains('button', 'Cancelar').click()
    cy.get('[role="dialog"]').should('not.exist')
  })

  // ── 11. Adicionar Evento ───────────────────────────────────────────────────

  it('botão "Adicionar evento" abre o dialog com nome do cliente', () => {
    cy.get('button[title="Adicionar evento"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Adicionar Evento').should('be.visible')
    cy.contains('Cliente:').should('be.visible')
  })

  it('o dialog de evento exibe o select de tipo de evento e os campos de título e descrição', () => {
    cy.get('button[title="Adicionar evento"]').first().click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('Tipo de Evento').should('be.visible')
      cy.contains('Título').should('be.visible')
      cy.contains('Descrição').should('be.visible')
    })
  })

  it('pode adicionar um evento de Renovação com sucesso', () => {
    cy.get('button[title="Adicionar evento"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')

    cy.get('[role="dialog"]').within(() => {
      // Tipo padrão já é Renovação — só preenche o título
      cy.get('input[placeholder*="Descreva o evento"]').type('Reunião de alinhamento mensal')
      cy.contains('button', 'Adicionar').click()
    })

    cy.get('[role="dialog"]').should('not.exist')
  })

  it('fechar o dialog de evento funciona corretamente', () => {
    cy.get('button[title="Adicionar evento"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="dialog"]').contains('button', 'Cancelar').click()
    cy.get('[role="dialog"]').should('not.exist')
  })
})
