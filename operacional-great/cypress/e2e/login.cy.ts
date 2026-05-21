/// <reference types="cypress" />

describe('GreatGo - Login', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.on('uncaught:exception', () => false)
    cy.visit('/login')
  })

  it('redireciona para o login ao abrir a raiz', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear()
      },
    })

    cy.url({ timeout: 10000 }).should('include', '/login')
  })

  it('exibe o formulario de acesso', () => {
    cy.get('form').should('be.visible')
    cy.get('input[type="email"]').should('be.visible')
    cy.get('input[type="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('mantem a validacao nativa com campos vazios', () => {
    cy.get('button[type="submit"]').click()

    cy.url().should('include', '/login')
    cy.get('input[type="email"]')
      .invoke('prop', 'validity')
      .its('valid')
      .should('eq', false)
  })

  it('alternar visibilidade da senha funciona', () => {
    cy.get('input[type="password"]').should('exist')
    cy.get('input[type="password"]').closest('div').find('button').click()
    cy.get('input[type="text"]').should('exist')
  })

  it.skip('autenticacao com credenciais validas', () => {})
  it.skip('mensagem de erro com credenciais invalidas', () => {})
  it.skip('login como usuario comum', () => {})
  it.skip('login como admin no modo admin', () => {})
  it.skip('bloqueio de admin no modo usuario', () => {})
})
