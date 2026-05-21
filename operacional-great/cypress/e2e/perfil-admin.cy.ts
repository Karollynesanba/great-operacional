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

  it('deve abrir o diálogo para adicionar uma pessoa', () => {
    cy.get('[data-cy="btn-adicionar-pessoa"]').click()
    cy.contains('Adicionar pessoa').should('be.visible')

    cy.get('#new-user-name').type(`Pessoa Teste ${Date.now()}`)
    cy.get('#new-user-email').type(`pessoa-teste-${Date.now()}@teste.com`)
    cy.get('#new-user-password').type('123456')
    cy.get('[role="dialog"]').contains('button', 'Adicionar').click()

    cy.get('[role="dialog"]').should('not.exist')
  })

  it('deve abrir a confirmação de exclusão de uma pessoa', () => {
    cy.get('[data-cy="btn-usuarios-cadastrados"]').click()
    cy.get('[data-cy="btn-excluir-usuario"]').first().click()

    cy.contains('Excluir pessoa?').should('be.visible')
    cy.get('[data-cy="btn-confirmar-exclusao"]').should('be.visible')
  })

  it('deve excluir uma pessoa como admin', () => {
    cy.get('[data-cy="btn-usuarios-cadastrados"]').click()
    cy.get('[data-cy="btn-excluir-usuario"]').its('length').then((initialLength) => {
      cy.get('[data-cy="btn-excluir-usuario"]').first().click()
      cy.get('[data-cy="btn-confirmar-exclusao"]').click()

      cy.contains('Excluir pessoa?').should('not.exist')
      cy.get('[data-cy="btn-excluir-usuario"]').its('length').should('eq', initialLength - 1)
    })
  })
})
