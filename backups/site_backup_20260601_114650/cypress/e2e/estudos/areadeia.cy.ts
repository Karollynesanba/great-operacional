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

  it('exibe os controles principais', () => {
    cy.get('[data-cy="study-ai-mode-general"]').should('be.visible')
    cy.get('[data-cy="study-ai-mode-focus"]').should('be.visible')
    cy.get('[data-cy="study-ai-quick-prompts"]').should('be.visible')
    cy.get('[data-cy="study-ai-help-panel"]').should('be.visible')
  })

  it('preenche o chat ao clicar em um prompt rapido', () => {
    cy.get('[data-cy="study-ai-quick-prompt"]').contains('Crie um quiz sobre este tema').click()
    cy.get('textarea').should('have.value', 'Crie um quiz sobre este tema')
  })

  it('envia uma pergunta no chat', () => {
    cy.get('textarea').type('Como organizar a rotina operacional?')
    cy.contains('button', 'Enviar').click()

    cy.contains('Como organizar a rotina operacional?').should('be.visible')
    cy.get('[data-cy="study-ai-assistant-message"]', { timeout: 15000 })
      .should('have.length.at.least', 1)
  })
})

describe('Great Study AI - Conversas', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    visitGreatStudyChat()
  })

  it('cria uma nova conversa', () => {
    cy.get('[data-cy="study-ai-new-conversation"]').scrollIntoView().click()
    cy.contains(/Nova conversa/i).should('exist')
  })

  it('aceita um prompt rapido e gera resposta', () => {
    cy.get('[data-cy="study-ai-quick-prompt"]').contains('Monte um checklist').scrollIntoView().click()
    cy.contains(/Monte um checklist/i).should('be.visible')
  })

  it('permite voltar para a area de estudos', () => {
    cy.contains(/Voltar para conte.dos/i).click()
    cy.url().should('include', '/operacional/area-estudo/conteudos')
  })
})
