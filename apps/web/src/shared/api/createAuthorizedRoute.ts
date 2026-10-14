import { ApiError, isApiError } from '@app/api-core';
import { NextResponse, type NextRequest } from 'next/server';
import { parseRequestBody } from './requestBody';

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
  const accessTokenCookieName = options.accessTokenCookieName ?? 'accessToken';

  return async (...[request, context]: RouteHandlerArgs<Params>): Promise<Response> => {
    const accessToken = request.cookies.get(accessTokenCookieName)?.value;

    if (!accessToken) {
      return NextResponse.json(
        { message: options.unauthorizedMessage ?? '인증이 필요합니다' },
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
      if (isApiError(error)) {
        return NextResponse.json(
          { message: error.message, code: error.code },
          { status: error.status ?? 500 },
        );
      }

      const normalized = new ApiError({
        message: 'Internal Server Error',
        category: 'unknown',
        cause: error,
      });
      return NextResponse.json({ message: normalized.message }, { status: 500 });
    }
  };
};
