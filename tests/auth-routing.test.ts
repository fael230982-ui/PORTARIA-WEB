import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessRole,
  getRouteForRole,
  resolveAuthenticatedRoute,
} from '../src/features/auth/access-control.ts';

test('resolveAuthenticatedRoute redireciona usuario anonimo para login', () => {
  const target = resolveAuthenticatedRoute({
    token: null,
    user: null,
    isAuthenticated: false,
    loading: false,
    hydrated: true,
  });

  assert.equal(target, '/login');
});

test('resolveAuthenticatedRoute redireciona por perfil autenticado', () => {
  assert.equal(
    resolveAuthenticatedRoute({
      token: 'token',
      user: { role: 'OPERADOR' },
      isAuthenticated: true,
      loading: false,
      hydrated: true,
    }),
    '/operacao'
  );

  assert.equal(
    resolveAuthenticatedRoute({
      token: 'token',
      user: { role: 'ADMIN' },
      isAuthenticated: true,
      loading: false,
      hydrated: true,
    }),
    '/admin'
  );

  assert.equal(
    resolveAuthenticatedRoute({
      token: 'token',
      user: { role: 'CENTRAL' },
      isAuthenticated: true,
      loading: false,
      hydrated: true,
    }),
    '/operacao'
  );
});

test('getRouteForRole trata papeis sem acesso conhecido como login', () => {
  assert.equal(getRouteForRole('MASTER'), '/admin');
  assert.equal(getRouteForRole('MORADOR'), '/login');
});

test('canAccessRole aplica allowedRoles quando informado', () => {
  assert.equal(canAccessRole('ADMIN', ['ADMIN', 'MASTER']), true);
  assert.equal(canAccessRole('OPERADOR', ['ADMIN', 'MASTER']), false);
  assert.equal(canAccessRole(null, ['ADMIN']), false);
});
