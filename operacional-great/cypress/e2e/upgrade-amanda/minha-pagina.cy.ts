/// <reference types="cypress" />
export {}

const RUN_ID = `CY-MP-${Date.now()}`
const MOCK_OPERATIONAL_SEED_VERSION = 'operacional-pipeline-criativos-v11'

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

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

type MyPageSeed = {
  user?: typeof ADMIN_USER
  scripts?: Array<Record<string, unknown>>
  recordings?: Array<Record<string, unknown>>
  structures?: Array<Record<string, unknown>>
  files?: Array<Record<string, unknown>>
}

function seedMyPage(win: Window, seed: MyPageSeed = {}) {
  const user = seed.user ?? ADMIN_USER

  win.localStorage.clear()
  win.localStorage.setItem('great_user', JSON.stringify(user))
  win.localStorage.setItem('great_users', JSON.stringify([user]))
  win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
  win.localStorage.setItem('mock_db_seed_version', MOCK_OPERATIONAL_SEED_VERSION)
  win.localStorage.setItem('mock_db_validated_scripts', JSON.stringify(seed.scripts ?? []))
  win.localStorage.setItem('mock_db_calendar_recordings', JSON.stringify(seed.recordings ?? []))
  win.localStorage.setItem('mock_db_performance_structures', JSON.stringify(seed.structures ?? []))
  win.localStorage.setItem('mock_db_brand_files', JSON.stringify(seed.files ?? []))
}

function visitMyPage(seed: MyPageSeed = {}, options: { preserveStorage?: boolean } = {}) {
  cy.visit('/operacional/upgrade-de-amanda/minha-pagina', {
    onBeforeLoad(win) {
      if (!options.preserveStorage) {
        seedMyPage(win, seed)
      }
    },
  })

  cy.contains('h1', 'Minha Página', { timeout: 15000 }).should('be.visible')
  cy.get('[data-cy="upgrade-amanda-minha-pagina"]').should('be.visible')
}

function clickShortcutCard(cardKey: string, buttonText: RegExp) {
  cy.get(`[data-cy="shortcut-card-${cardKey}"]`).should('be.visible').within(() => {
    cy.contains('button', buttonText).click()
  })
}

function tableCellValue(index: number) {
  return cy.get(`[data-cy="summary-value-${index}"]`)
}

function updateTable(win: Window, table: string, updater: (rows: any[]) => any[]) {
  const key = `mock_db_${table}`
  const rows = JSON.parse(win.localStorage.getItem(key) || '[]')
  win.localStorage.setItem(key, JSON.stringify(updater(rows)))
}

