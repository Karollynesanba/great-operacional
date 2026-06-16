/// <reference types="cypress" />
export {}

const RUN_ID = `CY-CAL-${Date.now()}`
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

const today = new Date()
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 12, 12, 0, 0, 0)
const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`

type CalendarSeed = {
  user?: typeof ADMIN_USER
  clients?: Array<Record<string, unknown>>
  recordings?: Array<Record<string, unknown>>
}

type TableRow = {
  id?: string
  [key: string]: unknown
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function clientLabel(client: { client_name: string; clinic_name?: string | null }) {
  return client.clinic_name ? `${client.client_name} - ${client.clinic_name}` : client.client_name
}

function seedCalendar(win: Window, seed: CalendarSeed = {}) {
  const user = seed.user ?? ADMIN_USER

  win.localStorage.clear()
  win.localStorage.setItem('great_user', JSON.stringify(user))
  win.localStorage.setItem('great_users', JSON.stringify([user]))
  win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
  win.localStorage.setItem('mock_db_seed_version', MOCK_OPERATIONAL_SEED_VERSION)
  win.localStorage.setItem('mock_db_operational_clients', JSON.stringify(seed.clients ?? []))
  win.localStorage.setItem('mock_db_calendar_recordings', JSON.stringify(seed.recordings ?? []))
}

function visitCalendar(seed: CalendarSeed = {}, options: { preserveStorage?: boolean } = {}) {
  cy.visit('/operacional/upgrade-de-amanda/calendario-de-gravacao', {
    onBeforeLoad(win) {
      if (!options.preserveStorage) {
        seedCalendar(win, seed)
      }
    },
  })

  cy.contains('h1', 'Calendário de Gravação', { timeout: 15000 }).should('be.visible')
  cy.get('[data-cy="calendar-recordings-page"]').should('be.visible')
}

function updateTable(win: Window, table: string, updater: (rows: TableRow[]) => TableRow[]) {
  const key = `mock_db_${table}`
  const rows = JSON.parse(win.localStorage.getItem(key) || '[]')
  win.localStorage.setItem(key, JSON.stringify(updater(rows)))
}

function monthDate(monthOffset: number, day = 12) {
  return new Date(today.getFullYear(), today.getMonth() + monthOffset, day, 12, 0, 0, 0)
}

function openCreateDialog() {
  cy.get('[data-cy="calendar-recordings-create"]').click()
  cy.get('[data-cy="calendar-recording-dialog"]').should('be.visible')
}

function fillRecordingForm(values: {
  client?: string
  date?: string
  time?: string
  type?: string
  location?: string
  status?: string
  observations?: string
}) {
  cy.get('[data-cy="calendar-recording-dialog"]').within(() => {
    if (values.date !== undefined) {
      cy.get('[data-cy="calendar-recording-date"]').clear().type(values.date)
    }
    if (values.time !== undefined) {
      cy.get('[data-cy="calendar-recording-time"]').clear().type(values.time)
    }
    if (values.type !== undefined) {
      cy.get('[data-cy="calendar-recording-type"]').clear().type(values.type)
    }
    if (values.location !== undefined) {
      cy.get('[data-cy="calendar-recording-location"]').clear().type(values.location)
    }
    if (values.observations !== undefined) {
      cy.get('[data-cy="calendar-recording-observations"]').clear().type(values.observations)
    }
    if (values.status !== undefined) {
      cy.get('[data-cy="calendar-recording-status"]').click()
      cy.contains('[role="option"]', values.status).click()
    }
  })

  if (values.client) {
    cy.get('[data-cy="calendar-recording-client"]').click()
    cy.contains('[role="option"]', values.client).click()
  }
}

function saveRecordingDialog() {
  cy.get('[data-cy="calendar-recording-dialog"]').within(() => {
    cy.contains('button', /Criar gravação|Salvar alterações/i).click()
  })
}

function openRowByClient(clientName: string) {
  cy.contains('[data-cy="calendar-recording-row"]', clientName, { timeout: 15000 }).should('be.visible')
}

function openViewForClient(clientName: string) {
  cy.contains('[data-cy="calendar-recording-row"]', clientName)
    .should('be.visible')
    .within(() => {
      cy.get('[data-cy="calendar-recording-view"]').click()
    })
  cy.get('[data-cy="calendar-recording-view-dialog"]').should('be.visible')
}

describe('Upgrade Amanda - Calendário de Gravação', () => {
  beforeEach(() => {
    cy.viewport(1440, 900)
    cy.on('uncaught:exception', () => false)
  })

  it('CT01 cria uma nova gravação e atualiza o contador', () => {
    const client = {
      id: `${RUN_ID}-client-create`,
      client_name: `${RUN_ID} Cliente Criação`,
      clinic_name: 'Clínica Criação',
      status_operacional: 'ATIVO',
    }

    visitCalendar({ clients: [client], recordings: [] })

    cy.get('[data-cy="calendar-stat-total-value"]').should('have.text', '0')

    openCreateDialog()
    fillRecordingForm({
      client: clientLabel(client),
      date: toDateValue(today),
      time: '10:00',
      type: 'Sessão de gravação',
      location: 'Studio Cypress, Fortaleza - CE',
      status: 'AGENDADA',
      observations: 'Planejamento inicial da gravação.',
    })
    saveRecordingDialog()

    openRowByClient(clientLabel(client))
    cy.get('[data-cy="calendar-stat-total-value"]').should('have.text', '1')
  })

  it('CT02 edita uma gravação existente', () => {
    const clientA = {
      id: `${RUN_ID}-client-edit-a`,
      client_name: `${RUN_ID} Cliente Edição A`,
      clinic_name: 'Clínica Edição A',
      status_operacional: 'ATIVO',
    }
    const clientB = {
      id: `${RUN_ID}-client-edit-b`,
      client_name: `${RUN_ID} Cliente Edição B`,
      clinic_name: 'Clínica Edição B',
      status_operacional: 'ATIVO',
    }

    visitCalendar({
      clients: [clientA, clientB],
      recordings: [
        {
          id: `${RUN_ID}-recording-edit`,
          client_id: clientA.id,
          recording_date: toDateValue(today),
          recording_time: '11:00',
          location: 'Studio antigo',
          status: 'AGENDADA',
          recording_type: 'Reels',
          observations: 'Observação inicial',
        },
      ],
    })

    cy.contains('[data-cy="calendar-recording-row"]', clientLabel(clientA)).within(() => {
      cy.get('[data-cy="calendar-recording-edit-action"]').click()
    })
    cy.get('[data-cy="calendar-recording-dialog"]').should('be.visible')

    fillRecordingForm({
      client: clientLabel(clientB),
      date: toDateValue(today),
      time: '13:30',
      location: 'Novo endereço da gravação',
      observations: 'Observação atualizada',
    })
    saveRecordingDialog()

    cy.contains('[data-cy="calendar-recording-row"]', clientLabel(clientB), { timeout: 15000 }).should('be.visible')
    cy.contains('13:30').should('be.visible')
    cy.contains('Novo endereço da gravação').should('be.visible')
  })

  it('CT03 exclui uma gravação', () => {
    const client = {
      id: `${RUN_ID}-client-delete`,
      client_name: `${RUN_ID} Cliente Exclusão`,
      clinic_name: 'Clínica Exclusão',
      status_operacional: 'ATIVO',
    }

    visitCalendar({
      clients: [client],
      recordings: [
        {
          id: `${RUN_ID}-recording-delete`,
          client_id: client.id,
          recording_date: toDateValue(today),
          recording_time: '14:00',
          location: 'Sala 1',
          status: 'AGENDADA',
          recording_type: 'Depoimento',
          observations: null,
        },
      ],
    })

    cy.contains('[data-cy="calendar-recording-row"]', clientLabel(client))
      .should('be.visible')
      .within(() => {
        cy.get('[data-cy="calendar-recording-delete-action"]').click()
      })

    cy.get('[data-cy="calendar-recording-delete-dialog"]').should('be.visible')
    cy.get('[data-cy="calendar-recording-delete-dialog"]').contains('button', 'Excluir').click()

    cy.contains('[data-cy="calendar-recording-row"]', clientLabel(client), { timeout: 15000 }).should('not.exist')
    cy.get('[data-cy="calendar-stat-total-value"]').should('have.text', '0')
  })

  it('CT04 visualiza os detalhes da gravação', () => {
    const client = {
      id: `${RUN_ID}-client-view`,
      client_name: `${RUN_ID} Cliente Visualização`,
      clinic_name: 'Clínica Visualização',
      status_operacional: 'ATIVO',
    }

    visitCalendar({
      clients: [client],
      recordings: [
        {
          id: `${RUN_ID}-recording-view`,
          client_id: client.id,
          recording_date: toDateValue(today),
          recording_time: '15:00',
          location: 'Endereço completo da gravação',
          status: 'CONFIRMADA',
          recording_type: 'Institucional',
          observations: 'Levar iluminação e tripé.',
        },
      ],
    })

    openViewForClient(clientLabel(client))

    cy.get('[data-cy="calendar-recording-view-dialog"]').within(() => {
      cy.contains(clientLabel(client)).should('be.visible')
      cy.contains('15:00').should('be.visible')
      cy.contains('Endereço completo da gravação').should('be.visible')
      cy.contains('Levar iluminação e tripé.').should('be.visible')
      cy.contains('CONFIRMADA').should('be.visible')
    })
  })

  it('CT05 pesquisa gravações por cliente', () => {
    const clientA = {
      id: `${RUN_ID}-client-search-a`,
      client_name: `${RUN_ID} Cliente Busca A`,
      clinic_name: 'Clínica Busca A',
      status_operacional: 'ATIVO',
    }
    const clientB = {
      id: `${RUN_ID}-client-search-b`,
      client_name: `${RUN_ID} Cliente Busca B`,
      clinic_name: 'Clínica Busca B',
      status_operacional: 'ATIVO',
    }

    visitCalendar({
      clients: [clientA, clientB],
      recordings: [
        {
          id: `${RUN_ID}-recording-search-a`,
          client_id: clientA.id,
          recording_date: toDateValue(today),
          recording_time: '09:00',
          location: 'Estúdio A',
          status: 'AGENDADA',
          recording_type: 'Reels',
          observations: null,
        },
        {
          id: `${RUN_ID}-recording-search-b`,
          client_id: clientB.id,
          recording_date: toDateValue(today),
          recording_time: '11:00',
          location: 'Estúdio B',
          status: 'AGENDADA',
          recording_type: 'Stories',
          observations: null,
        },
      ],
    })

    cy.get('[data-cy="calendar-recordings-search"]').clear().type('Busca B')
    cy.contains('[data-cy="calendar-recording-row"]', clientLabel(clientB)).should('be.visible')
    cy.contains('[data-cy="calendar-recording-row"]', clientLabel(clientA)).should('not.exist')
  })

  it('CT06 filtra gravações por período', () => {
    const client = {
      id: `${RUN_ID}-client-period`,
      client_name: `${RUN_ID} Cliente Período`,
      clinic_name: 'Clínica Período',
      status_operacional: 'ATIVO',
    }

    visitCalendar({
      clients: [client],
      recordings: [
        {
          id: `${RUN_ID}-recording-current`,
          client_id: client.id,
          recording_date: toDateValue(monthDate(0, 9)),
          recording_time: '09:00',
          location: 'Período atual',
          status: 'AGENDADA',
          recording_type: 'Reels',
          observations: null,
        },
        {
          id: `${RUN_ID}-recording-previous`,
          client_id: client.id,
          recording_date: toDateValue(monthDate(-1, 9)),
          recording_time: '11:00',
          location: 'Período anterior',
          status: 'AGENDADA',
          recording_type: 'Stories',
          observations: null,
        },
      ],
    })

    cy.get('[data-cy="calendar-recordings-month-filter"]')
      .invoke('val', previousMonth)
      .trigger('input')
      .trigger('change')

    cy.contains('[data-cy="calendar-recording-row"]', 'Período anterior').should('be.visible')
    cy.contains('[data-cy="calendar-recording-row"]', 'Período atual').should('not.exist')

    cy.get('[data-cy="calendar-recordings-month-filter"]')
      .invoke('val', currentMonth)
      .trigger('input')
      .trigger('change')

    cy.contains('[data-cy="calendar-recording-row"]', 'Período atual').should('be.visible')
  })

  it('CT07 atualiza o indicador de gravações do mês', () => {
    const client = {
      id: `${RUN_ID}-client-total`,
      client_name: `${RUN_ID} Cliente Contador`,
      clinic_name: 'Clínica Contador',
      status_operacional: 'ATIVO',
    }

    visitCalendar({
      clients: [client],
      recordings: [
        {
          id: `${RUN_ID}-recording-total-1`,
          client_id: client.id,
          recording_date: toDateValue(today),
          recording_time: '09:00',
          location: 'Estúdio 1',
          status: 'AGENDADA',
          recording_type: 'Reels',
          observations: null,
        },
        {
          id: `${RUN_ID}-recording-total-2`,
          client_id: client.id,
          recording_date: toDateValue(today),
          recording_time: '10:00',
          location: 'Estúdio 2',
          status: 'AGENDADA',
          recording_type: 'Stories',
          observations: null,
        },
      ],
    })

    cy.get('[data-cy="calendar-stat-total-value"]').should('have.text', '2')
  })

  it('CT08 atualiza o indicador de clientes', () => {
    const clientA = {
      id: `${RUN_ID}-client-count-a`,
      client_name: `${RUN_ID} Cliente A`,
      clinic_name: 'Clínica A',
      status_operacional: 'ATIVO',
    }
    const clientB = {
      id: `${RUN_ID}-client-count-b`,
      client_name: `${RUN_ID} Cliente B`,
      clinic_name: 'Clínica B',
      status_operacional: 'ATIVO',
    }

    visitCalendar({
      clients: [clientA, clientB],
      recordings: [
        {
          id: `${RUN_ID}-recording-count-1`,
          client_id: clientA.id,
          recording_date: toDateValue(today),
          recording_time: '09:00',
          location: 'Estúdio A',
          status: 'AGENDADA',
          recording_type: 'Reels',
          observations: null,
        },
        {
          id: `${RUN_ID}-recording-count-2`,
          client_id: clientB.id,
          recording_date: toDateValue(today),
          recording_time: '10:00',
          location: 'Estúdio B',
          status: 'AGENDADA',
          recording_type: 'Stories',
          observations: null,
        },
      ],
    })

    cy.get('[data-cy="calendar-stat-clients-value"]').should('have.text', '2')
  })

  it('CT09 atualiza o indicador de conteúdo planejado', () => {
    const client = {
      id: `${RUN_ID}-client-planned`,
      client_name: `${RUN_ID} Cliente Planejamento`,
      clinic_name: 'Clínica Planejamento',
      status_operacional: 'ATIVO',
    }

    visitCalendar({
      clients: [client],
      recordings: [
        {
          id: `${RUN_ID}-recording-planned-1`,
          client_id: client.id,
          recording_date: toDateValue(today),
          recording_time: '09:00',
          location: 'Estúdio A',
          status: 'AGENDADA',
          recording_type: 'Reels',
          observations: 'Conteúdo planejado 1',
        },
        {
          id: `${RUN_ID}-recording-planned-2`,
          client_id: client.id,
          recording_date: toDateValue(today),
          recording_time: '10:00',
          location: 'Estúdio B',
          status: 'AGENDADA',
          recording_type: 'Stories',
          observations: null,
        },
      ],
    })

    cy.get('[data-cy="calendar-stat-planned-value"]').should('have.text', '1')
    cy.contains('[data-cy="calendar-recording-row"]', 'Conteúdo planejado 1').should('be.visible')
  })

  it('CT10 mostra gravações pendentes para eventos futuros', () => {
    const client = {
      id: `${RUN_ID}-client-pending`,
      client_name: `${RUN_ID} Cliente Pendente`,
      clinic_name: 'Clínica Pendente',
      status_operacional: 'ATIVO',
    }

    visitCalendar({
      clients: [client],
      recordings: [
        {
          id: `${RUN_ID}-recording-pending`,
          client_id: client.id,
          recording_date: toDateValue(monthDate(0, 20)),
          recording_time: '18:00',
          location: 'Estúdio pendente',
          status: 'AGENDADA',
          recording_type: 'Reels',
          observations: null,
        },
      ],
    })

    cy.get('[data-cy="calendar-stat-upcoming-value"]').should('have.text', '1')
    cy.contains('[data-cy="calendar-recording-row"]', 'AGENDADA').should('be.visible')
  })

  it('CT11 adiciona endereço da gravação', () => {
    const client = {
      id: `${RUN_ID}-client-location`,
      client_name: `${RUN_ID} Cliente Endereço`,
      clinic_name: 'Clínica Endereço',
      status_operacional: 'ATIVO',
    }

    visitCalendar({ clients: [client], recordings: [] })

    openCreateDialog()
    fillRecordingForm({
      client: clientLabel(client),
      date: toDateValue(today),
      time: '16:00',
      type: 'Institucional',
      location: 'Av. Beira Mar, 1234, Fortaleza - CE',
      status: 'AGENDADA',
      observations: 'Gravação com endereço completo.',
    })
    saveRecordingDialog()

    openViewForClient(clientLabel(client))
    cy.get('[data-cy="calendar-recording-view-dialog"]').contains('Av. Beira Mar, 1234, Fortaleza - CE').should('be.visible')
  })

  it('CT12 exibe lembrete de retorno após 30 dias', () => {
    const client = {
      id: `${RUN_ID}-client-reminder`,
      client_name: `${RUN_ID} Cliente Retorno`,
      clinic_name: 'Clínica Retorno',
      status_operacional: 'ATIVO',
    }

    const oldDate = new Date(today)
    oldDate.setDate(oldDate.getDate() - 35)

    visitCalendar({
      clients: [client],
      recordings: [
        {
          id: `${RUN_ID}-recording-reminder`,
          client_id: client.id,
          recording_date: toDateValue(oldDate),
          recording_time: '12:00',
          location: 'Estúdio retorno',
          status: 'GRAVADA',
          recording_type: 'Reels',
          observations: 'Cliente já gravado.',
        },
      ],
    })

    cy.get('[data-cy="calendar-recordings-month-filter"]')
      .invoke('val', previousMonth)
      .trigger('input')
      .trigger('change')

    cy.get('[data-cy="calendar-reminders"]').should('be.visible')
    cy.contains('Agendar nova gravação com cliente').should('be.visible')
  })

  it('CT13 conclui uma gravação alterando o status', () => {
    const client = {
      id: `${RUN_ID}-client-finish`,
      client_name: `${RUN_ID} Cliente Conclusão`,
      clinic_name: 'Clínica Conclusão',
      status_operacional: 'ATIVO',
    }

    visitCalendar({
      clients: [client],
      recordings: [
        {
          id: `${RUN_ID}-recording-finish`,
          client_id: client.id,
          recording_date: toDateValue(today),
          recording_time: '08:00',
          location: 'Estúdio final',
          status: 'AGENDADA',
          recording_type: 'Reels',
          observations: null,
        },
      ],
    })

    cy.contains('[data-cy="calendar-recording-row"]', clientLabel(client)).within(() => {
      cy.get('[data-cy="calendar-recording-edit-action"]').click()
    })
    cy.get('[data-cy="calendar-recording-dialog"]').within(() => {
      cy.get('[data-cy="calendar-recording-status"]').click()
      cy.contains('[role="option"]', 'GRAVADA').click()
    })
    saveRecordingDialog()

    cy.contains('[data-cy="calendar-recording-row"]', 'GRAVADA').should('be.visible')
    cy.get('[data-cy="calendar-stat-finished-value"]').should('have.text', '1')
    cy.get('[data-cy="calendar-stat-upcoming-value"]').should('have.text', '0')
  })

  it('CT14 cancela uma gravação mantendo o histórico', () => {
    const client = {
      id: `${RUN_ID}-client-cancel`,
      client_name: `${RUN_ID} Cliente Cancelamento`,
      clinic_name: 'Clínica Cancelamento',
      status_operacional: 'ATIVO',
    }

    visitCalendar({
      clients: [client],
      recordings: [
        {
          id: `${RUN_ID}-recording-cancel`,
          client_id: client.id,
          recording_date: toDateValue(today),
          recording_time: '17:00',
          location: 'Estúdio cancelado',
          status: 'AGENDADA',
          recording_type: 'Depoimento',
          observations: null,
        },
      ],
    })

    cy.contains('[data-cy="calendar-recording-row"]', clientLabel(client)).within(() => {
      cy.get('[data-cy="calendar-recording-edit-action"]').click()
    })
    cy.get('[data-cy="calendar-recording-dialog"]').within(() => {
      cy.get('[data-cy="calendar-recording-status"]').click()
      cy.contains('[role="option"]', 'CANCELADA').click()
    })
    saveRecordingDialog()

    cy.contains('[data-cy="calendar-recording-row"]', 'CANCELADA').should('be.visible')
  })

  it('CT15 persiste os dados após refresh e nova autenticação simulada', () => {
    const client = {
      id: `${RUN_ID}-client-persist`,
      client_name: `${RUN_ID} Cliente Persistência`,
      clinic_name: 'Clínica Persistência',
      status_operacional: 'ATIVO',
    }

    visitCalendar({ clients: [client], recordings: [] })

    openCreateDialog()
    fillRecordingForm({
      client: clientLabel(client),
      date: toDateValue(today),
      time: '19:00',
      type: 'Reels',
      location: 'Estúdio persistente',
      status: 'AGENDADA',
      observations: 'Registro que deve sobreviver ao refresh.',
    })
    saveRecordingDialog()

    cy.reload()
    openRowByClient(clientLabel(client))

    visitCalendar({}, { preserveStorage: true })
    openRowByClient(clientLabel(client))
  })

  it('CT16 sincroniza novos agendamentos entre visitas simuladas', () => {
    const client = {
      id: `${RUN_ID}-client-sync`,
      client_name: `${RUN_ID} Cliente Sincronização`,
      clinic_name: 'Clínica Sincronização',
      status_operacional: 'ATIVO',
    }

    visitCalendar({ clients: [client], recordings: [] })

    cy.window().then((win) => {
      updateTable(win, 'calendar_recordings', (rows) => [
        ...rows,
        {
          id: `${RUN_ID}-recording-sync`,
          client_id: client.id,
          recording_date: toDateValue(today),
          recording_time: '20:00',
          location: 'Sincronizado via mock',
          status: 'AGENDADA',
          recording_type: 'Stories',
          observations: null,
        },
      ])
    })

    visitCalendar({}, { preserveStorage: true })
    openRowByClient(clientLabel(client))
    cy.contains('20:00').should('be.visible')
  })

  it('CT17 bloqueia conflito de horário para o mesmo cliente', () => {
    const client = {
      id: `${RUN_ID}-client-conflict`,
      client_name: `${RUN_ID} Cliente Conflito`,
      clinic_name: 'Clínica Conflito',
      status_operacional: 'ATIVO',
    }

    visitCalendar({
      clients: [client],
      recordings: [
        {
          id: `${RUN_ID}-recording-conflict-1`,
          client_id: client.id,
          recording_date: toDateValue(today),
          recording_time: '10:00',
          location: 'Sala principal',
          status: 'AGENDADA',
          recording_type: 'Reels',
          observations: null,
        },
      ],
    })

    openCreateDialog()
    fillRecordingForm({
      client: clientLabel(client),
      date: toDateValue(today),
      time: '10:00',
      type: 'Stories',
      location: 'Outra sala',
      status: 'AGENDADA',
      observations: 'Tentativa duplicada.',
    })
    saveRecordingDialog()

    cy.contains('Já existe uma gravação para').should('be.visible')
    cy.contains('[data-cy="calendar-recording-row"]', 'Outra sala').should('not.exist')
  })

  it('CT18 mostra estado vazio sem gravações', () => {
    const client = {
      id: `${RUN_ID}-client-empty`,
      client_name: `${RUN_ID} Cliente Vazio`,
      clinic_name: 'Clínica Vazia',
      status_operacional: 'ATIVO',
    }

    visitCalendar({ clients: [client], recordings: [] })

    cy.get('[data-cy="calendar-recordings-empty"]').should('be.visible')
    cy.contains('Nenhuma gravação encontrada').should('be.visible')
  })

  it('CT19 cobre o fluxo completo de CRUD da agenda', () => {
    const client = {
      id: `${RUN_ID}-client-crud`,
      client_name: `${RUN_ID} Cliente CRUD`,
      clinic_name: 'Clínica CRUD',
      status_operacional: 'ATIVO',
    }

    visitCalendar({ clients: [client], recordings: [] })

    openCreateDialog()
    fillRecordingForm({
      client: clientLabel(client),
      date: toDateValue(today),
      time: '21:00',
      type: 'Reels',
      location: 'Local CRUD',
      status: 'AGENDADA',
      observations: 'Criada para CRUD completo.',
    })
    saveRecordingDialog()

    openViewForClient(clientLabel(client))
    cy.get('[data-cy="calendar-recording-view-dialog"]').contains('Local CRUD').should('be.visible')

    cy.contains('[data-cy="calendar-recording-row"]', clientLabel(client)).within(() => {
      cy.get('[data-cy="calendar-recording-edit-action"]').click()
    })
    cy.get('[data-cy="calendar-recording-dialog"]').within(() => {
      cy.get('[data-cy="calendar-recording-status"]').click()
      cy.contains('[role="option"]', 'GRAVADA').click()
    })
    saveRecordingDialog()

    cy.contains('[data-cy="calendar-recording-row"]', 'GRAVADA').should('be.visible')

    cy.contains('[data-cy="calendar-recording-row"]', clientLabel(client)).within(() => {
      cy.get('[data-cy="calendar-recording-delete-action"]').click()
    })
    cy.get('[data-cy="calendar-recording-delete-dialog"]').contains('button', 'Excluir').click()
    cy.contains('[data-cy="calendar-recording-row"]', clientLabel(client), { timeout: 15000 }).should('not.exist')
  })

  it('CT20 confirma que a agenda depende do Supabase mock e não apenas do estado local', () => {
    const client = {
      id: `${RUN_ID}-client-production`,
      client_name: `${RUN_ID} Cliente Produção`,
      clinic_name: 'Clínica Produção',
      status_operacional: 'ATIVO',
    }
    const titleLocation = 'Agenda produtiva'

    visitCalendar({ clients: [client], recordings: [] })

    openCreateDialog()
    fillRecordingForm({
      client: clientLabel(client),
      date: toDateValue(today),
      time: '22:00',
      type: 'Reels',
      location: titleLocation,
      status: 'AGENDADA',
      observations: 'Persistência sem LocalStorage isolado.',
    })
    saveRecordingDialog()

    cy.get('[data-cy="calendar-stat-total-value"]').should('have.text', '1')

    visitCalendar({}, { preserveStorage: true })
    cy.get('[data-cy="calendar-stat-total-value"]').should('have.text', '1')
    cy.contains('[data-cy="calendar-recording-row"]', titleLocation).should('be.visible')
  })
})
