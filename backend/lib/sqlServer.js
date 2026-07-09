import sql from 'mssql';

let poolPromise;

const truthy = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

export function getSqlConfig() {
  const missing = ['MSSQL_HOST', 'MSSQL_USER', 'MSSQL_PASSWORD'].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing SQL Server env vars: ${missing.join(', ')}`);
  }
  const port = process.env.MSSQL_PORT ? Number(process.env.MSSQL_PORT) : undefined;
  const instanceName = port ? '' : process.env.MSSQL_INSTANCE || '';

  const config = {
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE || 'CMSDB_21052026',
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    pool: {
      max: Number(process.env.MSSQL_POOL_MAX || 10),
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: {
      encrypt: truthy(process.env.MSSQL_ENCRYPT, false),
      trustServerCertificate: truthy(process.env.MSSQL_TRUST_CERT, true),
      enableArithAbort: true,
      ...(instanceName ? { instanceName } : {}),
    },
    requestTimeout: Number(process.env.MSSQL_REQUEST_TIMEOUT || 30000),
    connectionTimeout: Number(process.env.MSSQL_CONNECTION_TIMEOUT || 15000),
  };

  if (port) config.port = port;
  return config;
}

export async function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(getSqlConfig());
  }
  return poolPromise;
}

export async function closePool() {
  if (!poolPromise) return;
  const pool = await poolPromise;
  poolPromise = undefined;
  await pool.close();
}

export function bindInputs(request, params = {}) {
  for (const [name, param] of Object.entries(params)) {
    if (param && typeof param === 'object' && 'type' in param) {
      request.input(name, param.type, param.value);
    } else {
      request.input(name, param);
    }
  }
  return request;
}

export async function query(queryText, params = {}) {
  const pool = await getPool();
  const request = bindInputs(pool.request(), params);
  return request.query(queryText);
}

export async function withTransaction(callback) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export function txRequest(transaction, params = {}) {
  return bindInputs(new sql.Request(transaction), params);
}

export { sql };
