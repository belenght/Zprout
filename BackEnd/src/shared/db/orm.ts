import { MikroORM } from "@mikro-orm/core";
import { MySqlDriver, defineConfig } from "@mikro-orm/mysql";
import { SqlHighlighter } from "@mikro-orm/sql-highlighter";
import { ReflectMetadataProvider } from "@mikro-orm/decorators/legacy"
import * as dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

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
  
  driverOptions: isProduction ? {
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