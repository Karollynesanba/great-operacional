/// <reference types="cypress" />
export {}

const SEED_TEAMS = [
  {
    id: 'champ-1',
    team_id: 'equipe-7',
    label: 'Equipe 7',
    badge_color: '#2563EB',
    total_points: 150,
    renewals: 5,
    losses: 2,
    items_sold: 10,
    previous_rank: 2,
    current_rank: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'champ-2',
    team_id: 'tropa-de-elite',
    label: 'Tropa de Elite',
    badge_color: '#DC2626',
    total_points: 120,
    renewals: 3,
    losses: 4,
    items_sold: 8,
    previous_rank: 1,
    current_rank: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const SEED_EVENTS = [
  {
    id: 'rank-event-1',
    team_id: 'equipe-7',
    event_type: 'RENEWAL',
    points: 3,
    description: 'Evento de demonstração',
    item_label: 'CRM',
    client_name: 'Cliente Inicial',
    created_by: 'test-admin-1',
    created_at: new Date().toISOString(),
    creator_name: 'Admin Teste',
  },
]

const TEST_ADMIN = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

describe('Ranking - Area Comercial', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)

    cy.visit('/operacional/ranking', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
        win.localStorage.setItem('great_users', JSON.stringify([TEST_ADMIN]))
        win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
        win.localStorage.setItem('mock_db_championship_teams', JSON.stringify(SEED_TEAMS))
        win.localStorage.setItem('mock_db_championship_events', JSON.stringify(SEED_EVENTS))
      },
    })

    cy.contains('Champions Great League', { timeout: 15000 }).should('be.visible')
  })

  it('exibe a equipe ganhadora no card correto', () => {
    cy.contains(/equipe ganhadora/i).should('be.visible')

    cy.get('[data-testid="winner-team-card"]').within(() => {
      cy.contains(/equipe/i).should('be.visible')
      cy.contains(/\d+/).should('be.visible')
    })
  })

  it('exibe valor de vendas dos ultimos dias', () => {
    cy.get('[data-testid="sales-last-days"]').should('be.visible')
    cy.get('[data-testid="sales-last-days"]').contains('Vendas últimos dias').should('be.visible')
    cy.get('[data-testid="sales-last-days"]').should(($el) => {
      const text = $el.text()
      expect(text).to.match(/\d/)
    })
  })

  it('exibe valores de renovacao e perdas', () => {
    cy.contains(/renova/i).should('be.visible')
    cy.contains(/perda/i).should('be.visible')

    cy.get('[data-testid="renewals-value"]').should('contain.text', 'R$')
    cy.get('[data-testid="losses-value"]').should('contain.text', 'R$')
  })

  it('mostra Equipe 7 e Tropa de Elite ao registrar evento', () => {
    cy.contains('button', /Registrar Evento/i).click()
    cy.get('[role="dialog"]').should('be.visible')

    cy.get('[data-cy="championship-team-select"]').click()
    cy.contains('[role="option"]', 'Equipe 7').should('be.visible')
    cy.contains('[role="option"]', 'Tropa de Elite').should('be.visible')
  })

  it('permite filtrar por equipe', () => {
    cy.contains('Classificação').click()

    cy.get('[data-testid="filter-team"]').contains(/equipe 7/i).click()
    cy.get('[data-testid="ranking-list"]').should('exist')
  })

  it('permite alternar ranking entre semanal, mensal e anual', () => {
    cy.get('[data-testid="filter-period"]').within(() => {
      cy.contains(/semanal/i).click()
    })
    cy.get('[data-testid="ranking-period"]').should('contain', 'semanal')

    cy.get('[data-testid="filter-period"]').within(() => {
      cy.contains(/mensal/i).click()
    })
    cy.get('[data-testid="ranking-period"]').should('contain', 'mensal')

    cy.get('[data-testid="filter-period"]').within(() => {
      cy.contains(/anual/i).click()
    })
    cy.get('[data-testid="ranking-period"]').should('contain', 'anual')
  })

  it('ranking muda ao alterar periodo', () => {
    cy.get('[data-testid="ranking-period"]').should('contain', 'mensal')

    cy.get('[data-testid="filter-period"]').within(() => {
      cy.contains(/semanal/i).click()
    })

    cy.get('[data-testid="ranking-period"]').should('contain', 'semanal')
  })

  it('exibe e atualiza os valores do resumo do ano', () => {
    cy.get('[data-testid="year-summary"]').should('be.visible')

    cy.get('[data-testid="year-summary"]').should(($el) => {
      expect($el.text()).to.match(/\d/)
    })
  })

  it('retrospectiva do ano esta funcionando', () => {
    cy.contains(/retrospectiva/i).click()

    cy.get('[data-testid="retrospective-modal"]').should('be.visible')
    cy.get('[data-testid="retrospective-content"]').should('not.be.empty')
  })

  it('admin consegue limpar o histórico de eventos', () => {
    cy.contains('Eventos').click()
    cy.contains('Histórico de Eventos').should('be.visible')

    cy.window().then((win) => {
      const stored = win.localStorage.getItem('mock_db_championship_events')
      expect(stored, 'mock_db_championship_events').to.be.a('string')
      expect(JSON.parse(stored || '[]')).to.have.length.at.least(1)
    })

    cy.get('[data-cy="btn-limpar-historico-eventos"]').click()
    cy.contains('Histórico de Eventos').should('be.visible')

    cy.window().then((win) => {
      const stored = win.localStorage.getItem('mock_db_championship_events')
      expect(JSON.parse(stored || '[]')).to.have.length(0)
    })

    cy.contains('Nenhum evento registrado ainda', { timeout: 10000 }).should('be.visible')
  })

  it('leitura rapida muda de acordo com o resultado', () => {
    cy.get('[data-testid="quick-insight"]').invoke('text').then((textoInicial) => {
      cy.get('[data-testid="filter-period"]').within(() => {
        cy.contains(/semanal/i).click()
      })

      cy.get('[data-testid="quick-insight"]').invoke('text').should((novoTexto) => {
        expect(novoTexto).not.to.eq(textoInicial)
      })
    })
  })
})
