/**
 * Admin authentication helper.
 * All admin endpoints import this function to validate requests.
 *
 * Auth scheme: Authorization header must exactly match the ADMIN_SECRET env var.
 * Example header: Authorization: your-secret-value
 */
export function validateAdminAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization')
  const adminSecret = process.env.ADMIN_SECRET

  if (!adminSecret) {
    console.error('[admin] ADMIN_SECRET env var is not set — all admin requests will be rejected')
    return false
  }

  if (!authHeader) {
    return false
  }

  return authHeader === adminSecret
}
