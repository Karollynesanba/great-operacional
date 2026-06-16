/// <reference types="cypress" />
export {}

const RUN_ID = `CY-RV-${Date.now()}`
const MOCK_OPERATIONAL_SEED_VERSION = 'operacional-roteiros-validados-cypress-v1'

const ADMIN_USER = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

const USER_A = {
  id: 'test-user-a',
  name: 'Usuário A',
  email: 'user-a@teste.com',
  role: 'ATENDENTE',
  active: true,
  createdAt: new Date().toISOString(),
}

const USER_B = {
  id: 'test-user-b',
  name: 'Usuário B',
  email: 'user-b@teste.com',
  role: 'ATENDENTE',
  active: true,
  createdAt: new Date().toISOString(),
}

const now = new Date()
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 12, 12, 0, 0, 0)
const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function monthDate(monthOffset: number, day = 12) {
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, day, 12, 0, 0, 0)
}

function clientLabel(client: { client_name: string; clinic_name?: string | null }) {
  return client.clinic_name ? `${client.client_name} - ${client.clinic_name}` : client.client_name
}

function seedRoteirosValidados(win: Window, seed: {
  user?: typeof ADMIN_USER
  clients?: Array<Record<string, unknown>>
  scripts?: Array<Record<string, unknown>>
} = {}) {
  const user = seed.user ?? ADMIN_USER

  win.localStorage.clear()
  win.localStorage.setItem('great_user', JSON.stringify(user))
  win.localStorage.setItem('great_users', JSON.stringify([user]))
  win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
  win.localStorage.setItem('mock_db_seed_version', MOCK_OPERATIONAL_SEED_VERSION)
  win.localStorage.setItem('mock_db_operational_clients', JSON.stringify(seed.clients ?? []))
  win.localStorage.setItem('mock_db_validated_scripts', JSON.stringify(seed.scripts ?? []))
}

function visitRoteirosValidados(seed: {
  user?: typeof ADMIN_USER
  clients?: Array<Record<string, unknown>>
  scripts?: Array<Record<string, unknown>>
} = {}, options: { preserveStorage?: boolean } = {}) {
  cy.visit('/operacional/upgrade-de-amanda/roteiros-validados', {
    onBeforeLoad(win) {
      if (!options.preserveStorage) {
        seedRoteirosValidados(win, seed)
      }
    },
  })

  cy.contains('h1', 'Roteiros Validados', { timeout: 15000 }).should('be.visible')
  cy.get('[data-cy="validated-scripts-page"]').should('be.visible')
}

type TableRow = {
  id?: string
  [key: string]: unknown
}

function updateTable(win: Window, table: string, updater: (rows: TableRow[]) => TableRow[]) {
  const key = `mock_db_${table}`
  const rows = JSON.parse(win.localStorage.getItem(key) || '[]')
  win.localStorage.setItem(key, JSON.stringify(updater(rows)))
}

function openCreateDialog() {
  cy.get('[data-cy="validated-scripts-create"]').click()
  cy.get('[data-cy="validated-script-dialog"]').should('be.visible')
}

function fillScriptDialog(values: {
  client?: string
  title?: string
  date?: string
  category?: string
  content?: string
  format?: string
}) {
  cy.get('[data-cy="validated-script-dialog"]').within(() => {
    if (values.title !== undefined) {
      cy.get('[data-cy="validated-script-title"]').clear().type(values.title)
    }

    if (values.date !== undefined) {
      cy.get('[data-cy="validated-script-date"]').clear().type(values.date)
    }

    if (values.category !== undefined) {
      cy.get('[data-cy="validated-script-category"]').clear().type(values.category)
    }

    if (values.content !== undefined) {
      cy.get('[data-cy="validated-script-content"]').clear().type(values.content)
    }

    if (values.format !== undefined) {
      cy.get('[data-cy="validated-script-format"]').click()
      cy.contains('[role="option"]', values.format).click()
    }
  })

  if (values.client) {
    cy.get('[data-cy="validated-script-client-select"]').click()
    cy.contains('[role="option"]', values.client).click()
  }
}

