import { MikroORM, RequestContext } from "@mikro-orm/core";
import { MySqlDriver, defineConfig } from "@mikro-orm/mysql";
import { SqlHighlighter } from "@mikro-orm/sql-highlighter";
import { ReflectMetadataProvider } from "@mikro-orm/decorators/legacy"
import * as dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// DB_SSL es independiente de NODE_ENV: permite conectar con SSL (ej. Aiven)
// sin tener que forzar NODE_ENV=production en desarrollo local.
// - No definís DB_SSL -> se usa SSL solo si NODE_ENV=production (comportamiento anterior).
// - DB_SSL=true       -> fuerza SSL (usalo para apuntar a Aiven en desarrollo).
// - DB_SSL=false      -> fuerza sin SSL (usalo para MySQL local sin TLS).
const useSSL = process.env.DB_SSL !== undefined
  ? process.env.DB_SSL === 'true'
  : isProduction;

if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_HOST || !process.env.DB_PORT || !process.env.NODE_ENV)  {
    console.error('FATAL ERROR: Las variables de entorno de la base de datos no están todas configuradas.');
    process.exit(1);
}
export const ormConfig = defineConfig({
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  metadataProvider: ReflectMetadataProvider,
  
  dbName: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  
  highlighter: new SqlHighlighter(),
  
  debug: !isProduction, 
  
  driverOptions: useSSL ? {
    connection: {
      ssl: { rejectUnauthorized: false }
    }
  } : {},

  schemaGenerator: {
    disableForeignKeys: true,
    createForeignKeyConstraints: true,
    ignoreSchema: [],
  },
});

export const initORM = async (): Promise<MikroORM<MySqlDriver>> => {
  return await MikroORM.init<MySqlDriver>(ormConfig);
};

/**
 * Devuelve el EntityManager del RequestContext de la petición actual.
 * Usar SIEMPRE esto dentro de los controllers (nunca orm.em directamente),
 * ya que app.ts crea un RequestContext por cada request en el punto 3.
 */
export const getEM = () => {
  const em = RequestContext.getEntityManager();
  if (!em) {
    throw new Error('No hay EntityManager en el contexto actual. Revisar el middleware de RequestContext en app.ts.');
  }
  return em;
};

export const syncSchema = async (orm: MikroORM<MySqlDriver>) => {
  try {
    const updateSql = await orm.schema.getUpdateSchemaSQL({ safe: true });
    

    if (updateSql) {
        await orm.schema.execute(updateSql);
        console.log('Esquema de Base de Datos Sincronizado');
    } else {
        console.log('El esquema ya está actualizado, no requiere sincronización.');
    }
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message?.includes('already exists')) {
        console.warn('La tabla ya existía, omitiendo creación. El servidor continuará iniciando.');
    } else {
        console.error('Error menor sincronizando esquema (ignorando para iniciar):', error.message);
    }
  }
};