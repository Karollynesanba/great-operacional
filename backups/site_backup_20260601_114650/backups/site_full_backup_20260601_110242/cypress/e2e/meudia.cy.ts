/// <reference types="cypress" />

const AMANDA_USER = {
  id: 'operacional-amanda-great',
  name: 'Amanda Great',
  email: 'amandagreatsd@gmail.com',
  role: 'EDITOR_VIDEO',
  isAdmin: false,
  active: true,
  teamId: 'team-2',
  createdAt: new Date().toISOString(),
}

const MOCK_PROFILES = [
  { id: AMANDA_USER.id, full_name: AMANDA_USER.name, email: AMANDA_USER.email, is_active: true, created_at: new Date().toISOString() },
  { id: 'operacional-bruno-great', full_name: 'Bruno Gomes', email: 'bruno.gomes@teste.com', is_active: true, created_at: new Date().toISOString() },
]

function seedAmandaSession(win: Window) {
  win.localStorage.clear()
  win.localStorage.setItem('great_user', JSON.stringify(AMANDA_USER))
  win.localStorage.setItem('great_users', JSON.stringify([AMANDA_USER]))
  win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
  win.localStorage.setItem('mock_db_profiles', JSON.stringify(MOCK_PROFILES))
}

describe('Meu Dia – Funcionário comum', () => {

  beforeEach(() => {
    cy.viewport(1280, 800)

    cy.visit('/operacional/meu-dia', {
      onBeforeLoad: seedAmandaSession,
    })
  })

  it('deve carregar a página corretamente', () => {
    cy.contains('Meu Dia', { timeout: 15000 }).should('be.visible')
    cy.contains('Pendentes').should('be.visible')
    cy.contains('Concluídas').should('be.visible')
  })

  it('deve adicionar tarefa (botão e Enter)', () => {
    const titulo1 = `Tarefa ${Date.now()}`
    const titulo2 = `Tarefa Enter ${Date.now()}`

    cy.get('input[placeholder="Adicionar item rápido..."]')
      .type(titulo1)

    cy.contains('Adicionar').click()
    cy.contains(titulo1).should('be.visible')

    cy.get('input[placeholder="Adicionar item rápido..."]')
      .type(`${titulo2}{enter}`)

    cy.contains(titulo2).should('be.visible')
  })

  it('deve permitir atribuir tarefa para outros funcionários e mostrar a transferência', () => {
    const titulo = `Tarefa compartilhada ${Date.now()}`

    cy.get('input[placeholder="Adicionar item rápido..."]')
      .type(titulo)

    cy.contains('Atribuir a mais alguém?')
      .parent()
      .contains('button', 'Não')
      .click()

    cy.contains('[role="option"]', 'Sim').click()

    cy.contains('Selecionar pessoas').click()
    cy.contains('button', 'Cled').click()
    cy.contains('button', 'Matheus Tchaka').click()

    cy.contains('Adicionar').click()

    cy.get('[role="dialog"]').should('not.exist')
    cy.window().then((win) => {
      const workItems = JSON.parse(win.localStorage.getItem('mock_db_work_items') || '[]')
      expect(workItems.some((item: { title?: string }) => item.title === titulo)).to.eq(true)
    })
  })

  it('deve abrir dialog de tarefa fixa e selecionar tipo', () => {
    cy.contains('Tarefa Fixa').click()

    cy.contains('Nova Tarefa').should('be.visible')

    // Abre o Select de tipo (o trigger que contém "Normal (apenas hoje)")
    cy.contains('Normal (apenas hoje)')
      .closest('button[role="combobox"]')
      .click()

    cy.contains('Fixa (repete diariamente)').click()
    cy.contains('Esta tarefa aparecerá automaticamente todos os dias.')
      .should('be.visible')
  })

  it('deve atualizar contadores ao adicionar e concluir tarefa', () => {
    const titulo = `Teste ${Date.now()}`

    cy.contains('Pendentes')
      .parent()
      .find('p.text-kpi-sm')
      .invoke('text')
      .then((pendentesAntes) => {

        cy.get('input[placeholder="Adicionar item rápido..."]')
          .type(`${titulo}{enter}`)

        cy.contains(titulo).should('be.visible')

        cy.contains('Pendentes')
          .parent()
          .find('p.text-kpi-sm')
          .should(($el) => {
            expect(parseInt($el.text())).to.eq(parseInt(pendentesAntes) + 1)
          })

        cy.contains('Concluídas')
          .parent()
          .find('p.text-kpi-sm')
          .invoke('text')
          .then((concluidasAntes) => {

            // O card inteiro é clicável (onClick no div), não existe botão de toggle
            cy.contains(titulo).closest('.cursor-pointer').click()

            cy.contains('Concluídas')
              .parent()
              .find('p.text-kpi-sm')
              .should(($el) => {
                expect(parseInt($el.text())).to.eq(parseInt(concluidasAntes) + 1)
              })
          })
      })
  })

  it('deve disparar confete ao concluir tarefa', () => {
    const titulo = `Confete ${Date.now()}`

    cy.get('input[placeholder="Adicionar item rápido..."]')
      .type(`${titulo}{enter}`)

    cy.contains(titulo).should('be.visible')

    // O card inteiro é clicável (onClick no div)
    cy.contains(titulo).closest('.cursor-pointer').click()

    // Tarefa concluída = título com line-through (mesma linha de código que dispara o confete)
    cy.contains(titulo).should('have.class', 'line-through')

    // canvas-confetti injeta um <canvas> no DOM durante a animação
    cy.get('canvas', { timeout: 5000 }).should('exist')
  })

  it('usuario comum pode trocar para o dia de outro funcionario', () => {
    cy.get('[role="combobox"]').first().should('be.visible').click()
    cy.get('[role="option"]').contains('Bruno Gomes').click()

    cy.contains('Dia de Bruno Gomes', { timeout: 8000 }).should('be.visible')
    cy.contains('Visualizando o dia de Bruno Gomes').should('be.visible')
  })

  it('usuario comum nao deve ver panorama de admin', () => {
    cy.contains('Panorama').should('not.exist')
    cy.get('[role="combobox"]').should('be.visible')
  })
})


