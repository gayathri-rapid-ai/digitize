export type ThemeName = 'simple-light' | 'simple-dark';
export type Theme = { name: ThemeName; label: string; tokens: Record<string, string> };
export type ResolvedTheme = { name: string; version: number; configuration: Record<string, string> };

const layout = {
  '--home-columns': '3', '--products-columns': '3', '--collections-columns': '3',
  '--orders-columns': '1', '--card-border': '1px', '--card-radius': '8px',
};

export const themes: Theme[] = [
  { name: 'simple-light', label: 'Simple light', tokens: { ...layout, '--store-bg': '#f7f7f5', '--store-ink': '#181a18', '--store-accent': '#dff45f', '--store-muted': '#697069', '--store-line': '#dedfda' } },
  { name: 'simple-dark', label: 'Simple dark', tokens: { ...layout, '--store-bg': '#171918', '--store-ink': '#f4f5f2', '--store-accent': '#dff45f', '--store-muted': '#a7ada6', '--store-line': '#363a36' } },
];

export function themeStyle(name: ThemeName): Record<string, string> { return themes.find(theme => theme.name === name)?.tokens ?? themes[0].tokens; }
export function resolvedThemeStyle(theme: ThemeName | ResolvedTheme): Record<string, string> { return typeof theme === 'string' ? themeStyle(theme) : theme.configuration; }
