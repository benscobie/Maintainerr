import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const dataDirEnv = (process.env.DATA_DIR ?? '/opt/data').replace(/\/$/, '');
const appDirEnv = (process.env.APP_DIR ?? '/opt/app').replace(/\/$/, '');

const ormConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  logging: false,
  database:
    process.env.NODE_ENV === 'production'
      ? `${dataDirEnv}/maintainerr.sqlite`
      : '../data/maintainerr.sqlite',
  subscribers: ['./**/*.subscriber{.ts,.js}'],
  migrations:
    process.env.NODE_ENV === 'production'
      ? [`${appDirEnv}/server/database/migrations/**/*{.js,.ts}`] // TODO: Update this path for the archives
      : ['./dist/database/migrations/**/*{.js,.ts}'],
  autoLoadEntities: true,
  migrationsRun: true,
};
export default ormConfig;
