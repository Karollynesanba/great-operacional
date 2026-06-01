/// <reference types="cypress" />
export {}

const TEST_ADMIN = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

const SEED_CLIENTS = [
  {
    id: 'crm-ativo-1',
    client_name: 'Clinica Bella Vita',
    clinic_name: 'Bella Vita Estetica',
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
    client_name: 'Odontoclinica Sorriso',
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
]

describe('CRM - Planilha e Acoes', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.visit('/operacional/crm', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
        win.localStorage.setItem('great_users', JSON.stringify([TEST_ADMIN]))
        win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
        win.localStorage.setItem('mock_db_operational_clients', JSON.stringify(SEED_CLIENTS))
        win.sessionStorage.setItem('crm-team-filter', 'all')
      },
    })

    cy.get('table', { timeout: 15000 }).should('be.visible')
  })

  it('carrega a planilha com colunas e linhas principais', () => {
    cy.get('th').contains('CLIENTE').should('be.visible')
    cy.get('th').contains('STATUS').should('be.visible')
    cy.get('th').contains('PACOTE').should('be.visible')
    cy.get('th').contains('TIER').should('be.visible')
    cy.get('th').contains('EQUIPE').should('be.visible')
    cy.get('th').contains('ENTRADA').should('be.visible')
    cy.get('th').contains('AÇÕES').should('be.visible')
    cy.get('table tbody tr').should('have.length.at.least', 1)
  })

  it.skip('abre o detalhe do cliente a partir da tabela', () => {})

  it.skip('abre e fecha o dialog de criativo', () => {})

  it.skip('abre e fecha o dialog de evento', () => {})
})
