import { User } from '@/types';

const REMOVED_USER_EMAILS = new Set([
  'gestor@great.com',
  'comercial@great.com',
  'feliperangel.rego03@gmail.com',
  'design@great.com',
  'coordenador@great.com',
  'editor@great.com',
  'atendente@great.com',
  'bruno@great.com',
  'pedroojuann1@gmail.com',
  'cled@great.com',
  'hebert@great.com',
  'miguel@great.com',
  'felipe@great.com',
  'admin@teste.com',
  'isaquegreatsd@gmail.com',
  'gugaliraclash@gmail.com',
  'freitasviih00@gmail.com',
  'gersonlopesgreat@gmail.com',
  'ocdremex@gmail.com',
  'kauananderson1919@gmail.com',
  'amandagreatsd@gmail.com',
]);

const INITIAL_USERS: (User & { password: string })[] = [
  {
    id: 'test-user-1',
    name: 'Usuario Teste',
    email: 'user@teste.com',
    password: '123456',
    role: 'ATENDENTE',
    teamId: 'team-1',
    active: true,
    createdAt: new Date(),
  },
  {
    id: '3b1e0190-7985-409c-b7a9-f544a86fbb9d',
    name: 'Natalia Ribeiro',
    email: 'natalia.ribeiro@great.local',
    password: 'Great2026!',
    role: 'DESIGN',
    teamId: 'team-1',
    active: true,
    createdAt: new Date(),
  },
  {
    id: '56fded44-04d3-4b4a-a420-c1b5296416fa',
    name: 'Jeferson Luiz',
    email: 'luiz46340@gmail.com',
    password: 'Great2026!',
    role: 'GESTOR',
    teamId: 'team-1',
    active: true,
    createdAt: new Date(),
  },
  {
    id: '48558d23-4c6c-4c40-bae5-318691a5e356',
    name: 'Carlos André',
    email: 'ci.andrade99@gmail.com',
    password: 'Great2026!',
    role: 'GESTOR',
    teamId: 'team-1',
    active: true,
    createdAt: new Date(),
  },
];

export function getAuthSeedUsers() {
  return INITIAL_USERS;
}

export function getRemovedAuthEmails() {
  return REMOVED_USER_EMAILS;
}

