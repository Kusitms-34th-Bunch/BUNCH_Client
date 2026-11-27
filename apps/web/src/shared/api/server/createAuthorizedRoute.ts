import { NextResponse, type NextRequest } from 'next/server';
import { authCookieNames } from './authCookies';
import { parseRequestBody } from './requestBody';
import { toErrorResponse } from './routeError';

export interface AuthorizedRouteContext<Body = unknown, Params = Record<string, string>> {
  accessToken: string;
  body: Body;
  params: Params;
  request: NextRequest;
}

export interface CreateAuthorizedRouteOptions {
  accessTokenCookieName?: string;
  unauthorizedMessage?: string;
}

type RouteHandlerArgs<Params> = [request: NextRequest, context: { params: Promise<Params> }];

export const createAuthorizedRoute = <Body = unknown, Params = Record<string, string>>(
  handler: (_ctx: AuthorizedRouteContext<Body, Params>) => Promise<unknown>,
  options: CreateAuthorizedRouteOptions = {},
) => {
  return async (...[request, context]: RouteHandlerArgs<Params>): Promise<Response> => {
    const accessTokenCookieName = options.accessTokenCookieName ?? authCookieNames(request).access;
    const accessToken = request.cookies.get(accessTokenCookieName)?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          message: options.unauthorizedMessage ?? '인증이 필요합니다',
          code: 'BFF_UNAUTHENTICATED',
        },
        { status: 401 },
      );
    }

    try {
      const body = (await parseRequestBody(request)) as Body;
      const params = await context.params;
      const result = await handler({ accessToken, body, params, request });

      if (result instanceof Response) return result;
      if (result === undefined) return new NextResponse(null, { status: 204 });
      return NextResponse.json(result);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
};
