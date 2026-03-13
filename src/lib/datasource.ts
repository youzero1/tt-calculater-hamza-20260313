import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CalculationHistory } from './entities/CalculationHistory';
import path from 'path';

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), 'database.sqlite');

let dataSource: DataSource | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }

  dataSource = new DataSource({
    type: 'better-sqlite3',
    database: dbPath,
    entities: [CalculationHistory],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();
  return dataSource;
}
