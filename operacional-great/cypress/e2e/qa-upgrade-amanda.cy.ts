/// <reference types="cypress" />

const RUN_ID = `QA-AMANDA-${Date.now()}`

function loginAsAdmin() {
  cy.session('qa-admin', () => {
    cy.loginAdmin()
  }, { cacheAcrossSpecs: false })
}

function loginAsUser() {
  cy.session('qa-user', () => {
    cy.loginUser()
  }, { cacheAcrossSpecs: false })
}

function openFirstComboboxOption() {
  cy.wait(400)
  cy.document().its('body').then((body) => {
    cy.wrap(body).find('[role="option"]', { timeout: 10000 }).first().click({ force: true })
  })
}

function openRowForText(text: string) {
  return cy.get('main').contains(text).parents('div.grid').first()
}

describe('QA Upgrade Amanda', () => {
  it('Dashboard: cria, persiste, sincroniza e remove uma tarefa', () => {
    const taskTitle = `${RUN_ID} Dashboard Task`

    loginAsAdmin()
    cy.visit('/operacional/dashboard')
    cy.contains('h1', 'Operação Great', { timeout: 15000 }).should('be.visible')

    cy.get('[data-cy="acao-rapida-nova-tarefa"]').click()
    cy.get('[data-cy="modal-nova-tarefa"]').should('be.visible')
    cy.get('[data-cy="input-tarefa-titulo"]').type(taskTitle)
    cy.get('[data-cy="input-tarefa-descricao"]').type('Tarefa criada pelo QA para validar persistência.')
    cy.contains('button', 'Selecionar responsáveis').click()
    cy.contains('button', 'Admin Teste').click()
    cy.get('[data-cy="btn-salvar-tarefa"]').click()

    cy.get('[data-cy="card-proximas-tarefas"]').scrollIntoView().contains(taskTitle, { timeout: 15000 }).should('exist')
    cy.reload()
    cy.get('[data-cy="card-proximas-tarefas"]').scrollIntoView().contains(taskTitle, { timeout: 15000 }).should('exist')

    loginAsUser()
    cy.viewport(390, 844)
    cy.visit('/operacional/dashboard')
    cy.get('[data-cy="card-proximas-tarefas"]').scrollIntoView().contains(taskTitle, { timeout: 15000 }).should('exist')

    loginAsAdmin()
    cy.viewport(1280, 800)
    cy.visit('/operacional/dashboard')
    cy.contains('[data-cy="proxima-tarefa-item"]', taskTitle).within(() => {
      cy.get('[data-cy="btn-remover-proxima-tarefa"]').click()
    })
    cy.contains(taskTitle).should('not.exist')
  })

  it('Calendário: cria, edita, sincroniza e exclui uma gravação', () => {
    const recordingLocation = `${RUN_ID} Studio`
    const recordingType = `${RUN_ID} Tipo Inicial`
    const recordingTypeEdited = `${RUN_ID} Tipo Editado`
    const recordingDate = new Date().toISOString().slice(0, 10)

    loginAsAdmin()
    cy.visit('/operacional/upgrade-de-amanda/calendario-de-gravacao')
    cy.contains('h1', 'Calendário de Gravação', { timeout: 15000 }).should('be.visible')

    cy.contains('button', 'Nova gravação').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="dialog"]').within(() => {
      cy.get('button[role="combobox"]').first().click({ force: true })
      openFirstComboboxOption()
      cy.get('#recording-date').clear().type(recordingDate)
      cy.get('#recording-time').clear().type('10:30')
      cy.get('#recording-type').type(recordingType)
      cy.get('#recording-location').type(recordingLocation)
      cy.get('#recording-observations').type('Registro QA para validar CRUD.')
      cy.contains('button', 'Criar gravação').click()
    })

    cy.get('main').contains(recordingLocation, { timeout: 15000 }).should('exist')
    cy.reload()
    cy.get('main').contains(recordingLocation, { timeout: 15000 }).should('exist')

    loginAsUser()
    cy.viewport(390, 844)
    cy.visit('/operacional/upgrade-de-amanda/calendario-de-gravacao')
    cy.get('main').contains(recordingLocation, { timeout: 15000 }).should('exist')

    loginAsAdmin()
    cy.viewport(1280, 800)
    cy.visit('/operacional/upgrade-de-amanda/calendario-de-gravacao')
    openRowForText(recordingLocation).within(() => {
      cy.get('button').first().click()
    })
    cy.get('[role="dialog"]').within(() => {
      cy.get('#recording-type').clear().type(recordingTypeEdited)
      cy.contains('button', 'Salvar alterações').click()
    })
    cy.get('main').contains(recordingTypeEdited, { timeout: 15000 }).should('exist')

    openRowForText(recordingLocation).within(() => {
      cy.get('button').last().click()
    })
    cy.contains('button', 'Excluir').click()
    cy.contains(recordingLocation).should('not.exist')
  })

  it('Metas: a rota esperada não está disponível no AppRoutes atual', () => {
    loginAsAdmin()
    cy.visit('/ceo/dashboard', { failOnStatusCode: false })
    cy.contains('h1', '404', { timeout: 15000 }).should('be.visible')
    cy.contains('Página não encontrada').should('be.visible')
  })

  it('Conteúdo: cria, edita, sincroniza e exclui um modelo pronto', () => {
    const modelTitle = `${RUN_ID} Conteudo`
    const modelDescription = 'Descrição inicial QA'
    const modelContent = 'Conteúdo inicial QA'
    const modelDescriptionEdited = 'Descrição editada QA'

    loginAsAdmin()
    cy.visit('/operacional/upgrade-de-amanda/modelos-prontos')
    cy.contains('h1', 'Modelos Prontos', { timeout: 15000 }).should('be.visible')

    cy.contains('button', 'Novo modelo').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', 'Cliente / Doutor').parent().find('button[role="combobox"]').click()
      openFirstComboboxOption()
      cy.contains('label', 'Título').parent().find('input').type(modelTitle)
      cy.contains('label', 'Tipo').parent().find('button[role="combobox"]').click({ force: true })
      cy.get('body').contains('[role="option"]', 'Material').click()
      cy.contains('label', 'Categoria').parent().find('input').type('QA')
      cy.contains('label', 'Descrição').parent().find('textarea').type(modelDescription)
      cy.contains('label', 'Conteúdo').parent().find('textarea').type(modelContent)
      cy.contains('label', 'Campanha relacionada').parent().find('input').type(`${RUN_ID} Campanha`)
      cy.contains('button', 'Criar modelo').click()
    })

    cy.get('main').contains(modelTitle, { timeout: 15000 }).should('exist')
    cy.reload()
    cy.get('main').contains(modelTitle, { timeout: 15000 }).should('exist')

    loginAsUser()
    cy.viewport(390, 844)
    cy.visit('/operacional/upgrade-de-amanda/modelos-prontos')
    cy.get('main').contains(modelTitle, { timeout: 15000 }).should('exist')

    loginAsAdmin()
    cy.viewport(1280, 800)
    cy.visit('/operacional/upgrade-de-amanda/modelos-prontos')
    openRowForText(modelTitle).within(() => {
      cy.get('button').eq(4).click()
    })
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', 'Descrição').parent().find('textarea').clear().type(modelDescriptionEdited)
      cy.contains('label', 'Conteúdo').parent().find('textarea').clear().type(`${modelContent} editado`)
      cy.contains('button', 'Salvar alterações').click()
    })
    cy.get('main').contains(modelDescriptionEdited, { timeout: 15000 }).should('exist')

    openRowForText(modelTitle).within(() => {
      cy.get('button').last().click()
    })
    cy.contains('button', 'Excluir').click()
    cy.contains(modelTitle).should('not.exist')
  })

  it('Stories: cria, edita, sincroniza e exclui um roteiro em formato Stories', () => {
    const scriptTitle = `${RUN_ID} Stories`
    const scriptContent = 'Conteúdo inicial do roteiro QA'
    const scriptContentEdited = 'Conteúdo editado do roteiro QA'

    loginAsAdmin()
    cy.visit('/operacional/upgrade-de-amanda/roteiros-validados')
    cy.contains('h1', 'Roteiros Validados', { timeout: 15000 }).should('be.visible')

    cy.contains('button', 'Novo roteiro').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', 'Cliente / Doutor').parent().find('button[role="combobox"]').click({ force: true })
      openFirstComboboxOption()
      cy.contains('label', 'Título').parent().find('input').type(scriptTitle)
      cy.contains('label', 'Formato').parent().find('button[role="combobox"]').click({ force: true })
      cy.get('body').contains('[role="option"]', 'Stories').click()
      cy.contains('label', 'Categoria').parent().find('input').type('QA')
      cy.contains('label', 'Conteúdo do roteiro').parent().find('textarea').type(scriptContent)
      cy.contains('button', 'Criar roteiro').click()
    })

    cy.get('main').contains(scriptTitle, { timeout: 15000 }).should('exist')
    cy.reload()
    cy.get('main').contains(scriptTitle, { timeout: 15000 }).should('exist')

    loginAsUser()
    cy.viewport(390, 844)
    cy.visit('/operacional/upgrade-de-amanda/roteiros-validados')
    cy.get('main').contains(scriptTitle, { timeout: 15000 }).should('exist')

    loginAsAdmin()
    cy.viewport(1280, 800)
    cy.visit('/operacional/upgrade-de-amanda/roteiros-validados')
    openRowForText(scriptTitle).within(() => {
      cy.get('button').eq(2).click()
    })
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', 'Conteúdo do roteiro').parent().find('textarea').clear().type(scriptContentEdited)
      cy.contains('button', 'Salvar alterações').click()
    })
    cy.get('main').contains(scriptContentEdited, { timeout: 15000 }).should('exist')

    openRowForText(scriptTitle).within(() => {
      cy.get('button').last().click()
    })
    cy.contains('button', 'Excluir').click()
    cy.contains(scriptTitle).should('not.exist')
  })

  it('Ideias: cria, edita, sincroniza e exclui uma estrutura', () => {
    const ideaTitle = `${RUN_ID} Ideia`
    const ideaDescription = 'Descrição inicial da ideia QA'
    const ideaDescriptionEdited = 'Descrição editada da ideia QA'

    loginAsAdmin()
    cy.visit('/operacional/upgrade-de-amanda/estruturas-que-performam')
    cy.contains('h1', 'Estruturas que Performam', { timeout: 15000 }).should('be.visible')

    cy.contains('button', 'Nova estrutura').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', 'Cliente / Doutor').parent().find('button[role="combobox"]').click({ force: true })
      openFirstComboboxOption()
      cy.contains('label', 'Título').parent().find('input').type(ideaTitle)
      cy.contains('label', 'Tipo').parent().find('button[role="combobox"]').click({ force: true })
      cy.get('body').contains('[role="option"]', 'Hook').click()
      cy.contains('label', 'Categoria').parent().find('input').type('QA')
      cy.contains('label', 'Descrição').parent().find('textarea').type(ideaDescription)
      cy.contains('label', 'Uso').parent().find('input').clear().type('1')
      cy.contains('label', 'Visualizações').parent().find('input').eq(0).clear().type('2')
      cy.contains('label', 'Engajamento (%)').parent().find('input').clear().type('3')
      cy.contains('label', 'Salvamentos').parent().find('input').clear().type('4')
      cy.contains('button', 'Criar estrutura').click()
    })

    cy.get('main').contains(ideaTitle, { timeout: 15000 }).should('exist')
    cy.reload()
    cy.get('main').contains(ideaTitle, { timeout: 15000 }).should('exist')

    loginAsUser()
    cy.viewport(390, 844)
    cy.visit('/operacional/upgrade-de-amanda/estruturas-que-performam')
    cy.get('main').contains(ideaTitle, { timeout: 15000 }).should('exist')

    loginAsAdmin()
    cy.viewport(1280, 800)
    cy.visit('/operacional/upgrade-de-amanda/estruturas-que-performam')
    openRowForText(ideaTitle).within(() => {
      cy.get('button').eq(1).click()
    })
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label', 'Descrição').parent().find('textarea').clear().type(ideaDescriptionEdited)
      cy.contains('button', 'Salvar alterações').click()
    })
    cy.get('main').contains(ideaDescriptionEdited, { timeout: 15000 }).should('exist')

    openRowForText(ideaTitle).within(() => {
      cy.get('button').last().click()
    })
    cy.contains('button', 'Excluir').click()
    cy.contains(ideaTitle).should('not.exist')
  })
})
