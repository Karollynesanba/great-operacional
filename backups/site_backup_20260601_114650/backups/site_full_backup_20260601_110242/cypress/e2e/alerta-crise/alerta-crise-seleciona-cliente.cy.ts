/// <reference types="cypress" />
export {}

function visitAlertaCrise() {
  cy.loginUser()
  cy.visit('/operacional/dashboard')
  cy.contains('Operação Great', { timeout: 15000 }).should('be.visible')
  cy.visit('/operacional/alerta-crise')
  cy.contains('Sistema de Alerta de Crise', { timeout: 15000 }).should('be.visible')
}

describe('Alerta de Crise - Seleção de cliente do CRM', () => {
  beforeEach(() => {
    cy.viewport(1440, 900)
    visitAlertaCrise()
  })

  it('abre o seletor de CRM, seleciona um cliente e adiciona ao painel', () => {
    cy.contains('button', 'Selecionar cliente do CRM').click()
    cy.get('[role="dialog"]').should('be.visible')

    cy.get('[role="dialog"]').within(() => {
      cy.get('input[placeholder*="Nome, clínica ou plano"]').type('Cleoderm')
    })

    cy.contains('[role="dialog"] button', 'Cleoderm', { timeout: 10000 }).click()

    cy.get('[role="dialog"]').within(() => {
      cy.contains('Cleoderm').should('be.visible')
      cy.contains(/Score derivado:/i).should('be.visible')
      cy.contains('button', 'Adicionar ao painel').should('not.be.disabled').click()
    })

    cy.get('[role="dialog"]').should('not.exist')
    cy.contains('Cliente do CRM adicionado ao alerta de crise.', { timeout: 10000 }).should('be.visible')
    cy.contains('Cleoderm', { timeout: 10000 }).should('be.visible')
  })
})
