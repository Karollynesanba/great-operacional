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

describe('Dashboard - Ações Rápidas e Check-in', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.session('admin-acoes', () => { cy.loginAdmin() }, { cacheAcrossSpecs: false })
    cy.visit('/operacional/dashboard')
    cy.window().then((win) => {
      win.localStorage.removeItem('great_last_checkin')
      win.localStorage.removeItem('great_checkin_time')
      win.localStorage.setItem('mock_db_work_items', JSON.stringify([]))
      Object.keys(win.localStorage)
        .filter((key) => key.startsWith('great-offline-v1:my-day-items:'))
        .forEach((key) => win.localStorage.removeItem(key))
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
    cy.contains('button', 'Selecionar responsáveis').click()
    cy.contains('button', 'Admin Teste').click()
    cy.get('[data-cy="btn-salvar-tarefa"]').click()

    cy.get('[data-cy="modal-nova-tarefa"]').should('not.exist')
  })

  it('cria uma nova tarefa pelo botão "Criar tarefa" do header', () => {
    cy.get('[data-cy="btn-criar-tarefa"]').click()

    cy.get('[data-cy="modal-nova-tarefa"]').should('be.visible')
    cy.get('[data-cy="input-tarefa-titulo"]').type('Tarefa header Cypress')
    cy.contains('button', 'Selecionar responsáveis').click()
    cy.contains('button', 'Admin Teste').click()
    cy.get('[data-cy="btn-salvar-tarefa"]').click()

    cy.get('[data-cy="modal-nova-tarefa"]').should('not.exist')
  })

  it('exibe a aba de próximas tarefas vazia quando não há itens', () => {
    cy.get('[data-cy="tab-proximas-tarefas"]').click()
    cy.get('[data-cy="card-proximas-tarefas"]').should('be.visible')
    cy.contains('Nenhuma tarefa pendente').should('be.visible')
  })

  it('admin consegue adicionar e remover uma próxima tarefa', () => {
    const title = `Tarefa removível ${Date.now()}`

    cy.get('[data-cy="btn-add-proxima-tarefa"]').click()
    cy.get('[data-cy="modal-nova-tarefa"]').should('be.visible')
    cy.get('[data-cy="input-tarefa-titulo"]').type(title)
    cy.contains('button', 'Selecionar responsáveis').click()
    cy.contains('button', 'Admin Teste').click()
    cy.get('[data-cy="btn-salvar-tarefa"]').click()

    cy.get('[data-cy="card-proximas-tarefas"]').should('contain', title)
    cy.contains('[data-cy="proxima-tarefa-item"]', title)
      .within(() => {
        cy.get('[data-cy="btn-remover-proxima-tarefa"]').click()
      })
    cy.contains(title).should('not.exist')
  })

  it('tarefa com data aparece no Meu Dia do responsável', () => {
    const title = `Prazo MyDia ${Date.now()}`
    const now = new Date()
    const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    cy.get('[data-cy="btn-add-proxima-tarefa"]').click()
    cy.get('[data-cy="modal-nova-tarefa"]').should('be.visible')
    cy.get('[data-cy="input-tarefa-titulo"]').type(title)

    cy.contains('button', 'Sem prazo').click()
    cy.contains('[role="option"]', 'Prazo específico').click()
    cy.get('[data-cy="input-tarefa-data"]').type(dueDate)
    cy.contains('button', 'Selecionar responsáveis').click()
    cy.contains('button', 'Admin Teste').click()
    cy.get('[data-cy="btn-salvar-tarefa"]').click()

    cy.window().then((win) => {
      const stored = win.localStorage.getItem('mock_db_my_day_items')
      expect(stored, 'mock_db_my_day_items').to.be.a('string')

      const items = JSON.parse(stored || '[]') as Array<{ title: string; date?: string }>
      expect(
        items.some((item) => item.title === title && item.date === dueDate),
        'task mirrored into my_day_items',
      ).to.eq(true)
    })
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
