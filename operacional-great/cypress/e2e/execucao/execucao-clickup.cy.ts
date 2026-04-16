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

const TEST_PROFILES = [
  { id: 'test-admin-1', full_name: 'Admin Teste', is_active: true, created_at: new Date().toISOString() },
  { id: 'user-media', full_name: 'Midia Great', is_active: true, created_at: new Date().toISOString() },
]

const TEST_BOARDS = [
  { id: 'board-geral', name: 'Quadro Principal', sector: 'GERAL', is_default: true, team_id: null, created_at: new Date().toISOString() },
  { id: 'board-trafego', name: 'Quadro Trafego Pago', sector: 'TRAFEGO', is_default: true, team_id: null, created_at: new Date().toISOString() },
  { id: 'board-atendimento', name: 'Quadro Atendimento', sector: 'ATENDIMENTO', is_default: true, team_id: null, created_at: new Date().toISOString() },
  { id: 'board-marketing', name: 'Quadro Marketing Digital', sector: 'MARKETING_DIGITAL', is_default: true, team_id: null, created_at: new Date().toISOString() },
]

const TEST_COLUMNS = [
  { id: 'col-geral-1', name: 'A Fazer', board_id: 'board-geral', position: 0, order: 0, color: '#6366f1', created_at: new Date().toISOString() },
  { id: 'col-geral-2', name: 'Em Andamento', board_id: 'board-geral', position: 1, order: 1, color: '#f59e0b', created_at: new Date().toISOString() },
  { id: 'col-geral-3', name: 'Concluido', board_id: 'board-geral', position: 2, order: 2, color: '#10b981', created_at: new Date().toISOString() },
  { id: 'col-trafego-1', name: 'A Fazer', board_id: 'board-trafego', position: 0, order: 0, color: '#3b82f6', created_at: new Date().toISOString() },
  { id: 'col-trafego-2', name: 'Em Andamento', board_id: 'board-trafego', position: 1, order: 1, color: '#f59e0b', created_at: new Date().toISOString() },
  { id: 'col-atendimento-1', name: 'A Fazer', board_id: 'board-atendimento', position: 0, order: 0, color: '#8b5cf6', created_at: new Date().toISOString() },
  { id: 'col-atendimento-2', name: 'Concluido', board_id: 'board-atendimento', position: 1, order: 1, color: '#10b981', created_at: new Date().toISOString() },
  { id: 'col-marketing-1', name: 'A Fazer', board_id: 'board-marketing', position: 0, order: 0, color: '#ec4899', created_at: new Date().toISOString() },
  { id: 'col-marketing-2', name: 'Em Andamento', board_id: 'board-marketing', position: 1, order: 1, color: '#f59e0b', created_at: new Date().toISOString() },
]

const TEST_CARDS = [
  {
    id: 'card-geral-1',
    board_id: 'board-geral',
    column_id: 'col-geral-1',
    title: 'Implantar painel principal',
    description: 'Acompanhamento geral da operacao',
    priority: 'MEDIA',
    due_date: '2026-04-20',
    tags: [],
    checklist: [],
    attachments: [],
    watchers: [],
    pinned: false,
    cover_image: null,
    client_id: null,
    assigned_to_user_id: 'test-admin-1',
    created_by_user_id: 'test-admin-1',
    completed_at: null,
    order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'card-trafego-1',
    board_id: 'board-trafego',
    column_id: 'col-trafego-1',
    title: 'Revisar campanha de meta ads',
    description: 'Ajustes no trafego pago',
    priority: 'ALTA',
    due_date: '2026-04-22',
    tags: [],
    checklist: [],
    attachments: [],
    watchers: [],
    pinned: false,
    cover_image: null,
    client_id: null,
    assigned_to_user_id: 'user-media',
    created_by_user_id: 'test-admin-1',
    completed_at: null,
    order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'card-atendimento-1',
    board_id: 'board-atendimento',
    column_id: 'col-atendimento-1',
    title: 'Responder cliente premium',
    description: 'Acompanhamento do atendimento',
    priority: 'BAIXA',
    due_date: null,
    tags: [],
    checklist: [],
    attachments: [],
    watchers: [],
    pinned: false,
    cover_image: null,
    client_id: null,
    assigned_to_user_id: 'test-admin-1',
    created_by_user_id: 'test-admin-1',
    completed_at: null,
    order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'card-marketing-1',
    board_id: 'board-marketing',
    column_id: 'col-marketing-1',
    title: 'Publicar calendario editorial',
    description: 'Entrega do marketing digital',
    priority: 'URGENTE',
    due_date: '2026-04-18',
    tags: [],
    checklist: [],
    attachments: [],
    watchers: [],
    pinned: false,
    cover_image: null,
    client_id: null,
    assigned_to_user_id: 'test-admin-1',
    created_by_user_id: 'test-admin-1',
    completed_at: null,
    order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const TEST_ACTIVITY_LOGS = [
  {
    id: 'activity-1',
    user_id: 'test-admin-1',
    user_name: 'Admin Teste',
    user_email: 'admin@teste.com',
    action: 'CREATE',
    entity: 'exec_card',
    entity_id: 'card-geral-1',
    details: 'Card Implantar painel principal criado no quadro Geral',
    created_at: new Date().toISOString(),
  },
  {
    id: 'activity-2',
    user_id: 'user-media',
    user_name: 'Midia Great',
    user_email: 'midia@teste.com',
    action: 'MOVE',
    entity: 'exec_card',
    entity_id: 'card-trafego-1',
    details: 'Card Revisar campanha de meta ads movido para Em Andamento',
    created_at: new Date().toISOString(),
  },
]

function visitExecucao(path = '/operacional/execucao') {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.clear()
      win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
      win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
      win.localStorage.setItem('mock_db_profiles', JSON.stringify(TEST_PROFILES))
      win.localStorage.setItem('mock_db_exec_boards', JSON.stringify(TEST_BOARDS))
      win.localStorage.setItem('mock_db_exec_columns', JSON.stringify(TEST_COLUMNS))
      win.localStorage.setItem('mock_db_exec_cards', JSON.stringify(TEST_CARDS))
      win.localStorage.setItem('mock_db_activity_logs', JSON.stringify(TEST_ACTIVITY_LOGS))
    },
  })
}

