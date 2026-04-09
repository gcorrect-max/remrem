// JWT is stateless – logout is handled client-side by discarding the token.
// This endpoint exists for completeness (e.g. future token blacklist).
export default defineEventHandler(() => {
  return { success: true }
})
