export interface ODBCConfig {
  server: string;
  port: string;
  database: string;
  username: string;
  password: string;
  driver: string;
}

export const buildConnectionString = (config: ODBCConfig): string => {
  return `Driver={${config.driver}};Server=${config.server},${config.port};Database=${config.database};Uid=${config.username};Pwd=${config.password};Encrypt=yes;TrustServerCertificate=yes;`;
};

export const generateNodeScript = (connString: string): string => {
  return `const odbc = require('odbc');

async function connect() {
  try {
    const connection = await odbc.connect(\`${connString}\`);
    const result = await connection.query('SELECT * FROM mytable');
    console.log(result);
    await connection.close();
  } catch (err) {
    console.error(err);
  }
}

connect();`;
};

export const DEFAULT_ODBC_CONFIG: ODBCConfig = {
  server: '',
  port: '1433',
  database: '',
  username: '',
  password: '',
  driver: 'ODBC Driver 17 for SQL Server',
};