describe('Execucao - clickup', () => {
  beforeEach(() => {
    cy.viewport(1440, 900)
  })

  it('valida planilha, quadro, pesquisa e os setores Geral, Trafego Pago, Atendimento e Marketing Digital', () => {
    visitExecucao()

    cy.contains('Quadro Principal', { timeout: 15000 }).should('be.visible')
    cy.contains('Implantar painel principal').should('be.visible')
    cy.contains(/Geral/i).should('be.visible')
    cy.contains(/Tr.*fego Pago/i).should('be.visible')
    cy.contains(/Atendimento/i).should('be.visible')
    cy.contains(/Marketing Digital/i).should('be.visible')

    cy.contains('button', 'Lista').click()
    cy.get('table').should('be.visible')
    cy.contains('th', /T.tulo/i).should('be.visible')
    cy.contains('th', /Coluna/i).should('be.visible')
    cy.contains('th', /Prioridade/i).should('be.visible')
    cy.contains('Implantar painel principal').should('be.visible')

    cy.get('input[placeholder*="Pesquisar"]').type('painel')
    cy.contains('Implantar painel principal').should('be.visible')
    cy.contains('Revisar campanha de meta ads').should('not.exist')

    cy.get('input[placeholder*="Pesquisar"]').clear()
    cy.contains('button', 'Quadro').click()
    cy.contains('A Fazer').should('be.visible')
    cy.contains('button', 'Novo card').should('be.visible').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('button', 'Cancelar').click()
    cy.get('[role="dialog"]').should('not.exist')

    cy.contains(/Tr.*fego Pago/i).click()
    cy.contains('Quadro Trafego Pago', { timeout: 10000 }).should('be.visible')
    cy.contains('Revisar campanha de meta ads').should('be.visible')

    cy.contains(/Atendimento/i).click()
    cy.contains('Quadro Atendimento', { timeout: 10000 }).should('be.visible')
    cy.contains('Responder cliente premium').should('be.visible')

    cy.contains(/Marketing Digital/i).click()
    cy.contains('Quadro Marketing Digital', { timeout: 10000 }).should('be.visible')
    cy.contains('Publicar calendario editorial').should('be.visible')
  })

  it('valida o registro de atividades com busca e filtros', () => {
    visitExecucao('/operacional/execucao/atividades')

    cy.contains(/Registro de Atividades/i, { timeout: 15000 }).should('be.visible')
    cy.contains('Admin Teste').should('be.visible')
    cy.contains('Midia Great').should('be.visible')
    cy.contains(/Criac/i).should('be.visible')
    cy.contains(/Movimenta/i).should('be.visible')

    cy.get('input[placeholder*="Buscar"]').type('meta ads')
    cy.contains('Midia Great').should('be.visible')
    cy.contains('Admin Teste').should('not.exist')

    cy.get('input[placeholder*="Buscar"]').clear()
    cy.contains('button', /A..o|Acao/i).click()
    cy.contains('[role="option"]', /Criac/i).click()
    cy.contains('Admin Teste').should('be.visible')
    cy.contains('Midia Great').should('not.exist')

    cy.contains('button', /Entidade/i).click()
    cy.contains('[role="option"]', /Cards/i).click()
    cy.contains('Admin Teste').should('be.visible')
    cy.contains('button', /Atualizar/i).should('be.visible')
  })
})
