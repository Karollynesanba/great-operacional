/// <reference types="cypress" />
export {}

const RUN_ID = `CY-IDP-${Date.now()}`

const TEST_ADMIN = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

const BASE_PROFILE_ID = `${RUN_ID}-profile-base`
const SECOND_PROFILE_ID = `${RUN_ID}-profile-secondary`
const BASE_COLOR_ID = `${RUN_ID}-color-base`
const BASE_APPLICATION_ID = `${RUN_ID}-application-base`
const BASE_FILE_ID = `${RUN_ID}-file-base`

const BASE_PROFILE_NAME = `${RUN_ID} Clínica Aurora`
const SECOND_PROFILE_NAME = `${RUN_ID} Dr. Atlas`

function nowIso() {
  return new Date().toISOString()
}

function seedBrandState(seed: {
  profiles?: Array<Record<string, unknown>>
  colors?: Array<Record<string, unknown>>
  applications?: Array<Record<string, unknown>>
  files?: Array<Record<string, unknown>>
  operationalClients?: Array<Record<string, unknown>>
}) {
  return {
    profiles: seed.profiles ?? [],
    colors: seed.colors ?? [],
    applications: seed.applications ?? [],
    files: seed.files ?? [],
    operationalClients: seed.operationalClients ?? [],
  }
}

