export type ThemeName = 'minimal' | 'classic' | 'bold';
export type Theme = { name: ThemeName; label: string; tokens: Record<string, string> };
export type ResolvedTheme = { name: string; version: number; configuration: Record<string, string> };

export const themes: Theme[] = [
  { name: 'minimal', label: 'Minimal', tokens: { '--store-bg': '#f7f6f1', '--store-ink': '#17211d', '--store-accent': '#e5ff62', '--store-muted': '#66716a', '--store-line': '#d9ddd5' } },
  { name: 'classic', label: 'Classic', tokens: { '--store-bg': '#fffdf8', '--store-ink': '#29231d', '--store-accent': '#bd7a42', '--store-muted': '#71685f', '--store-line': '#dfd4c8' } },
  { name: 'bold', label: 'Bold', tokens: { '--store-bg': '#12101d', '--store-ink': '#f7f0ff', '--store-accent': '#ff5c35', '--store-muted': '#c2b9cc', '--store-line': '#3c3649' } },
];

export function themeStyle(name: ThemeName): Record<string, string> { return themes.find(theme => theme.name === name)?.tokens ?? themes[0].tokens; }
export function resolvedThemeStyle(theme: ThemeName | ResolvedTheme): Record<string, string> { return typeof theme === 'string' ? themeStyle(theme) : theme.configuration; }
