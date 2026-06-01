/// <reference types="cypress" />
export {}

describe('Inteligência – Ranking entre equipes', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)

    cy.session('admin-inteligencia', () => {
      cy.loginAdmin()
    }, { cacheAcrossSpecs: false })

    cy.visit('/operacional/inteligencia')
    cy.contains('Ranking entre equipes', { timeout: 15000 }).should('be.visible')
  })

  // ── Estrutura da página ──────────────────────────────────────

  it('exibe o título "Ranking entre equipes"', () => {
    cy.contains('Ranking entre equipes', { timeout: 15000 }).should('be.visible')
  })

  it('exibe o subtítulo descritivo', () => {
    cy.contains(/liderando em vendas/i, { timeout: 15000 }).should('be.visible')
  })

  // ── Filtros ──────────────────────────────────────────────────

  it('exibe o filtro de equipes', () => {
    cy.get('[data-testid="team-filter-select"]').should('be.visible')
    cy.get('[data-testid="team-filter-select"]').should('contain.text', 'Todas as equipes')
  })

  it('exibe o filtro de período', () => {
    cy.get('[data-testid="period-filter-select"]').should('be.visible')
  })

  it('filtro de equipe oferece opções de Equipe 7 e Tropa de Elite', () => {
    cy.get('[data-testid="team-filter-select"]').click()
    cy.contains('[role="option"]', 'Equipe 7').should('be.visible')
    cy.contains('[role="option"]', 'Tropa de Elite').should('be.visible')
    cy.get('body').type('{esc}')
  })

  it('filtro de período oferece opções Semanal, Mensal e Anual', () => {
    cy.get('[data-testid="period-filter-select"]').click()
    cy.contains('[role="option"]', 'Semanal').should('be.visible')
    cy.contains('[role="option"]', 'Mensal').should('be.visible')
    cy.contains('[role="option"]', 'Anual').should('be.visible')
    cy.get('body').type('{esc}')
  })

  it('trocar período para Mensal atualiza o label no select', () => {
    cy.get('[data-testid="period-filter-select"]').click()
    cy.contains('[role="option"]', 'Mensal').click()
    cy.get('[data-testid="period-filter-select"]').should('contain.text', 'Mensal')
  })

  it('trocar período para Anual atualiza o label no select', () => {
    cy.get('[data-testid="period-filter-select"]').click()
    cy.contains('[role="option"]', 'Anual').click()
    cy.get('[data-testid="period-filter-select"]').should('contain.text', 'Anual')
  })

  // ── Cards de resumo ──────────────────────────────────────────

  it('exibe card de equipe ganhadora', () => {
    cy.contains('Equipe ganhadora', { timeout: 15000 }).should('be.visible')
  })

  it('exibe indicadores de renovações e perdas no período', () => {
    cy.contains('Renovações e perdas', { timeout: 15000 }).should('be.visible')
    cy.contains('Renovações', { timeout: 15000 }).should('be.visible')
    cy.contains('Perdas', { timeout: 15000 }).should('be.visible')
  })
})