function visitIdentityPalette(seed = seedBrandState({
  profiles: [
    {
      id: BASE_PROFILE_ID,
      display_name: BASE_PROFILE_NAME,
      profile_type: 'CLIENT',
      specialty: 'Estética avançada',
      city: 'Fortaleza',
      notes: 'Perfil base para testes Cypress.',
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: SECOND_PROFILE_ID,
      display_name: SECOND_PROFILE_NAME,
      profile_type: 'DOCTOR',
      specialty: 'Ortopedia',
      city: 'Recife',
      notes: 'Segundo perfil para busca e filtro.',
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ],
  colors: [
    {
      id: BASE_COLOR_ID,
      profile_id: BASE_PROFILE_ID,
      name: 'Cor Principal',
      hex: '#E11D48',
      sort_order: 0,
      is_primary: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ],
  applications: [
    {
      id: BASE_APPLICATION_ID,
      profile_id: BASE_PROFILE_ID,
      title: 'Instagram Feed',
      description: 'Aplicação inicial da marca no feed.',
      notes: 'Exemplo base.',
      preview_url: 'https://example.com/instagram-feed',
      sort_order: 0,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ],
  files: [
    {
      id: BASE_FILE_ID,
      profile_id: BASE_PROFILE_ID,
      file_name: 'logo-base.svg',
      file_path: `${BASE_PROFILE_ID}/logo-base.svg`,
      file_type: 'logo',
      file_url: 'mock_storage://brand-assets/logo-base.svg',
      file_size: 1280,
      mime_type: 'image/svg+xml',
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ],
  operationalClients: [
    {
      id: `${RUN_ID}-operational-client-1`,
      client_name: 'Cliente Operacional Cypress',
      clinic_name: 'Clínica Cypress',
      status_operacional: 'ATIVO',
      onboarding_stage: 'ATIVO',
      team_id: 'equipe-7',
    },
  ],
})) {
  cy.visit('/operacional/upgrade-de-amanda/identidade-paleta', {
    onBeforeLoad(win) {
      win.localStorage.clear()
      win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
      win.localStorage.setItem('great_users', JSON.stringify([TEST_ADMIN]))
      win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
      win.localStorage.setItem('mock_db_brand_profiles', JSON.stringify(seed.profiles))
      win.localStorage.setItem('mock_db_brand_colors', JSON.stringify(seed.colors))
      win.localStorage.setItem('mock_db_brand_applications', JSON.stringify(seed.applications))
      win.localStorage.setItem('mock_db_brand_files', JSON.stringify(seed.files))
      win.localStorage.setItem('mock_db_operational_clients', JSON.stringify(seed.operationalClients))
    },
  })

  cy.contains('h1', 'Identidade / Paleta', { timeout: 15000 }).should('be.visible')
}

function openProfileDialog() {
  cy.get('[data-cy="brand-profile-new"]').first().click()
  cy.contains('[role="dialog"]', /Novo perfil|Editar perfil/).should('be.visible')
}

function openColorDialog() {
  cy.get('[data-cy="brand-color-new"]').click()
  cy.contains('[role="dialog"]', /Adicionar cor|Editar cor/).should('be.visible')
}

function openApplicationDialog() {
  cy.get('[data-cy="brand-application-new"]').click()
  cy.contains('[role="dialog"]', /Nova aplicação|Editar aplicação/).should('be.visible')
}

function fillProfileForm(values: { name: string; specialty: string; city: string; notes: string }) {
  cy.get('[role="dialog"]').within(() => {
    cy.get('#profile-name').clear().type(values.name)
    cy.get('#profile-specialty').clear().type(values.specialty)
    cy.get('#profile-city').clear().type(values.city)
    cy.get('#profile-notes').clear().type(values.notes)
  })
}

function fillColorForm(values: { name: string; hex: string }) {
  cy.get('[role="dialog"]').within(() => {
    cy.get('#color-name').clear().type(values.name)
    cy.get('#color-hex').clear().type(values.hex)
  })
}

function fillApplicationForm(values: { title: string; description: string; preview: string; notes: string; order?: number }) {
  cy.get('[role="dialog"]').within(() => {
    cy.get('#application-title').clear().type(values.title)
    cy.get('#application-description').clear().type(values.description)
    cy.get('#application-preview').clear().type(values.preview)
    cy.get('#application-order').clear().type(String(values.order ?? 1))
    cy.get('#application-notes').clear().type(values.notes)
  })
}

function getColorCard(name: string) {
  return cy.get('[data-cy="brand-color-card"]').contains(name).closest('[data-cy="brand-color-card"]')
}

function getFileRow(name: string) {
  return cy.get('[data-cy="brand-file-row"]').contains(name).closest('[data-cy="brand-file-row"]')
}

describe('Upgrade Amanda - Identidade / Paleta', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
    cy.viewport(1440, 900)
    visitIdentityPalette()
  })

  it('CT01 cria a identidade principal e mantém o registro visível após recarregar', () => {
    const profileName = `${RUN_ID} Identidade Principal`

    openProfileDialog()
    fillProfileForm({
      name: profileName,
      specialty: 'Dermatologia estética',
      city: 'São Paulo',
      notes: 'Descrição e informações da marca para Cypress.',
    })
    cy.contains('[role="dialog"]', 'Salvar').click()

    cy.contains('[data-cy="brand-profile-card"]', profileName, { timeout: 15000 }).should('be.visible')
    cy.reload()
    cy.contains('[data-cy="brand-profile-card"]', profileName, { timeout: 15000 }).should('be.visible')
  })

  it('CT02 adiciona um perfil de marca pela seção Perfis de marca', () => {
    const profileName = `${RUN_ID} Perfil Premium`

    cy.contains('Perfis de marca').should('be.visible')
    cy.contains('button', 'Novo').click()
    fillProfileForm({
      name: profileName,
      specialty: 'Clínica premium',
      city: 'Fortaleza',
      notes: 'Perfil criado para validar a listagem.',
    })
    cy.contains('[role="dialog"]', 'Salvar').click()

    cy.contains('[data-cy="brand-profile-card"]', profileName, { timeout: 15000 }).should('be.visible')
  })

  it('CT03 adiciona uma cor na paleta', () => {
    const colorName = `${RUN_ID} Roxo Solar`
    const colorHex = '#7C3AED'

    openColorDialog()
    fillColorForm({ name: colorName, hex: colorHex })
    cy.contains('[role="dialog"]', 'Salvar cor').click()

    cy.contains('[data-cy="brand-color-card"]', colorName, { timeout: 15000 }).should('be.visible')
    cy.contains('[data-cy="brand-color-card"]', colorHex).should('be.visible')
  })

  it('CT04 edita uma cor existente sem duplicar o registro', () => {
    const editedName = `${RUN_ID} Cor Principal Ajustada`
    const editedHex = '#0F766E'

    getColorCard('Cor Principal').within(() => {
      cy.get('[data-cy="brand-color-edit"]').click()
    })
    fillColorForm({ name: editedName, hex: editedHex })
    cy.contains('[role="dialog"]', 'Salvar cor').click()

    cy.contains('[data-cy="brand-color-card"]', editedName, { timeout: 15000 }).should('be.visible')
    cy.contains('[data-cy="brand-color-card"]', editedHex).should('be.visible')
    cy.contains('[data-cy="brand-color-card"]', /^Cor Principal$/).should('not.exist')
  })

  it('CT05 exclui uma cor da paleta e ela não retorna após recarregar', () => {
    getColorCard('Cor Principal').within(() => {
      cy.get('[data-cy="brand-color-delete"]').click()
    })
    cy.contains('[role="dialog"]', 'Remover cor').should('be.visible')
    cy.contains('[role="dialog"]', 'Remover').click()

    cy.contains('[data-cy="brand-color-card"]', 'Cor Principal', { timeout: 15000 }).should('not.exist')
    cy.reload()
    cy.contains('[data-cy="brand-color-card"]', 'Cor Principal', { timeout: 15000 }).should('not.exist')
  })

  it('CT06 adiciona uma aplicação da marca', () => {
    const applicationTitle = `${RUN_ID} Landing Page`

    openApplicationDialog()
    fillApplicationForm({
      title: applicationTitle,
      description: 'Uso da marca em landing page e captação.',
      preview: 'https://example.com/landing-page',
      notes: 'Aplicação registrada pelo Cypress.',
      order: 2,
    })
    cy.contains('[role="dialog"]', 'Salvar aplicação').click()

    cy.contains('[data-cy="brand-application-card"]', applicationTitle, { timeout: 15000 }).should('be.visible')
  })

  it('CT07 faz upload de um arquivo permitido e exibe o anexo na lista', () => {
    const fileName = `${RUN_ID}-logo.txt`

    cy.get('[data-cy="brand-upload-button"]').click()
    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('arquivo de identidade para testes'),
        fileName,
        mimeType: 'text/plain',
      },
      { force: true },
    )

    cy.contains('arquivo(s) enviado(s) ao Supabase Storage.', { timeout: 15000 }).should('be.visible')
    cy.contains('[data-cy="brand-file-row"]', fileName, { timeout: 15000 }).should('be.visible')
    getFileRow(fileName).within(() => {
      cy.get('[data-cy="brand-file-open"] a').should('have.attr', 'target', '_blank')
    })
  })

  it('CT08 valida busca e filtro por tipo', () => {
    cy.get('[data-cy="brand-search-input"]').clear().type('Atlas')
    cy.contains('[data-cy="brand-profile-card"]', SECOND_PROFILE_NAME, { timeout: 15000 }).should('be.visible')
    cy.contains('[data-cy="brand-profile-card"]', BASE_PROFILE_NAME).should('not.exist')

    cy.get('[data-cy="brand-search-input"]').clear()
    cy.get('button[role="combobox"]').first().click()
    cy.contains('[role="option"]', 'Doutores').click()

    cy.contains('[data-cy="brand-profile-card"]', SECOND_PROFILE_NAME, { timeout: 15000 }).should('be.visible')
    cy.contains('[data-cy="brand-profile-card"]', BASE_PROFILE_NAME).should('not.exist')
  })

  it('CT09 bloqueia salvamento com campos obrigatórios vazios', () => {
    openColorDialog()
    cy.contains('[role="dialog"]', 'Salvar cor').click()
    cy.contains('Informe o nome da cor.').should('be.visible')
    cy.contains('[data-cy="brand-color-card"]', 'Cor Principal').should('be.visible')

    cy.contains('[role="dialog"]', 'Cancelar').click()

    openApplicationDialog()
    cy.contains('[role="dialog"]', 'Salvar aplicação').click()
    cy.contains('Informe o título da aplicação.').should('be.visible')
    cy.contains('[data-cy="brand-application-card"]', 'Instagram Feed').should('be.visible')

    cy.contains('[role="dialog"]', 'Cancelar').click()

    cy.get('[data-cy="brand-profile-new"]').first().click()
    cy.contains('[role="dialog"]', /Novo perfil/).should('be.visible')
    cy.contains('[role="dialog"]', 'Salvar').click()
    cy.contains('Informe o nome do perfil.').should('be.visible')
  })

  it('CT10 mantém dados cadastrados após recarregar a página', () => {
    const profileName = `${RUN_ID} Persistência`
    const colorName = `${RUN_ID} Azul Persistente`
    const applicationTitle = `${RUN_ID} Reels Persistente`
    const fileName = `${RUN_ID}-persistencia.txt`

    openProfileDialog()
    fillProfileForm({
      name: profileName,
      specialty: 'Marketing médico',
      city: 'Natal',
      notes: 'Registro que precisa sobreviver ao reload.',
    })
    cy.contains('[role="dialog"]', 'Salvar').click()

    openColorDialog()
    fillColorForm({ name: colorName, hex: '#2563EB' })
    cy.contains('[role="dialog"]', 'Salvar cor').click()

    openApplicationDialog()
    fillApplicationForm({
      title: applicationTitle,
      description: 'Uso persistente da marca.',
      preview: 'https://example.com/reels',
      notes: 'Aplicação persistente.',
      order: 3,
    })
    cy.contains('[role="dialog"]', 'Salvar aplicação').click()

    cy.get('[data-cy="brand-upload-button"]').click()
    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('persistencia'),
        fileName,
        mimeType: 'text/plain',
      },
      { force: true },
    )

    cy.contains('[data-cy="brand-profile-card"]', profileName, { timeout: 15000 }).should('be.visible')
    cy.contains('[data-cy="brand-color-card"]', colorName).should('be.visible')
    cy.contains('[data-cy="brand-application-card"]', applicationTitle).should('be.visible')
    cy.contains('[data-cy="brand-file-row"]', fileName).should('be.visible')

    cy.reload()
    cy.contains('[data-cy="brand-profile-card"]', profileName, { timeout: 15000 }).should('be.visible')
    cy.contains('[data-cy="brand-color-card"]', colorName, { timeout: 15000 }).should('be.visible')
    cy.contains('[data-cy="brand-application-card"]', applicationTitle, { timeout: 15000 }).should('be.visible')
    cy.contains('[data-cy="brand-file-row"]', fileName, { timeout: 15000 }).should('be.visible')
  })

  it('CT11 isola os dados exibidos entre sessões diferentes de usuário', () => {
    const userAProfile = `${RUN_ID} Cliente A`
    const userBProfile = `${RUN_ID} Cliente B`

    visitIdentityPalette(
      seedBrandState({
        profiles: [
          {
            id: `${RUN_ID}-user-a-profile`,
            display_name: userAProfile,
            profile_type: 'CLIENT',
            specialty: 'Clínica A',
            city: 'Fortaleza',
            notes: 'Dados visíveis para o usuário A.',
            is_active: true,
            created_at: nowIso(),
            updated_at: nowIso(),
          },
        ],
        colors: [],
        applications: [],
        files: [],
        operationalClients: [],
      }),
    )

    cy.contains('[data-cy="brand-profile-card"]', userAProfile, { timeout: 15000 }).should('be.visible')
    cy.contains('[data-cy="brand-profile-card"]', userBProfile).should('not.exist')

    visitIdentityPalette(
      seedBrandState({
        profiles: [
          {
            id: `${RUN_ID}-user-b-profile`,
            display_name: userBProfile,
            profile_type: 'DOCTOR',
            specialty: 'Clínica B',
            city: 'Recife',
            notes: 'Dados visíveis para o usuário B.',
            is_active: true,
            created_at: nowIso(),
            updated_at: nowIso(),
          },
        ],
        colors: [],
        applications: [],
        files: [],
        operationalClients: [],
      }),
    )

    cy.contains('[data-cy="brand-profile-card"]', userBProfile, { timeout: 15000 }).should('be.visible')
    cy.contains('[data-cy="brand-profile-card"]', userAProfile).should('not.exist')
  })

  it('CT12 mantém a tela funcional em viewport menor', () => {
    cy.viewport(390, 844)
    cy.contains('h1', 'Identidade / Paleta').should('be.visible')
    cy.contains('Perfis de marca').should('be.visible')
    cy.contains('Paleta de cores').should('be.visible')
    cy.contains('Aplicações da marca').should('be.visible')
    cy.contains('Arquivos enviados').should('be.visible')

    cy.get('[data-cy="brand-profile-new"]').first().click()
    cy.contains('[role="dialog"]', /Novo perfil|Editar perfil/).should('be.visible')
    cy.contains('[role="dialog"]', 'Cancelar').click()

    cy.get('[data-cy="brand-color-new"]').click()
    cy.contains('[role="dialog"]', /Adicionar cor|Editar cor/).should('be.visible')
  })
})
