export const isLocalHttpOrigin = (url: string | URL): boolean => {
  const parsed = typeof url === 'string' ? new URL(url) : url;
  const localHostnames = new Set(['localhost', '127.0.0.1', '::1']);
  return parsed.protocol === 'http:' && localHostnames.has(parsed.hostname);
};

export const rewriteSetCookieForLocalDev = (setCookie: string): string => {
  const [nameValue, ...attributes] = setCookie.split(';');
  const rewritten = attributes
    .map((attribute) => attribute.trim())
    .filter((attribute) => attribute && !attribute.toLowerCase().startsWith('domain='))
    .filter((attribute) => attribute.toLowerCase() !== 'secure')
    .map((attribute) => (attribute.toLowerCase() === 'samesite=none' ? 'SameSite=Lax' : attribute));

  return [nameValue, ...rewritten].join('; ');
};

export const splitSetCookieHeader = (headers: Headers): string[] => {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = getSetCookie?.call(headers);
  if (setCookies?.length) return setCookies;

  const setCookie = headers.get('set-cookie');
  if (!setCookie) return [];

  return setCookie.split(/,(?=\s*[^;,=\s]+=)/).map((segment) => segment.trim());
};

export const forwardSetCookies = (
  upstreamHeaders: Headers,
  responseHeaders: Headers,
  requestUrl: string | URL,
): void => {
  const rewrite = isLocalHttpOrigin(requestUrl);

  for (const setCookie of splitSetCookieHeader(upstreamHeaders)) {
    responseHeaders.append(
      'Set-Cookie',
      rewrite ? rewriteSetCookieForLocalDev(setCookie) : setCookie,
    );
  }
};
