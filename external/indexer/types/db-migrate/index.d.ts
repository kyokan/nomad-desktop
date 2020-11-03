declare module 'db-migrate' {
  interface Migrator {
    up (): Promise<void>

    reset (): Promise<void>
  }

  interface DBMigrateOpts {
    env: string
    config: string
    cwd: string
  }

  export function getInstance (isModule: boolean, options: DBMigrateOpts): Migrator
}