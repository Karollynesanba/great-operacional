/// <reference types="cypress" />
/**
 * Dashboard - Ações Rápidas, Criar Tarefa e Check-in
 *
 * Cobre:
 *  - Criar tarefa (ação rápida e botão do header)
 *  - Ver a aba de próximas tarefas
 *  - Fazer check-in
 *  - Criar reunião (ação rápida)
 */

const UPCOMING_TASK_SEED = {
  id: 'seed-upcoming-task-1',
  title: 'Tarefa de demonstração Cypress',
  description: 'Item semeado para o teste de próximas tarefas',
  type: 'TASK',
  status: 'TODO',
  priority: 'ALTA',
  due_date: new Date(Date.now() + 86_400_000).toISOString(),
  created_at: new Date().toISOString(),
}

describe('Dashboard - Ações Rápidas e Check-in', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.session('admin-acoes', () => { cy.loginAdmin() }, { cacheAcrossSpecs: false })
    cy.visit('/operacional/dashboard')
    cy.window().then((win) => {
      win.localStorage.removeItem('great_last_checkin')
      win.localStorage.removeItem('great_checkin_time')
      const workItems = JSON.parse(win.localStorage.getItem('mock_db_work_items') || '[]')
      if (workItems.length === 0) {
        win.localStorage.setItem('mock_db_work_items', JSON.stringify([UPCOMING_TASK_SEED]))
      }
    })
    cy.reload()
    cy.get('[data-cy="btn-criar-tarefa"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-cy="card-clientes-ativos"]').should('be.visible')
    cy.get('[data-cy="tab-proximas-tarefas"]').should('be.visible')
  })

  it('cria uma nova tarefa pelas Ações Rápidas', () => {
    cy.get('[data-cy="acao-rapida-nova-tarefa"]').click()

    cy.get('[data-cy="modal-nova-tarefa"]').should('be.visible')
    cy.get('[data-cy="input-tarefa-titulo"]').type('Tarefa via ação rápida')
    cy.get('[data-cy="input-tarefa-descricao"]').type('Descrição automática do Cypress')
    cy.get('[data-cy="btn-salvar-tarefa"]').click()

    cy.get('[data-cy="modal-nova-tarefa"]').should('not.exist')
  })

  it('cria uma nova tarefa pelo botão "Criar tarefa" do header', () => {
    cy.get('[data-cy="btn-criar-tarefa"]').click()

    cy.get('[data-cy="modal-nova-tarefa"]').should('be.visible')
    cy.get('[data-cy="input-tarefa-titulo"]').type('Tarefa header Cypress')
    cy.get('[data-cy="btn-salvar-tarefa"]').click()

    cy.get('[data-cy="modal-nova-tarefa"]').should('not.exist')
  })

  it('exibe a aba de próximas tarefas com pelo menos um item', () => {
    cy.get('[data-cy="tab-proximas-tarefas"]').click()
    cy.get('[data-cy="card-proximas-tarefas"]').should('be.visible')
    cy.get('[data-cy="proxima-tarefa-item"]').should('have.length.at.least', 1)
  })

  it('cria uma nova reunião pelas Ações Rápidas', () => {
    cy.get('[data-cy="acao-rapida-nova-reuniao"]').click()

    cy.get('[data-cy="modal-nova-reuniao"]').should('be.visible')
    cy.get('[data-cy="input-reuniao-titulo"]').type('Reunião via ação rápida')

    cy.get('[data-cy="modal-nova-reuniao"]')
      .find('input[type="datetime-local"]')
      .first()
      .type('2099-12-31T10:00')

    cy.get('[data-cy="btn-salvar-reuniao"]').click()
    cy.get('[data-cy="modal-nova-reuniao"]').should('not.exist')
  })

  it('faz check-in e o botão "Fazer check-out" aparece', () => {
    cy.get('body').then(($body) => {
      const jaFezCheckIn = $body.text().includes('Fazer check-out')

      if (jaFezCheckIn) {
        cy.contains('Fazer check-out').should('be.visible')
      } else {
        cy.get('[data-cy="btn-checkin"]').click()

        cy.get('[role="dialog"]').should('be.visible')
        cy.get('[role="dialog"]').contains('Confirmar Check-in').should('be.visible')

        cy.get('[data-cy="btn-confirmar-checkin"]').click()

        cy.get('[role="dialog"]').should('not.exist')
        cy.contains('Fazer check-out', { timeout: 8000 }).should('be.visible')
      }
    })
  })
})