function saveDialog() {
  cy.get('[data-cy="validated-script-dialog"]').within(() => {
    cy.contains('button', /Criar roteiro|Salvar alterações/i).click()
  })
}

function openRow(title: string) {
  cy.contains('[data-cy="validated-script-row"]', title, { timeout: 15000 }).should('be.visible')
}

function clickRowAction(title: string, actionCy: string) {
  cy.contains('[data-cy="validated-script-row"]', title)
    .should('be.visible')
    .within(() => {
      cy.get(`[data-cy="${actionCy}"]`).click()
    })
}

describe('Upgrade Amanda - Roteiros Validados', () => {
  beforeEach(() => {
    cy.viewport(1440, 900)
    cy.on('uncaught:exception', () => false)
  })

  it('CT01 adiciona um novo roteiro e atualiza o contador', () => {
    const client = {
      id: `${RUN_ID}-client-alpha`,
      client_name: `${RUN_ID} Cliente Alpha`,
      clinic_name: 'Clínica Alpha',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({ clients: [client], scripts: [] })

    cy.get('[data-cy="validated-scripts-stat-total-value"]').should('have.text', '0')

    openCreateDialog()
    fillScriptDialog({
      client: clientLabel(client),
      title: `${RUN_ID} Roteiro Novo`,
      date: toDateValue(now),
      category: 'Captação',
      content: 'Conteúdo de teste para validar o cadastro de roteiro.',
      format: 'Reels',
    })
    saveDialog()

    openRow(`${RUN_ID} Roteiro Novo`)
    cy.get('[data-cy="validated-scripts-stat-total-value"]').should('have.text', '1')
  })

  it('CT02 visualiza um roteiro cadastrado sem perder conteúdo', () => {
    const client = {
      id: `${RUN_ID}-client-beta`,
      client_name: `${RUN_ID} Cliente Beta`,
      clinic_name: 'Clínica Beta',
      status_operacional: 'ATIVO',
    }
    const scriptTitle = `${RUN_ID} Roteiro para Visualização`

    visitRoteirosValidados({
      clients: [client],
      scripts: [
        {
          id: `${RUN_ID}-script-view`,
          client_id: client.id,
          title: scriptTitle,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'Autoridade',
          content: 'Texto completo do roteiro para validação da abertura.',
          document_name: 'roteiro-exemplo.pdf',
          document_url: 'https://example.com/roteiro-exemplo.pdf',
          document_path: null,
        },
      ],
    })

    clickRowAction(scriptTitle, 'validated-script-view')

    cy.get('[data-cy="validated-script-view-dialog"]').should('be.visible').within(() => {
      cy.contains(scriptTitle).should('be.visible')
      cy.contains('Texto completo do roteiro para validação da abertura.').should('be.visible')
      cy.contains(clientLabel(client)).should('be.visible')
      cy.contains('Categoria').should('be.visible')
      cy.contains('Abrir documento anexado').should('be.visible')
    })
  })

  it('CT03 edita um roteiro e mantém as alterações sincronizadas', () => {
    const client = {
      id: `${RUN_ID}-client-edit`,
      client_name: `${RUN_ID} Cliente Edição`,
      clinic_name: 'Clínica Edição',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({
      clients: [client],
      scripts: [
        {
          id: `${RUN_ID}-script-edit`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro Original`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'Engajamento',
          content: 'Conteúdo original.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
      ],
    })

    clickRowAction(`${RUN_ID} Roteiro Original`, 'validated-script-edit')

    fillScriptDialog({
      title: `${RUN_ID} Roteiro Atualizado`,
      category: 'Autoridade',
      content: 'Conteúdo editado e validado em outro dispositivo.',
    })
    saveDialog()

    openRow(`${RUN_ID} Roteiro Atualizado`)
    cy.contains('[data-cy="validated-script-row"]', `${RUN_ID} Roteiro Original`).should('not.exist')
    cy.reload()
    openRow(`${RUN_ID} Roteiro Atualizado`)
  })

  it('CT04 exclui um roteiro e atualiza a listagem', () => {
    const client = {
      id: `${RUN_ID}-client-delete`,
      client_name: `${RUN_ID} Cliente Exclusão`,
      clinic_name: 'Clínica Exclusão',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({
      clients: [client],
      scripts: [
        {
          id: `${RUN_ID}-script-delete`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro Removido`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'Storytelling',
          content: 'Conteúdo que será excluído.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
      ],
    })

    clickRowAction(`${RUN_ID} Roteiro Removido`, 'validated-script-delete')
    cy.get('[data-cy="validated-script-delete-dialog"]').should('be.visible')
    cy.get('[data-cy="validated-script-delete-dialog"]').contains('button', 'Excluir').click()

    cy.contains('[data-cy="validated-script-row"]', `${RUN_ID} Roteiro Removido`, { timeout: 15000 }).should('not.exist')
    cy.get('[data-cy="validated-scripts-stat-total-value"]').should('have.text', '0')
  })

  it('CT05 busca roteiro por palavra-chave', () => {
    const client = {
      id: `${RUN_ID}-client-search`,
      client_name: `${RUN_ID} Cliente Busca`,
      clinic_name: 'Clínica Busca',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({
      clients: [client],
      scripts: [
        {
          id: `${RUN_ID}-script-search-1`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro Conversão`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'Conversão',
          content: 'Script para conversão e fechamento.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
        {
          id: `${RUN_ID}-script-search-2`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro Autoridade`,
          script_date: toDateValue(now),
          format: 'Stories',
          category: 'Autoridade',
          content: 'Script de posicionamento da marca.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
      ],
    })

    cy.get('[data-cy="validated-scripts-search"]').clear().type('conversão')
    cy.contains('[data-cy="validated-script-row"]', `${RUN_ID} Roteiro Conversão`).should('be.visible')
    cy.contains('[data-cy="validated-script-row"]', `${RUN_ID} Roteiro Autoridade`).should('not.exist')
  })

  it('CT06 filtra os roteiros por cliente', () => {
    const clientA = {
      id: `${RUN_ID}-client-a`,
      client_name: `${RUN_ID} Cliente A`,
      clinic_name: 'Clínica A',
      status_operacional: 'ATIVO',
    }
    const clientB = {
      id: `${RUN_ID}-client-b`,
      client_name: `${RUN_ID} Cliente B`,
      clinic_name: 'Clínica B',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({
      clients: [clientA, clientB],
      scripts: [
        {
          id: `${RUN_ID}-script-client-a`,
          client_id: clientA.id,
          title: `${RUN_ID} Roteiro A`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'Captação',
          content: 'Conteúdo do cliente A.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
        {
          id: `${RUN_ID}-script-client-b`,
          client_id: clientB.id,
          title: `${RUN_ID} Roteiro B`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'Autoridade',
          content: 'Conteúdo do cliente B.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
      ],
    })

    cy.get('[data-cy="validated-scripts-client-filter"]').click()
    cy.contains('[role="option"]', clientLabel(clientB)).click()

    cy.contains('[data-cy="validated-script-row"]', `${RUN_ID} Roteiro B`).should('be.visible')
    cy.contains('[data-cy="validated-script-row"]', `${RUN_ID} Roteiro A`).should('not.exist')
  })

  it('CT07 filtra a listagem por mês', () => {
    const client = {
      id: `${RUN_ID}-client-month`,
      client_name: `${RUN_ID} Cliente Mês`,
      clinic_name: 'Clínica Mês',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({
      clients: [client],
      scripts: [
        {
          id: `${RUN_ID}-script-current-month`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro Atual`,
          script_date: toDateValue(monthDate(0, 10)),
          format: 'Reels',
          category: 'Atual',
          content: 'Roteiro do mês atual.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
        {
          id: `${RUN_ID}-script-previous-month`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro Anterior`,
          script_date: toDateValue(monthDate(-1, 10)),
          format: 'Reels',
          category: 'Anterior',
          content: 'Roteiro do mês anterior.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
      ],
    })

    cy.get('[data-cy="validated-scripts-month-filter"]')
      .invoke('val', previousMonth)
      .trigger('input')
      .trigger('change')

    cy.contains('[data-cy="validated-script-row"]', `${RUN_ID} Roteiro Anterior`).should('be.visible')
    cy.contains('[data-cy="validated-script-row"]', `${RUN_ID} Roteiro Atual`).should('not.exist')

    cy.get('[data-cy="validated-scripts-month-filter"]')
      .invoke('val', currentMonth)
      .trigger('input')
      .trigger('change')

    cy.contains('[data-cy="validated-script-row"]', `${RUN_ID} Roteiro Atual`).should('be.visible')
  })

  it('CT08 atualiza o contador total de roteiros', () => {
    const client = {
      id: `${RUN_ID}-client-counter`,
      client_name: `${RUN_ID} Cliente Contador`,
      clinic_name: 'Clínica Contador',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({
      clients: [client],
      scripts: [
        {
          id: `${RUN_ID}-script-count-1`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro 1`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'A',
          content: '1',
          document_name: null,
          document_url: null,
          document_path: null,
        },
        {
          id: `${RUN_ID}-script-count-2`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro 2`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'B',
          content: '2',
          document_name: null,
          document_url: null,
          document_path: null,
        },
        {
          id: `${RUN_ID}-script-count-3`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro 3`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'C',
          content: '3',
          document_name: null,
          document_url: null,
          document_path: null,
        },
      ],
    })

    cy.get('[data-cy="validated-scripts-stat-total-value"]').should('have.text', '3')
  })

  it('CT09 atualiza o contador de roteiros com arquivo', () => {
    const client = {
      id: `${RUN_ID}-client-files`,
      client_name: `${RUN_ID} Cliente Arquivo`,
      clinic_name: 'Clínica Arquivo',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({
      clients: [client],
      scripts: [
        {
          id: `${RUN_ID}-script-file-1`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro com arquivo`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'Arquivo',
          content: 'Tem arquivo anexado.',
          document_name: 'arquivo.pdf',
          document_url: 'https://example.com/arquivo.pdf',
          document_path: null,
        },
        {
          id: `${RUN_ID}-script-file-2`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro sem arquivo`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'Sem arquivo',
          content: 'Sem anexo.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
      ],
    })

    cy.get('[data-cy="validated-scripts-stat-files-value"]').should('have.text', '1')
  })

  it('CT10 atualiza o contador de clientes únicos', () => {
    const clientA = {
      id: `${RUN_ID}-client-unique-a`,
      client_name: `${RUN_ID} Cliente Único A`,
      clinic_name: 'Clínica Única A',
      status_operacional: 'ATIVO',
    }
    const clientB = {
      id: `${RUN_ID}-client-unique-b`,
      client_name: `${RUN_ID} Cliente Único B`,
      clinic_name: 'Clínica Única B',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({
      clients: [clientA, clientB],
      scripts: [
        {
          id: `${RUN_ID}-script-unique-1`,
          client_id: clientA.id,
          title: `${RUN_ID} Roteiro Cliente A`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'A',
          content: 'Conteúdo A.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
        {
          id: `${RUN_ID}-script-unique-2`,
          client_id: clientB.id,
          title: `${RUN_ID} Roteiro Cliente B`,
          script_date: toDateValue(now),
          format: 'Stories',
          category: 'B',
          content: 'Conteúdo B.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
      ],
    })

    cy.get('[data-cy="validated-scripts-stat-clients-value"]').should('have.text', '2')
  })

  it('CT11 persiste após refresh', () => {
    const client = {
      id: `${RUN_ID}-client-persist`,
      client_name: `${RUN_ID} Cliente Persistência`,
      clinic_name: 'Clínica Persistência',
      status_operacional: 'ATIVO',
    }
    const title = `${RUN_ID} Roteiro Persistente`

    visitRoteirosValidados({ clients: [client], scripts: [] })

    openCreateDialog()
    fillScriptDialog({
      client: clientLabel(client),
      title,
      date: toDateValue(now),
      category: 'Persistência',
      content: 'Conteúdo que precisa sobreviver ao refresh.',
    })
    saveDialog()

    openRow(title)
    cy.reload()
    openRow(title)
  })

  it('CT12 sincroniza alterações entre visitas simuladas', () => {
    const client = {
      id: `${RUN_ID}-client-sync`,
      client_name: `${RUN_ID} Cliente Sincronização`,
      clinic_name: 'Clínica Sincronização',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({
      clients: [client],
      scripts: [
        {
          id: `${RUN_ID}-script-sync-1`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro Base`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'Base',
          content: 'Base inicial.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
      ],
    })

    cy.window().then((win) => {
      updateTable(win, 'validated_scripts', (rows) => [
        ...rows,
        {
          id: `${RUN_ID}-script-sync-2`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro Sincronizado`,
          script_date: toDateValue(now),
          format: 'Stories',
          category: 'Sincronização',
          content: 'Novo item vindo de outra sessão.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
      ])
    })

    visitRoteirosValidados({}, { preserveStorage: true })
    openRow(`${RUN_ID} Roteiro Sincronizado`)
  })

  it('CT13 faz upload de PDF e expõe o anexo no roteiro', () => {
    const client = {
      id: `${RUN_ID}-client-upload`,
      client_name: `${RUN_ID} Cliente Upload`,
      clinic_name: 'Clínica Upload',
      status_operacional: 'ATIVO',
    }
    const title = `${RUN_ID} Roteiro com PDF`

    visitRoteirosValidados({ clients: [client], scripts: [] })

    openCreateDialog()
    fillScriptDialog({
      client: clientLabel(client),
      title,
      date: toDateValue(now),
      category: 'Anexo',
      content: 'Conteúdo com arquivo PDF.',
    })

    cy.get('[data-cy="validated-script-upload-button"]').click()
    cy.get('[data-cy="validated-script-file-input"]').selectFile(
      {
        contents: Cypress.Buffer.from('%PDF-1.4\n% Teste de PDF do Cypress'),
        fileName: `${RUN_ID}.pdf`,
        mimeType: 'application/pdf',
      },
      { force: true },
    )

    saveDialog()

    openRow(title)
    clickRowAction(title, 'validated-script-view')
    cy.get('[data-cy="validated-script-view-dialog"]').contains('Abrir documento anexado').should('be.visible')
  })

  it('CT14 valida campos obrigatórios antes de salvar', () => {
    const client = {
      id: `${RUN_ID}-client-required`,
      client_name: `${RUN_ID} Cliente Obrigatório`,
      clinic_name: 'Clínica Obrigatória',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({ clients: [client], scripts: [] })

    openCreateDialog()
    fillScriptDialog({
      client: clientLabel(client),
      title: '',
      date: toDateValue(now),
      content: 'Conteúdo provisório.',
    })
    saveDialog()
    cy.contains('Informe um título para o roteiro.').should('be.visible')

    fillScriptDialog({
      title: `${RUN_ID} Roteiro Vazio`,
      content: '',
    })
    saveDialog()
    cy.contains('O conteúdo do roteiro é obrigatório.').should('be.visible')
  })

  it('CT15 mostra estado vazio quando não há roteiros', () => {
    const client = {
      id: `${RUN_ID}-client-empty`,
      client_name: `${RUN_ID} Cliente Vazio`,
      clinic_name: 'Clínica Vazia',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({ clients: [client], scripts: [] })

    cy.get('[data-cy="validated-scripts-empty"]').should('be.visible')
    cy.contains('Nenhum roteiro encontrado').should('be.visible')
  })

  it('CT16 isola os dados entre usuários simulados', () => {
    const client = {
      id: `${RUN_ID}-client-permission`,
      client_name: `${RUN_ID} Cliente Permissão`,
      clinic_name: 'Clínica Permissão',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({
      user: USER_A,
      clients: [client],
      scripts: [
        {
          id: `${RUN_ID}-script-user-a`,
          client_id: client.id,
          title: `${RUN_ID} Conteúdo Usuário A`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'Usuário A',
          content: 'Dados do usuário A.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
      ],
    })

    openRow(`${RUN_ID} Conteúdo Usuário A`)

    visitRoteirosValidados({
      user: USER_B,
      clients: [client],
      scripts: [
        {
          id: `${RUN_ID}-script-user-b`,
          client_id: client.id,
          title: `${RUN_ID} Conteúdo Usuário B`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'Usuário B',
          content: 'Dados do usuário B.',
          document_name: null,
          document_url: null,
          document_path: null,
        },
      ],
    })

    openRow(`${RUN_ID} Conteúdo Usuário B`)
    cy.contains('[data-cy="validated-script-row"]', `${RUN_ID} Conteúdo Usuário A`).should('not.exist')
  })

  it('CT17 remove vários roteiros de uma vez e mantém a base sincronizada', () => {
    const client = {
      id: `${RUN_ID}-client-bulk`,
      client_name: `${RUN_ID} Cliente Lote`,
      clinic_name: 'Clínica Lote',
      status_operacional: 'ATIVO',
    }

    visitRoteirosValidados({
      clients: [client],
      scripts: [
        {
          id: `${RUN_ID}-script-bulk-1`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro 1`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'Lote',
          content: '1',
          document_name: null,
          document_url: null,
          document_path: null,
        },
        {
          id: `${RUN_ID}-script-bulk-2`,
          client_id: client.id,
          title: `${RUN_ID} Roteiro 2`,
          script_date: toDateValue(now),
          format: 'Reels',
          category: 'Lote',
          content: '2',
          document_name: null,
          document_url: null,
          document_path: null,
        },
      ],
    })

    cy.window().then((win) => {
      updateTable(win, 'validated_scripts', (rows) => rows.filter((row) => ![`${RUN_ID}-script-bulk-1`, `${RUN_ID}-script-bulk-2`].includes(row.id)))
    })

    cy.reload()
    cy.get('[data-cy="validated-scripts-empty"]').should('be.visible')
    cy.get('[data-cy="validated-scripts-stat-total-value"]').should('have.text', '0')
  })

  it('CT18 cobre o fluxo completo de CRUD', () => {
    const client = {
      id: `${RUN_ID}-client-crud`,
      client_name: `${RUN_ID} Cliente CRUD`,
      clinic_name: 'Clínica CRUD',
      status_operacional: 'ATIVO',
    }
    const title = `${RUN_ID} Roteiro CRUD`

    visitRoteirosValidados({ clients: [client], scripts: [] })

    openCreateDialog()
    fillScriptDialog({
      client: clientLabel(client),
      title,
      date: toDateValue(now),
      category: 'CRUD',
      content: 'Fluxo completo de criação.',
    })
    saveDialog()

    openRow(title)

    clickRowAction(title, 'validated-script-edit')
    fillScriptDialog({
      title: `${RUN_ID} Roteiro CRUD Atualizado`,
      content: 'Fluxo completo com edição.',
    })
    saveDialog()
    openRow(`${RUN_ID} Roteiro CRUD Atualizado`)

    clickRowAction(`${RUN_ID} Roteiro CRUD Atualizado`, 'validated-script-view')
    cy.get('[data-cy="validated-script-view-dialog"]').contains('Fluxo completo com edição.').should('be.visible')

    clickRowAction(`${RUN_ID} Roteiro CRUD Atualizado`, 'validated-script-delete')
    cy.get('[data-cy="validated-script-delete-dialog"]').contains('button', 'Excluir').click()

    cy.contains('[data-cy="validated-script-row"]', `${RUN_ID} Roteiro CRUD Atualizado`, { timeout: 15000 }).should('not.exist')
    cy.reload()
    cy.contains('[data-cy="validated-script-row"]', `${RUN_ID} Roteiro CRUD Atualizado`, { timeout: 15000 }).should('not.exist')
  })
})
