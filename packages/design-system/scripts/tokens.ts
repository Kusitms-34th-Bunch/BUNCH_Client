type Token = {
  $type: string;
  $value: unknown;
  path: string[];
  tier: 'primitive' | 'semantic';
};

const kebab = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
const variable = (token: Token) => {
  const path = token.path.map(kebab);
  if (token.tier === 'primitive')
    path[path.length - 1] = path.at(-1)!.replace(/^color-primitive-/, '');
  const name = path.reduce((parent, child) => {
    if (child === parent || child.startsWith(`${parent}-`)) return child;
    return parent ? `${parent}-${child}` : child;
  }, '');
  return `--${token.tier}-${name}`;
};
const weights: Record<string, number> = { Regular: 400, Medium: 500, SemiBold: 600, Bold: 700 };

export function buildTokenCss(source: Record<string, unknown>): string {
  if (Array.isArray(source.$themes) && source.$themes.length) {
    throw new Error('Theme selection is required before exporting multiple themes.');
  }
  const tokens = new Map<string, Token>();
  const names = new Set<string>();
  function collect(node: unknown, path: string[], tier: Token['tier']) {
    if (!node || typeof node !== 'object' || Array.isArray(node))
      throw new Error(`Invalid token group: ${path.join('.')}`);
    const record = node as Record<string, unknown>;
    if (Object.hasOwn(record, '$value')) {
      if (typeof record.$type !== 'string')
        throw new Error(`Missing token type: ${path.join('.')}`);
      const token: Token = { $type: record.$type, $value: record.$value, path, tier };
      const key = path.join('.');
      if (tokens.has(key) || names.has(variable(token))) throw new Error(`Duplicate token: ${key}`);
      tokens.set(key, token);
      names.add(variable(token));
      return;
    }
    for (const [key, child] of Object.entries(record)) {
      if (!key.startsWith('$')) collect(child, [...path, key], tier);
    }
  }
  for (const [set, tree] of Object.entries(source)) {
    if (set.startsWith('$')) continue;
    if (set !== 'Primitive/Mode 1' && set !== 'Semantic/Mode 1')
      throw new Error(`Unsupported token set: ${set}`);
    collect(tree, [], set.startsWith('Primitive/') ? 'primitive' : 'semantic');
  }
  if (!tokens.size) throw new Error('No design tokens found.');

  const visiting = new Set<string>();
  const visited = new Set<string>();
  function validateValue(value: unknown) {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/\{([^{}]+)\}/g)) validateReference(match[1]!);
    } else if (value && typeof value === 'object') {
      for (const child of Object.values(value)) validateValue(child);
    }
  }
  function validateReference(key: string) {
    if (visiting.has(key)) throw new Error(`Circular token reference: ${key}`);
    if (visited.has(key)) return;
    const token = tokens.get(key);
    if (!token) throw new Error(`Missing token reference: ${key}`);
    visiting.add(key);
    validateValue(token.$value);
    visiting.delete(key);
    visited.add(key);
  }
  for (const key of tokens.keys()) validateReference(key);

  function scalar(value: unknown, unit = ''): string {
    if (typeof value !== 'number' && typeof value !== 'string')
      throw new Error(`Invalid scalar: ${String(value)}`);
    const text = String(value);
    if (/[;\n\r]/.test(text)) throw new Error('Invalid CSS token value.');
    if (/^-?\d+(\.\d+)?$/.test(text)) return `${text}${unit}`;
    return text.replace(/\{([^{}]+)\}/g, (_, key: string) => `var(${variable(tokens.get(key)!)})`);
  }
  function cssValue(token: Token): string {
    const group = token.path[0];
    const value = token.$value;
    if (token.$type === 'boxShadow') {
      const shadows = Array.isArray(value) ? value : [value];
      return shadows
        .map((shadow: Record<string, unknown>) => {
          if (!shadow || !['dropShadow', 'innerShadow'].includes(String(shadow.type)))
            throw new Error('Unsupported shadow.');
          return `${shadow.type === 'innerShadow' ? 'inset ' : ''}${['x', 'y', 'blur', 'spread'].map((key) => scalar(shadow[key], 'px')).join(' ')} ${scalar(shadow.color)}`;
        })
        .join(', ');
    }
    if (token.$type === 'color') {
      return scalar(value).replace(
        /rgba\((#[a-fA-F0-9]{6}),\s*(.+)\)$/,
        'color-mix(in srgb, $1 $2, transparent)',
      );
    }
    if (group === 'Font Family') return JSON.stringify(scalar(value));
    if (token.$type === 'fontWeights') return scalar(weights[String(value)] ?? value);
    if (group === 'Opacity') return scalar(value, '%');
    if (token.$type === 'textCase' || token.$type === 'textDecoration' || group === 'Font Weight')
      return scalar(value);
    if (
      ['number', 'dimension', 'fontSizes', 'letterSpacing', 'paragraphSpacing'].includes(
        token.$type,
      )
    )
      return scalar(value, 'px');
    throw new Error(`Unsupported token type: ${token.$type}`);
  }

  const declarations: Record<Token['tier'], string[]> = { primitive: [], semantic: [] };
  const theme: string[] = [];
  const utilities: string[] = [];
  const themeNames = new Set<string>();
  const utilityNames = new Set<string>();
  for (const token of [...tokens.values()].sort((a, b) =>
    variable(a).localeCompare(variable(b), 'en'),
  )) {
    if (token.$type === 'typography') {
      const name = `typography-${kebab(token.path.at(-1)!)}`;
      if (utilityNames.has(name)) throw new Error(`Duplicate typography utility: ${name}`);
      utilityNames.add(name);
      const value = token.$value as Record<string, unknown>;
      if (!value || typeof value !== 'object') throw new Error(`Invalid typography: ${name}`);
      if (value.paragraphSpacing !== undefined) {
        const spacing =
          typeof value.paragraphSpacing === 'string' && /^\{[^{}]+\}$/.test(value.paragraphSpacing)
            ? tokens.get(value.paragraphSpacing.slice(1, -1))?.$value
            : value.paragraphSpacing;
        if (Number(spacing) !== 0)
          throw new Error(`Nonzero paragraph spacing requires a paragraph layout: ${name}`);
      }
      const properties: Record<string, string> = {
        fontFamily: 'font-family',
        fontWeight: 'font-weight',
        fontSize: 'font-size',
        lineHeight: 'line-height',
        letterSpacing: 'letter-spacing',
        paragraphIndent: 'text-indent',
        textCase: 'text-transform',
        textDecoration: 'text-decoration',
      };
      const lines = Object.entries(properties)
        .filter(([key]) => value[key] !== undefined)
        .map(([key, property]) => {
          let converted = scalar(
            value[key],
            ['fontSize', 'lineHeight', 'letterSpacing', 'paragraphIndent'].includes(key)
              ? 'px'
              : '',
          );
          if (key === 'fontWeight') converted = String(weights[converted] ?? converted);
          if (key === 'fontFamily' && !converted.startsWith('var('))
            converted = JSON.stringify(converted);
          return `  ${property}: ${converted};`;
        });
      utilities.push(`@utility ${name} {\n${lines.join('\n')}\n}`);
      continue;
    }
    const converted = cssValue(token);
    declarations[token.tier].push(`  ${variable(token)}: ${converted};`);
    const leaf = kebab(token.path.at(-1)!);
    let themeName: string | undefined;
    if (token.$type === 'color') {
      const category = converted.startsWith('linear-gradient(') ? 'background-image' : 'color';
      themeName = `--${category}-${token.tier === 'primitive' ? `primitive-${leaf.replace(/^color-primitive-/, '')}` : leaf}`;
    } else if (token.$type === 'boxShadow') themeName = `--shadow-${leaf.replace(/^shadow-/, '')}`;
    else if (token.path[0] === 'Radius') themeName = `--radius-${leaf.replace(/^radius-/, '')}`;
    else if (['Spacing', 'Padding'].includes(token.path[0]!))
      themeName = `--spacing-${leaf.replace(/^spacing-/, '')}`;
    if (themeName) {
      if (themeNames.has(themeName)) throw new Error(`Duplicate Tailwind token: ${themeName}`);
      themeNames.add(themeName);
      theme.push(`  ${themeName}: var(${variable(token)});`);
    }
  }
  return (
    [
      '/* Generated by yarn tokens:build. Do not edit. */',
      `/* Primitive: raw design values. */\n:root {\n${declarations.primitive.join('\n')}\n}`,
      `/* Semantic: references preserve design intent. */\n:root {\n${declarations.semantic.join('\n')}\n}`,
      `@theme inline {\n${theme.join('\n')}\n}`,
      ...utilities,
    ].join('\n\n') + '\n'
  );
}
