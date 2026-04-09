import postgres from 'postgres'

let _sql: ReturnType<typeof postgres> | null = null

export function useDb() {
  if (_sql) return _sql

  const config = useRuntimeConfig()

  _sql = postgres({
    host:     process.env.POSTGRES_HOST     ?? 'localhost',
    port:     Number(process.env.POSTGRES_PORT ?? 5432),
    database: process.env.POSTGRES_DB       ?? 'remview',
    username: process.env.POSTGRES_USER     ?? 'remview',
    password: process.env.POSTGRES_PASSWORD ?? 'remview123',
    max:      10,                   // connection pool size
    idle_timeout: 30,
    connect_timeout: 10,
    onnotice: () => {},             // silence NOTICE messages
  })

  return _sql
}
