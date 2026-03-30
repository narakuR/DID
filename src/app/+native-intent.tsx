type RedirectSystemPathOptions = {
  path: string;
  initial: boolean;
};

function normalizePath(path: string): string {
  if (!path) {
    return '/';
  }

  if (
    path.startsWith('did://oid4vci') ||
    path.startsWith('did://oid4vp') ||
    path.startsWith('exp+did://oid4vci') ||
    path.startsWith('exp+did://oid4vp')
  ) {
    return '/';
  }

  if (
    path.startsWith('/oid4vci') ||
    path.startsWith('/oid4vp') ||
    path.startsWith('oid4vci') ||
    path.startsWith('oid4vp')
  ) {
    return '/';
  }

  return path;
}

export function redirectSystemPath({ path }: RedirectSystemPathOptions): string {
  return normalizePath(path);
}
