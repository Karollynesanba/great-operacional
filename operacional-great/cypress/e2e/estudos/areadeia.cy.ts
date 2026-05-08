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

const SEED_CATEGORIES = [
  {
    id: 'cat-1',
    name: 'CRM e Clientes',
    description: 'Materiais para relacionamento com clientes.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    name: 'Execucao',
    description: 'Fluxos de rotina operacional.',
    created_at: new Date().toISOString(),
  },
]

const seedStudyAi = (win: Window) => {
  win.localStorage.clear()
  win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
  win.localStorage.setItem('great_users', JSON.stringify([TEST_ADMIN]))
  win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
  win.localStorage.setItem('mock_db_study_categories', JSON.stringify(SEED_CATEGORIES))
}

const visitGreatStudyAIArea = () => {
  cy.visit('/operacional/area-estudo/ia', {
    onBeforeLoad(win) {
      seedStudyAi(win)
    },
  })

  cy.contains('Great Study AI', { timeout: 15000 }).should('be.visible')
}

const visitGreatStudyChat = () => {
  cy.visit('/operacional/great-study-ai', {
    onBeforeLoad(win) {
      seedStudyAi(win)
    },
  })

  cy.contains('h1', 'Great Study AI', { timeout: 15000 }).should('be.visible')
}

describe('Great Study AI - Area de Estudos', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    visitGreatStudyAIArea()
  })

  it('exibe os modos geral e foco por area com textos corrigidos', () => {
    cy.get('[data-cy="study-ai-mode-general"]').should('be.visible')
    cy.get('[data-cy="study-ai-mode-focus"]').should('be.visible')
    cy.get('[data-cy="study-ai-quick-prompts"]').should('be.visible')
    cy.get('[data-cy="study-ai-help-panel"]').should('be.visible')
    cy.get('[data-cy="study-ai-area-select"]').click({ force: true })
    cy.get('[role="option"]').contains('Operacional').should('be.visible')
  })

  it('permite clicar nos cards sugeridos e preencher o chat', () => {
    cy.get('[data-cy="study-ai-quick-prompt"]').contains('Crie um quiz sobre este tema').click()
    cy.get('textarea').should('have.value', 'Crie um quiz sobre este tema')
  })

  it('permite perguntar algo no chat e receber resposta da IA', () => {
    cy.get('textarea').type('Como organizar a rotina operacional?')
    cy.contains('button', 'Enviar').click()

    cy.contains('Como organizar a rotina operacional?').should('be.visible')
    cy.get('[data-cy="study-ai-assistant-message"]', { timeout: 15000 })
      .should('have.length.at.least', 1)
  })

  it('permite usar foco por area e responder com o contexto da area', () => {
    cy.get('[data-cy="study-ai-mode-focus"]').scrollIntoView().click({ force: true })
    cy.get('[data-cy="study-ai-area-select"]').scrollIntoView().click({ force: true })
    cy.get('[role="option"]').contains('CRM e Clientes').click()

    cy.get('textarea').type('Quais pontos devo revisar?')
    cy.contains('button', 'Enviar').click()

    cy.get('[data-cy="study-ai-assistant-message"]', { timeout: 15000 })
      .should('have.length.at.least', 1)
    cy.contains('CRM e Clientes').should('be.visible')
  })
})

describe('Great Study AI - Conversas', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    visitGreatStudyChat()
  })

  it('permite criar uma nova conversa', () => {
    cy.get('[data-cy="study-ai-new-conversation"]').scrollIntoView().click()
    cy.contains(/Comece uma conversa para estudar processos operacionais com a IA/i).should('not.exist')
    cy.contains(/Nova conversa/i).should('exist')
  })

  it('permite clicar nos cards disponiveis e gerar conversa com resposta', () => {
    cy.get('[data-cy="study-ai-quick-prompt"]').contains('Monte um checklist').scrollIntoView().click()
    cy.contains(/Monte um checklist/i).should('be.visible')
    cy.get('[data-cy="study-ai-assistant-message"]', { timeout: 15000 })
      .should('have.length.at.least', 1)
  })

  it('permite perguntar algo manualmente no chat', () => {
    cy.get('textarea').type('Preciso de ajuda com onboarding{enter}')

    cy.contains('Preciso de ajuda com onboarding').should('be.visible')
    cy.get('[data-cy="study-ai-assistant-message"]', { timeout: 15000 })
      .should('have.length.at.least', 1)
  })

  it('permite voltar para a area de estudos', () => {
    cy.contains(/Voltar para conte.dos/i).click()
    cy.url().should('include', '/operacional/area-estudo/conteudos')
    cy.contains(/Conte.dos/i).should('be.visible')
  })
})
