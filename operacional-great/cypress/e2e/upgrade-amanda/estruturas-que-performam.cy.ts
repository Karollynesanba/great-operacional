/// <reference types="cypress" />
export {}

const RUN_ID = `CY-EP-${Date.now()}`
const MOCK_OPERATIONAL_SEED_VERSION = 'operacional-estruturas-performam-cypress-v1'

const ADMIN_USER = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

const now = new Date()

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function monthDate(monthOffset: number, day: number) {
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, day, 12, 0, 0, 0)
}

function clientLabel(client: { client_name: string; clinic_name?: string | null }) {
  return client.clinic_name ? `${client.client_name} - ${client.clinic_name}` : client.client_name
}

type ClientRow = {
  id: string
  client_name: string
  clinic_name: string | null
  status_operacional?: string | null
  onboarding_stage?: string | null
  team_id?: string | null
}

type StructureRow = {
  id: string
  client_id: string
  profile_id: string | null
  title: string
  structure_type: string
  category: string
  description: string | null
  usage_count: number
  views_count: number
  engagement_rate: number
  saves_count: number
  reference_date: string
  asset_kind: 'image' | 'video' | 'file' | null
  asset_url: string | null
  asset_path: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
  operational_clients?: {
    id: string
    client_name: string
    clinic_name: string | null
  } | null
}

type StructureSeed = {
  user?: typeof ADMIN_USER
  clients?: ClientRow[]
  structures?: StructureRow[]
}

function makeStructure(seed: {
  id: string
  client: ClientRow
  title: string
  structureType: string
  category: string
  description?: string | null
  usageCount?: number
  viewsCount?: number
  engagementRate?: number
  savesCount?: number
  referenceDate: Date
  assetKind?: 'image' | 'video' | 'file' | null
  assetUrl?: string | null
  assetPath?: string | null
  isFavorite?: boolean
}): StructureRow {
  return {
    id: seed.id,
    client_id: seed.client.id,
    profile_id: null,
    title: seed.title,
    structure_type: seed.structureType,
    category: seed.category,
    description: seed.description ?? null,
    usage_count: seed.usageCount ?? 0,
    views_count: seed.viewsCount ?? 0,
    engagement_rate: seed.engagementRate ?? 0,
    saves_count: seed.savesCount ?? 0,
    reference_date: toDateValue(seed.referenceDate),
    asset_kind: seed.assetKind ?? 'image',
    asset_url: seed.assetUrl ?? null,
    asset_path: seed.assetPath ?? null,
    is_favorite: seed.isFavorite ?? false,
    created_at: seed.referenceDate.toISOString(),
    updated_at: seed.referenceDate.toISOString(),
    operational_clients: {
      id: seed.client.id,
      client_name: seed.client.client_name,
      clinic_name: seed.client.clinic_name,
    },
  }
}

function seedStructures(win: Window, seed: StructureSeed = {}) {
  const user = seed.user ?? ADMIN_USER

  win.localStorage.clear()
  win.localStorage.setItem('great_user', JSON.stringify(user))
  win.localStorage.setItem('great_users', JSON.stringify([user]))
  win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
  win.localStorage.setItem('mock_db_seed_version', MOCK_OPERATIONAL_SEED_VERSION)
  win.localStorage.setItem('mock_db_operational_clients', JSON.stringify(seed.clients ?? []))
  win.localStorage.setItem('mock_db_performance_structures', JSON.stringify(seed.structures ?? []))
}

function visitStructures(seed: StructureSeed = {}, options: { preserveStorage?: boolean } = {}) {
  cy.visit('/operacional/upgrade-de-amanda/estruturas-que-performam', {
    onBeforeLoad(win) {
      if (!options.preserveStorage) {
        seedStructures(win, seed)
      }
    },
  })

  cy.contains('h1', 'Estruturas que Performam', { timeout: 15000 }).should('be.visible')
  cy.get('[data-cy="performance-structures-page"]').should('be.visible')
}

type TableRow = Record<string, unknown>

function updateTable(win: Window, table: string, updater: (rows: TableRow[]) => TableRow[]) {
  const key = `mock_db_${table}`
  const rows = JSON.parse(win.localStorage.getItem(key) || '[]') as TableRow[]
  win.localStorage.setItem(key, JSON.stringify(updater(rows)))
}

function openSelect(trigger: string, optionText: string) {
  cy.get(trigger).click()
  cy.contains('[role="option"]', optionText).click()
}

