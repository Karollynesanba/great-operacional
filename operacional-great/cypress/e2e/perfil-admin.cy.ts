/// <reference types="cypress" />

describe('Perfil - Admin gerencia usuários', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)

    cy.session('admin-perfil', () => {
      cy.loginAdmin()
    }, { cacheAcrossSpecs: false })

    cy.visit('/operacional/perfil')
    cy.contains('Perfil de administrador', { timeout: 15000 }).should('be.visible')
  })

  it('deve adicionar uma pessoa pelo perfil do admin', () => {
    const stamp = Date.now()
    const name = `Pessoa Teste ${stamp}`
    const email = `pessoa-teste-${stamp}@teste.com`

    cy.get('[data-cy="btn-adicionar-pessoa"]').click()
    cy.contains('Adicionar pessoa').should('be.visible')

    cy.get('#new-user-name').type(name)
    cy.get('#new-user-email').type(email)
    cy.get('#new-user-password').type('123456')
    cy.contains('É administrador?').find('button, [role="checkbox"]').should('exist')

    cy.get('[role="dialog"]').contains('button', 'Adicionar').click()

    cy.get('[data-cy="btn-usuarios-cadastrados"]').click()
    cy.contains(name, { timeout: 10000 }).scrollIntoView().should('be.visible')
    cy.contains(email).scrollIntoView().should('be.visible')

    cy.visit('/operacional/meu-dia')
    cy.contains('Meu Dia', { timeout: 15000 }).should('be.visible')
    cy.get('[role="combobox"]').click()
    cy.contains(name, { timeout: 10000 }).should('be.visible')
  })

  it('deve excluir uma pessoa criada pelo admin', () => {
    const stamp = Date.now()
    const name = `Pessoa Removida ${stamp}`
    const email = `removida-${stamp}@teste.com`

    cy.get('[data-cy="btn-adicionar-pessoa"]').click()
    cy.get('#new-user-name').type(name)
    cy.get('#new-user-email').type(email)
    cy.get('#new-user-password').type('123456')
    cy.get('[role="dialog"]').contains('button', 'Adicionar').click()

    cy.get('[data-cy="btn-usuarios-cadastrados"]').click()
    cy.contains(name)
      .closest('[class*="rounded-2xl"]')
      .within(() => {
        cy.get('[data-cy="btn-excluir-usuario"]').click()
      })

    cy.contains('Excluir pessoa?').should('be.visible')
    cy.get('[data-cy="btn-confirmar-exclusao"]').click()

    cy.contains(name, { timeout: 10000 }).should('not.exist')

    cy.visit('/operacional/meu-dia')
    cy.contains('Meu Dia', { timeout: 15000 }).should('be.visible')
    cy.get('[role="combobox"]').click()
    cy.contains(name, { timeout: 10000 }).should('not.exist')
  })
})
