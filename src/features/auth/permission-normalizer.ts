export const permissionLabels: Record<string, { module: string; label: string }> = {
  view_people: { module: 'Moradores', label: 'Visualizar' },
  manage_people: { module: 'Moradores', label: 'Gerenciar' },
  view_alerts: { module: 'Alertas', label: 'Visualizar' },
  manage_alerts: { module: 'Alertas', label: 'Gerenciar' },
  view_cameras: { module: 'Câmeras', label: 'Visualizar' },
  manage_cameras: { module: 'Câmeras', label: 'Gerenciar' },
  view_deliveries: { module: 'Encomendas', label: 'Visualizar' },
  manage_deliveries: { module: 'Encomendas', label: 'Gerenciar' },
  view_access_logs: { module: 'Logs de acesso', label: 'Visualizar' },
  manage_access_logs: { module: 'Logs de acesso', label: 'Gerenciar' },
  manage_facial: { module: 'Reconhecimento facial', label: 'Gerenciar' },
  manage_secondary_users: { module: 'Usuários', label: 'Gerenciar secundários' },
  manage_structures: { module: 'Estruturas', label: 'Gerenciar' },
  handle_events: { module: 'Operação', label: 'Tratar eventos' },
  manage_own_unit_contacts: { module: 'Unidade', label: 'Gerenciar contatos próprios' },
};

export const permissionAliases: Record<string, string> = {
  'people.view': 'view_people',
  'people:read': 'view_people',
  'people.read': 'view_people',
  'people.manage': 'manage_people',
  'people:manage': 'manage_people',
  'alerts.view': 'view_alerts',
  'alerts:read': 'view_alerts',
  'alerts.read': 'view_alerts',
  'alerts.manage': 'manage_alerts',
  'alerts:manage': 'manage_alerts',
  'cameras.view': 'view_cameras',
  'cameras:read': 'view_cameras',
  'cameras.read': 'view_cameras',
  'cameras.manage': 'manage_cameras',
  'cameras:manage': 'manage_cameras',
  'deliveries.view': 'view_deliveries',
  'deliveries:read': 'view_deliveries',
  'deliveries.read': 'view_deliveries',
  'deliveries.manage': 'manage_deliveries',
  'deliveries:create': 'manage_deliveries',
  'deliveries:manage': 'manage_deliveries',
  'access_logs.view': 'view_access_logs',
  'access-logs.view': 'view_access_logs',
  'access_logs:read': 'view_access_logs',
  'access_logs.manage': 'manage_access_logs',
  'access-logs.manage': 'manage_access_logs',
  'access_logs:manage': 'manage_access_logs',
  'facial.manage': 'manage_facial',
  'facial:manage': 'manage_facial',
  'secondary_users.manage': 'manage_secondary_users',
  'secondary-users.manage': 'manage_secondary_users',
  'secondary_users:manage': 'manage_secondary_users',
  'structures.manage': 'manage_structures',
  'structures:manage': 'manage_structures',
  'events.handle': 'handle_events',
  'events:handle': 'handle_events',
  'own_unit_contacts.manage': 'manage_own_unit_contacts',
  'own-unit-contacts.manage': 'manage_own_unit_contacts',
  'own_unit_contacts:manage': 'manage_own_unit_contacts',
};

export function normalizePermission(permission: string) {
  return permissionAliases[permission] ?? permission;
}

export function normalizePermissions(permissions?: string[] | null) {
  const source = Array.isArray(permissions) ? permissions : [];
  return Array.from(new Set(source.map((permission) => normalizePermission(permission))));
}

export function groupPermissions(permissions: string[]) {
  const groups = new Map<string, string[]>();

  permissions.forEach((permission) => {
    const normalizedPermission = normalizePermission(permission);
    const metadata = permissionLabels[normalizedPermission] ?? {
      module: 'Outros',
      label: permission,
    };

    const current = groups.get(metadata.module) ?? [];
    current.push(metadata.label);
    groups.set(metadata.module, current);
  });

  return Array.from(groups.entries()).map(([module, labels]) => ({
    module,
    labels,
  }));
}

export function summarizePermissionMatrix(currentPermissions: string[], officialPermissions: string[]) {
  const normalizedOfficialPermissions = normalizePermissions(officialPermissions);
  const normalizedCurrentPermissions = normalizePermissions(currentPermissions);
  const official = new Set(normalizedOfficialPermissions);
  const current = new Set(normalizedCurrentPermissions);

  return {
    aligned: normalizedCurrentPermissions.filter((permission) => official.has(permission)).length,
    custom: normalizedCurrentPermissions.filter((permission) => !official.has(permission)).length,
    missing: normalizedOfficialPermissions.filter((permission) => !current.has(permission)).length,
  };
}