function fillStructureForm(values: {
  client: string
  title: string
  structureType?: string
  category: string
  description: string
  referenceDate?: string
  assetKind?: string
  assetUrl?: string
  usageCount?: string
  viewsCount?: string
  engagementRate?: string
  savesCount?: string
}) {
  openSelect('[data-cy="structures-client-select"]', values.client)
  cy.get('[data-cy="structures-title-input"]').clear().type(values.title)

  if (values.structureType) {
    openSelect('[data-cy="structures-type-select"]', values.structureType)
  }

  cy.get('[data-cy="structures-category-input"]').clear().type(values.category)
  cy.get('[data-cy="structures-description-input"]').clear().type(values.description)

  if (values.referenceDate) {
    cy.get('[data-cy="structures-date-input"]').clear().type(values.referenceDate)
  }

  if (values.assetKind) {
    openSelect('[data-cy="structures-asset-kind-select"]', values.assetKind)
  }

  if (values.assetUrl !== undefined) {
    cy.get('[data-cy="structures-asset-url"]').clear().type(values.assetUrl)
  }

  if (values.usageCount !== undefined) {
    cy.get('[data-cy="structures-usage-input"]').clear().type(values.usageCount)
  }

  if (values.viewsCount !== undefined) {
    cy.get('[data-cy="structures-views-input"]').clear().type(values.viewsCount)
  }

  if (values.engagementRate !== undefined) {
    cy.get('[data-cy="structures-engagement-input"]').clear().type(values.engagementRate)
  }

  if (values.savesCount !== undefined) {
    cy.get('[data-cy="structures-saves-input"]').clear().type(values.savesCount)
  }
}

function clickRowAction(title: string, actionCy: string) {
  cy.contains('[data-cy="structure-row"]', title).should('be.visible').within(() => {
    cy.get(`[data-cy="${actionCy}"]`).click()
  })
}