// ─────────────────────────────────────────────────────────────

describe('Meu Dia – Administrador', () => {

  const MOCK_PROFILES = [
    { id: 'seed-user-1', full_name: 'Ana Funcionária', operational_role: 'GESTOR', team_id: 'team-1', is_active: true, created_at: new Date().toISOString() },
    { id: 'seed-user-2', full_name: 'Pedro Funcionário', operational_role: 'ATENDENTE', team_id: 'team-1', is_active: true, created_at: new Date().toISOString() },
  ]

  beforeEach(() => {
    cy.viewport(1280, 800)

    cy.session('admin', () => {
      cy.loginAdmin()
    }, { cacheAcrossSpecs: false })

    // 1ª visita: garante que o app carrega com a sessão do admin
    cy.visit('/operacional/meu-dia')

    // Seta os perfis no localStorage após a página carregar
    // (o mock client lê daqui quando o componente chama .from('profiles').select())
    cy.window().then((win) => {
      win.localStorage.setItem('mock_db_profiles', JSON.stringify(MOCK_PROFILES))
    })

    // Recarrega para o componente buscar os perfis recém-inseridos
    cy.reload()
    cy.contains('Meu Dia', { timeout: 15000 }).should('be.visible')
  })

  it('deve visualizar e trocar usuário', () => {
    cy.get('[role="combobox"]', { timeout: 10000 }).first().should('be.visible').click()

    // Aguarda pelo menos 2 opções: "Meu Dia" + os usuários seedados
    cy.get('[role="option"]', { timeout: 10000 }).should('have.length.at.least', 2)

    // Clica em um usuário que existe no seed local do auth
    cy.get('[role="option"]').contains('Bruno Gomes').click()

    // Verifica o resultado na página (elementos novos, não o dropdown que sumiu)
    cy.contains('Dia de Bruno Gomes', { timeout: 8000 }).should('be.visible')
    cy.contains('Visualizando o dia de').should('be.visible')
  })

  it('panorama do admin deve exibir múltiplas equipes', () => {
    cy.contains('Panorama').click()

    cy.contains('Panorama das Equipes').should('be.visible')

    cy.get('[class*="bg-card"]')
      .should('have.length.at.least', 2)

    cy.contains('Semanal').click()
    cy.contains('esta semana').should('be.visible')

    cy.contains('Anual').click()
    cy.contains('este ano').should('be.visible')
  })

  it('deve voltar para Meu Dia a partir do panorama', () => {
    cy.contains('Panorama').click()
    cy.contains('Meu Dia').last().click()

    cy.contains('Pendentes').should('be.visible')
  })
})
