export function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const url = new URL(request.url);
  const bearer = request.headers.get("authorization");
  const querySecret = url.searchParams.get("secret");

  return bearer === `Bearer ${secret}` || querySecret === secret;
}