describe('Upgrade Amanda - Minha Página', () => {
  beforeEach(() => {
    cy.viewport(1440, 900)
  })

  it('CT01 navega para Identidade / Paleta', () => {
    visitMyPage()
    clickShortcutCard('paleta', /Ver identidade \(paleta\)/i)
    cy.url().should('include', '/operacional/upgrade-de-amanda/identidade-paleta')
    cy.contains('h1', 'Identidade / Paleta', { timeout: 15000 }).should('be.visible')
  })

  it('CT02 navega para Roteiros Validados', () => {
    visitMyPage()
    clickShortcutCard('validados', /Ver roteiros validados/i)
    cy.url().should('include', '/operacional/upgrade-de-amanda/roteiros-validados')
    cy.contains('h1', 'Roteiros Validados', { timeout: 15000 }).should('be.visible')
  })

  it('CT03 navega para Calendário de Gravação', () => {
    visitMyPage()
    clickShortcutCard('gravacao', /Ver calendário de gravação/i)
    cy.url().should('include', '/operacional/upgrade-de-amanda/calendario-de-gravacao')
    cy.contains('h1', 'Calendário de Gravação', { timeout: 15000 }).should('be.visible')
  })

  it('CT04 navega para Estruturas que Performam', () => {
    visitMyPage()
    clickShortcutCard('performam', /Ver estruturas que performam/i)
    cy.url().should('include', '/operacional/upgrade-de-amanda/estruturas-que-performam')
    cy.contains('h1', 'Estruturas que Performam', { timeout: 15000 }).should('be.visible')
  })

  it('CT05 navega para Modelos Prontos', () => {
    visitMyPage()
    clickShortcutCard('prontos', /Ver modelos prontos/i)
    cy.url().should('include', '/operacional/upgrade-de-amanda/modelos-prontos')
    cy.contains('h1', 'Modelos Prontos', { timeout: 15000 }).should('be.visible')
  })

  it('CT06 atualiza o indicador de roteiros validados ao inserir um novo item', () => {
    visitMyPage({
      scripts: [
        { id: `${RUN_ID}-script-1`, title: `${RUN_ID} Roteiro 1`, created_at: isoHoursAgo(4) },
      ],
    })

    tableCellValue(0).should('have.text', '1')

    cy.window().then((win) => {
      updateTable(win, 'validated_scripts', (rows) => [
        ...rows,
        { id: `${RUN_ID}-script-2`, title: `${RUN_ID} Roteiro 2`, created_at: isoHoursAgo(1) },
      ])
    })

    cy.reload()
    tableCellValue(0).should('have.text', '2')
  })

  it('CT07 exibe a nova atividade recente após adicionar um conteúdo', () => {
    visitMyPage()
    cy.get('[data-cy="my-page-recent-activities"]').find('[data-cy="recent-activity-item"]').should('have.length', 0)

    cy.window().then((win) => {
      updateTable(win, 'validated_scripts', (rows) => [
        ...rows,
        { id: `${RUN_ID}-recent-script`, title: `${RUN_ID} Roteiro Recente`, created_at: isoHoursAgo(1) },
      ])
    })

    cy.reload()
    cy.get('[data-cy="my-page-recent-activities"]').find('[data-cy="recent-activity-item"]').should('have.length', 1)
    cy.contains('[data-cy="my-page-recent-activities"]', `${RUN_ID} Roteiro Recente`).should('be.visible')
  })

  it('CT08 exibe uma gravação futura em Próximas gravações', () => {
    visitMyPage()

    cy.window().then((win) => {
      updateTable(win, 'calendar_recordings', (rows) => [
        ...rows,
        {
          id: `${RUN_ID}-recording-1`,
          recording_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          recording_time: '14:00',
          recording_type: 'Sessão QA',
          location: 'Estúdio Cypress',
          status: 'AGENDADA',
          created_at: isoHoursAgo(1),
          operational_clients: {
            id: `${RUN_ID}-client-1`,
            client_name: `${RUN_ID} Cliente Gravação`,
            clinic_name: 'Clínica QA',
          },
        },
      ])
    })

    cy.reload()
    cy.get('[data-cy="my-page-upcoming-recordings"]').find('[data-cy="upcoming-recording-item"]').should('have.length', 1)
    cy.contains('[data-cy="my-page-upcoming-recordings"]', `${RUN_ID} Cliente Gravação`).should('be.visible')
  })

  it('CT09 carrega um arquivo na biblioteca após atualização da base', () => {
    visitMyPage()
    cy.get('[data-cy="my-page-file-library"]').find('[data-cy="file-type-item"]').should('have.length', 0)

    cy.window().then((win) => {
      updateTable(win, 'brand_files', (rows) => [
        ...rows,
        {
          id: `${RUN_ID}-file-1`,
          file_name: `${RUN_ID}-brand-logo.png`,
          file_type: 'logo',
          created_at: isoHoursAgo(2),
        },
      ])
    })

    cy.reload()
    cy.get('[data-cy="my-page-file-library"]').find('[data-cy="file-type-item"]').should('have.length', 1)
    cy.contains('[data-cy="my-page-file-library"]', '1 arquivo(s)').should('be.visible')
  })

  it('CT10 mantém os dados visíveis em uma nova visita após sincronização da base', () => {
    visitMyPage({
      files: [
        {
          id: `${RUN_ID}-sync-file-1`,
          file_name: `${RUN_ID}-sync-ref.png`,
          file_type: 'reference',
          created_at: isoHoursAgo(3),
        },
      ],
    })

    cy.contains('[data-cy="my-page-file-library"]', '1 arquivo(s)').should('be.visible')

    cy.window().then((win) => {
      updateTable(win, 'brand_files', (rows) => [
        ...rows,
        {
          id: `${RUN_ID}-sync-file-2`,
          file_name: `${RUN_ID}-sync-extra.png`,
          file_type: 'reference',
          created_at: isoHoursAgo(1),
        },
      ])
    })

    visitMyPage({}, { preserveStorage: true })

    cy.contains('[data-cy="my-page-file-library"]', '2 arquivo(s)').should('be.visible')
  })

  it('CT11 persiste após refresh', () => {
    visitMyPage({
      structures: [
        { id: `${RUN_ID}-structure-1`, title: `${RUN_ID} Estrutura Base`, structure_type: 'HOOK', created_at: isoHoursAgo(2) },
      ],
    })

    cy.get('[data-cy="summary-value-2"]').should('have.text', '1')
    cy.reload()
    cy.get('[data-cy="summary-value-2"]').should('have.text', '1')
  })

  it('CT12 isola os dados visíveis entre usuários simulados', () => {
    visitMyPage({
      user: USER_A,
      scripts: [
        { id: `${RUN_ID}-user-a-script`, title: `${RUN_ID} Conteúdo do usuário A`, created_at: isoHoursAgo(1) },
      ],
    })

    cy.get('[data-cy="summary-value-0"]').should('have.text', '1')
    cy.contains('[data-cy="my-page-recent-activities"]', `${RUN_ID} Conteúdo do usuário A`).should('be.visible')

    visitMyPage({
      user: USER_B,
      scripts: [
        { id: `${RUN_ID}-user-b-script`, title: `${RUN_ID} Conteúdo do usuário B`, created_at: isoHoursAgo(1) },
      ],
    })

    cy.get('[data-cy="summary-value-0"]').should('have.text', '1')
    cy.contains('[data-cy="my-page-recent-activities"]', `${RUN_ID} Conteúdo do usuário B`).should('be.visible')
    cy.contains('[data-cy="my-page-recent-activities"]', `${RUN_ID} Conteúdo do usuário A`).should('not.exist')
  })

  it('CT13 carrega a dashboard em até 3 segundos no mock local', () => {
    const startedAt = Date.now()
    visitMyPage({
      scripts: [
        { id: `${RUN_ID}-perf-script`, title: `${RUN_ID} Performance`, created_at: isoHoursAgo(1) },
      ],
      structures: [
        { id: `${RUN_ID}-perf-structure`, title: `${RUN_ID} Performance Estrutura`, structure_type: 'HOOK', created_at: isoHoursAgo(2) },
      ],
      files: [
        { id: `${RUN_ID}-perf-file`, file_name: `${RUN_ID}.png`, file_type: 'reference', created_at: isoHoursAgo(3) },
      ],
    })

    cy.then(() => {
      expect(Date.now() - startedAt).to.be.lessThan(3000)
    })
  })

  it('CT14 mostra estado vazio para usuário novo', () => {
    visitMyPage()

    cy.get('[data-cy="summary-value-0"]').should('have.text', '0')
    cy.get('[data-cy="summary-value-1"]').should('have.text', '0')
    cy.get('[data-cy="summary-value-2"]').should('have.text', '0')
    cy.get('[data-cy="summary-value-3"]').should('have.text', '0')
    cy.contains('Nenhuma atividade real foi encontrada ainda.').should('be.visible')
    cy.contains('Nenhuma gravação cadastrada ainda.').should('be.visible')
    cy.contains('Nenhum arquivo cadastrado ainda.').should('be.visible')
  })

  it('CT15 reflete create, edit e delete no resumo e nas atividades recentes', () => {
    visitMyPage({
      scripts: [
        { id: `${RUN_ID}-crud-script`, title: `${RUN_ID} Roteiro Original`, created_at: isoHoursAgo(2) },
      ],
    })

    cy.contains('[data-cy="my-page-recent-activities"]', `${RUN_ID} Roteiro Original`).should('be.visible')

    cy.window().then((win) => {
      updateTable(win, 'validated_scripts', (rows) =>
        rows.map((row) =>
          row.id === `${RUN_ID}-crud-script`
            ? { ...row, title: `${RUN_ID} Roteiro Editado`, created_at: row.created_at }
            : row,
        ),
      )
    })

    cy.reload()
    cy.contains('[data-cy="my-page-recent-activities"]', `${RUN_ID} Roteiro Editado`).should('be.visible')
    cy.contains('[data-cy="my-page-recent-activities"]', `${RUN_ID} Roteiro Original`).should('not.exist')

    cy.window().then((win) => {
      updateTable(win, 'validated_scripts', (rows) => rows.filter((row) => row.id !== `${RUN_ID}-crud-script`))
    })

    cy.reload()
    cy.get('[data-cy="summary-value-0"]').should('have.text', '0')
    cy.contains('[data-cy="my-page-recent-activities"]', `${RUN_ID} Roteiro Editado`).should('not.exist')
  })
})