describe('Upgrade Amanda - Estruturas que Performam', () => {
  const clientA: ClientRow = {
    id: `${RUN_ID}-client-a`,
    client_name: 'Cliente Alpha',
    clinic_name: 'Clínica Alpha',
    status_operacional: 'ATIVO',
    onboarding_stage: 'ATIVO',
    team_id: null,
  }
  const clientB: ClientRow = {
    id: `${RUN_ID}-client-b`,
    client_name: 'Cliente Beta',
    clinic_name: 'Clínica Beta',
    status_operacional: 'ATIVO',
    onboarding_stage: 'ATIVO',
    team_id: null,
  }
  const clientC: ClientRow = {
    id: `${RUN_ID}-client-c`,
    client_name: 'Cliente Gama',
    clinic_name: 'Clínica Gama',
    status_operacional: 'ATIVO',
    onboarding_stage: 'ATIVO',
    team_id: null,
  }

  const baseStructures = [
    makeStructure({
      id: `${RUN_ID}-structure-a`,
      client: clientA,
      title: `${RUN_ID} Estrutura Alpha`,
      structureType: 'Roteiro',
      category: 'Conversão',
      description: 'Estrutura principal para teste de criação e edição.',
      usageCount: 4,
      viewsCount: 10,
      engagementRate: 12.5,
      savesCount: 2,
      referenceDate: monthDate(0, 3),
      assetKind: 'image',
    }),
    makeStructure({
      id: `${RUN_ID}-structure-b`,
      client: clientA,
      title: `${RUN_ID} Estrutura Beta`,
      structureType: 'Hook',
      category: 'Abertura',
      description: 'Estrutura marcada como favorita.',
      usageCount: 3,
      viewsCount: 20,
      engagementRate: 8,
      savesCount: 1,
      referenceDate: monthDate(0, 10),
      assetKind: 'video',
      isFavorite: true,
    }),
    makeStructure({
      id: `${RUN_ID}-structure-c`,
      client: clientB,
      title: `${RUN_ID} Estrutura Gamma`,
      structureType: 'Criativo',
      category: 'Campanha',
      description: 'Estrutura para filtro por cliente e tipo.',
      usageCount: 1,
      viewsCount: 5,
      engagementRate: 7.5,
      savesCount: 0,
      referenceDate: monthDate(0, 15),
      assetKind: 'file',
    }),
    makeStructure({
      id: `${RUN_ID}-structure-old`,
      client: clientC,
      title: `${RUN_ID} Estrutura Antiga`,
      structureType: 'Modelo de Conteúdo',
      category: 'Arquivo',
      description: 'Fica no mês anterior para testar o filtro temporal.',
      usageCount: 2,
      viewsCount: 30,
      engagementRate: 20,
      savesCount: 3,
      referenceDate: monthDate(-1, 20),
      assetKind: 'image',
    }),
  ]

  beforeEach(() => {
    cy.viewport(1440, 900)
  })

  it('CT01 adiciona nova estrutura', () => {
    visitStructures({
      clients: [clientA, clientB, clientC],
      structures: baseStructures,
    })

    cy.get('[data-cy="structures-stat-total-value"]').should('have.text', '4')

    cy.get('[data-cy="performance-structures-create"]').click()
    cy.get('[data-cy="structures-dialog"]').should('be.visible')

    fillStructureForm({
      client: clientLabel(clientB),
      title: `${RUN_ID} Estrutura Nova`,
      structureType: 'Roteiro',
      category: 'Lançamento',
      description: 'Cadastro de teste para validar criação.',
      referenceDate: toDateValue(now),
      assetKind: 'image',
      assetUrl: 'https://example.com/referencia-nova',
      usageCount: '5',
      viewsCount: '11',
      engagementRate: '14.5',
      savesCount: '3',
    })

    cy.get('[data-cy="structures-submit"]').click()
    cy.contains('[data-cy="structure-row"]', `${RUN_ID} Estrutura Nova`).should('be.visible')
    cy.get('[data-cy="structures-stat-total-value"]').should('have.text', '5')
  })

  it('CT03 edita estrutura existente', () => {
    visitStructures({
      clients: [clientA, clientB, clientC],
      structures: baseStructures,
    })

    clickRowAction(`${RUN_ID} Estrutura Alpha`, 'structure-edit')
    cy.get('[data-cy="structures-dialog"]').should('be.visible')

    cy.get('[data-cy="structures-title-input"]').clear().type(`${RUN_ID} Estrutura Alpha Editada`)
    cy.get('[data-cy="structures-category-input"]').clear().type('Conversão Alta')
    cy.get('[data-cy="structures-submit"]').click()

    cy.contains('[data-cy="structure-row"]', `${RUN_ID} Estrutura Alpha Editada`).should('be.visible')
    cy.contains('[data-cy="structure-row"]', 'Conversão Alta').should('be.visible')
  })

  it('CT05 busca estrutura por nome', () => {
    visitStructures({
      clients: [clientA, clientB, clientC],
      structures: baseStructures,
    })

    cy.get('[data-cy="structures-search"]').type('Gamma')
    cy.get('[data-cy="structure-row"]').should('have.length', 1)
    cy.contains('[data-cy="structure-row"]', `${RUN_ID} Estrutura Gamma`).should('be.visible')
  })

  it('CT06 filtra por cliente', () => {
    visitStructures({
      clients: [clientA, clientB, clientC],
      structures: baseStructures,
    })

    openSelect('[data-cy="structures-client-filter"]', clientLabel(clientB))
    cy.get('[data-cy="structure-row"]').should('have.length', 1)
    cy.contains('[data-cy="structure-row"]', `${RUN_ID} Estrutura Gamma`).should('be.visible')
  })

  it('CT08 filtra por categoria e tipo', () => {
    visitStructures({
      clients: [clientA, clientB, clientC],
      structures: baseStructures,
    })

    openSelect('[data-cy="structures-type-filter"]', 'Hook')
    cy.get('[data-cy="structure-row"]').should('have.length', 1)
    cy.contains('[data-cy="structure-row"]', `${RUN_ID} Estrutura Beta`).should('be.visible')
  })

  it('CT09 mostra contador de estruturas publicadas', () => {
    visitStructures({
      clients: [clientA, clientB, clientC],
      structures: baseStructures,
    })

    cy.get('[data-cy="structures-stat-total-value"]').should('have.text', '4')
  })

  it('CT10 atualiza o contador de visualizações', () => {
    visitStructures({
      clients: [clientA, clientB, clientC],
      structures: baseStructures,
    })

    cy.get('[data-cy="structures-stat-views-value"]').should('have.text', '65')
  })

  it('CT12 salva exemplo de vídeo por link', () => {
    visitStructures({
      clients: [clientA, clientB, clientC],
      structures: baseStructures,
    })

    cy.get('[data-cy="performance-structures-create"]').click()
    fillStructureForm({
      client: clientLabel(clientA),
      title: `${RUN_ID} Estrutura Vídeo`,
      structureType: 'Roteiro',
      category: 'Vídeo',
      description: 'Referência de vídeo vinculada à estrutura.',
      referenceDate: toDateValue(now),
      assetKind: 'video',
      assetUrl: 'https://example.com/video-referencia.mp4',
    })
    cy.get('[data-cy="structures-submit"]').click()

    cy.contains('[data-cy="structure-row"]', `${RUN_ID} Estrutura Vídeo`).should('be.visible')
    clickRowAction(`${RUN_ID} Estrutura Vídeo`, 'structure-view')
    cy.contains('[data-cy="structures-view-dialog"]', 'Abrir arquivo').should('be.visible')
    cy.get('[data-cy="structures-view-close"]').click()
  })

  it('CT13 faz upload de arquivo e mantém o anexo disponível', () => {
    visitStructures({
      clients: [clientA, clientB, clientC],
      structures: baseStructures,
    })

    cy.get('[data-cy="performance-structures-create"]').click()
    fillStructureForm({
      client: clientLabel(clientB),
      title: `${RUN_ID} Estrutura Upload`,
      structureType: 'Criativo',
      category: 'Upload',
      description: 'Teste de upload de arquivo.',
      referenceDate: toDateValue(now),
      assetKind: 'file',
    })

    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('arquivo de teste'),
        fileName: 'referencia-estrutura.txt',
        mimeType: 'text/plain',
        lastModified: Date.now(),
      },
      { force: true },
    )

    cy.get('[data-cy="structures-submit"]').click()
    cy.contains('[data-cy="structure-row"]', `${RUN_ID} Estrutura Upload`).should('be.visible')
    clickRowAction(`${RUN_ID} Estrutura Upload`, 'structure-view')
    cy.contains('[data-cy="structures-view-dialog"]', 'Abrir arquivo').should('be.visible')
    cy.get('[data-cy="structures-view-close"]').click()
  })

  it('CT15 marca estrutura como favorita e filtra favoritas', () => {
    visitStructures({
      clients: [clientA, clientB, clientC],
      structures: baseStructures,
    })

    clickRowAction(`${RUN_ID} Estrutura Gamma`, 'structure-favorite')
    openSelect('[data-cy="structures-favorite-filter"]', 'Somente favoritas')
    cy.get('[data-cy="structure-row"]').should('have.length', 2)
    cy.contains('[data-cy="structure-row"]', `${RUN_ID} Estrutura Beta`).should('be.visible')
    cy.contains('[data-cy="structure-row"]', `${RUN_ID} Estrutura Gamma`).should('be.visible')
  })

  it('CT16 mantém os dados após refresh', () => {
    visitStructures({
      clients: [clientA, clientB, clientC],
      structures: baseStructures,
    })

    cy.reload()
    cy.get('[data-cy="structure-row"]').should('have.length', 4)
    cy.contains('[data-cy="structure-row"]', `${RUN_ID} Estrutura Alpha`).should('be.visible')
  })

  it('CT17 sincroniza alterações entre visitas/dispositivos simulados', () => {
    visitStructures({
      clients: [clientA, clientB, clientC],
      structures: baseStructures,
    })

    cy.window().then((win) => {
      updateTable(win, 'performance_structures', (rows) => [
        ...rows,
        makeStructure({
          id: `${RUN_ID}-structure-sync`,
          client: clientC,
          title: `${RUN_ID} Estrutura Sincronizada`,
          structureType: 'Hook',
          category: 'Tempo Real',
          description: 'Criada em outro dispositivo.',
          usageCount: 1,
          viewsCount: 2,
          engagementRate: 9.5,
          savesCount: 1,
          referenceDate: monthDate(0, 16),
          assetKind: 'image',
        }),
      ])
    })

    cy.reload()
    cy.contains('[data-cy="structure-row"]', `${RUN_ID} Estrutura Sincronizada`).should('be.visible')
  })

  it('CT20 executa CRUD completo da aba', () => {
    visitStructures({
      clients: [clientA, clientB, clientC],
      structures: baseStructures,
    })

    cy.get('[data-cy="performance-structures-create"]').click()
    fillStructureForm({
      client: clientLabel(clientA),
      title: `${RUN_ID} Estrutura CRUD`,
      structureType: 'Roteiro',
      category: 'Fluxo',
      description: 'Fluxo completo de CRUD para a aba.',
      referenceDate: toDateValue(now),
      assetKind: 'image',
      assetUrl: 'https://example.com/crud.png',
      usageCount: '2',
      viewsCount: '9',
      engagementRate: '13.3',
      savesCount: '1',
    })
    cy.get('[data-cy="structures-submit"]').click()

    clickRowAction(`${RUN_ID} Estrutura CRUD`, 'structure-view')
    cy.contains('[data-cy="structures-view-dialog"]', `${RUN_ID} Estrutura CRUD`).should('be.visible')
    cy.get('[data-cy="structures-view-close"]').click()

    clickRowAction(`${RUN_ID} Estrutura CRUD`, 'structure-edit')
    cy.get('[data-cy="structures-title-input"]').clear().type(`${RUN_ID} Estrutura CRUD Editada`)
    cy.get('[data-cy="structures-submit"]').click()

    cy.contains('[data-cy="structure-row"]', `${RUN_ID} Estrutura CRUD Editada`).should('be.visible')
    cy.get('[data-cy="structure-row"]').then(($rows) => {
      expect($rows.length).to.be.greaterThan(0)
    })

    clickRowAction(`${RUN_ID} Estrutura CRUD Editada`, 'structure-delete')
    cy.get('[data-cy="structures-delete-confirm"]').click()
    cy.contains('[data-cy="structure-row"]', `${RUN_ID} Estrutura CRUD Editada`).should('not.exist')
  })
})
