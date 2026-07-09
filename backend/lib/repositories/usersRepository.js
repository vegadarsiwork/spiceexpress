import bcrypt from 'bcryptjs';
import { query, sql, txRequest, withTransaction } from '../sqlServer.js';
import { mapUser } from './legacyMappers.js';

const USER_SELECT = `
  SELECT u.*, r.ROLE_NAME
  FROM dbo.USER_MANAGEMENT u
  LEFT JOIN dbo.ROLE_MASTER r ON r.ROLE_ID = u.ROLE_ID
`;

export async function findUserById(id) {
  const result = await query(`${USER_SELECT} WHERE u.USERID = @id`, {
    id: { type: sql.Int, value: Number(id) },
  });
  return mapUser(result.recordset[0]);
}

export async function findUserForLogin(identifier) {
  const result = await query(
    `${USER_SELECT}
     WHERE LOWER(u.EMAIL) = LOWER(@identifier)
        OR LOWER(u.USERNAME) = LOWER(@identifier)
        OR LOWER(u.USERCODE) = LOWER(@identifier)`,
    { identifier: { type: sql.NVarChar(255), value: identifier } },
  );
  return mapUser(result.recordset[0]);
}

export async function verifyPassword(rawPassword, storedPassword) {
  if (!storedPassword) return false;
  if (String(storedPassword).startsWith('$2')) {
    return bcrypt.compare(rawPassword, storedPassword);
  }
  return String(rawPassword) === String(storedPassword);
}

export async function emailExists(email) {
  const result = await query('SELECT TOP 1 USERID FROM dbo.USER_MANAGEMENT WHERE LOWER(EMAIL) = LOWER(@email)', {
    email: { type: sql.NVarChar(255), value: email },
  });
  return Boolean(result.recordset[0]);
}

export async function createUser({ name, email, password, roleId = 2 }) {
  const hashedPassword = await bcrypt.hash(password, 12);
  const userId = await withTransaction(async (transaction) => {
    const next = await txRequest(transaction).query(
      'SELECT ISNULL(MAX(USERID), 0) + 1 AS nextId FROM dbo.USER_MANAGEMENT WITH (UPDLOCK, HOLDLOCK)',
    );
    const userId = next.recordset[0].nextId;
    const fullName = name || email;
    const username = String(email).split('@')[0].slice(0, 20);
    await txRequest(transaction, {
      userId: { type: sql.Int, value: userId },
      roleId: { type: sql.Int, value: roleId },
      username: { type: sql.NVarChar(20), value: username },
      password: { type: sql.NVarChar(255), value: hashedPassword },
      fullName: { type: sql.NVarChar(75), value: fullName.slice(0, 75) },
      firstName: { type: sql.NVarChar(50), value: (fullName.split(' ')[0] || fullName).slice(0, 50) },
      lastName: { type: sql.NVarChar(50), value: fullName.split(' ').slice(1).join(' ').slice(0, 50) },
      email: { type: sql.NVarChar(150), value: email },
      isActive: { type: sql.Bit, value: true },
      createdBy: { type: sql.NVarChar(50), value: 'api' },
      createdDate: { type: sql.DateTime, value: new Date() },
    }).query(`
      INSERT INTO dbo.USER_MANAGEMENT
        (USERID, ROLE_ID, USERCODE, USERNAME, PASSWORD, FULLNAME, FIRSTNAME, LASTNAME, EMAIL, ISACTIVE, CREATED_BY, CREATED_DATE)
      VALUES
        (@userId, @roleId, @username, @username, @password, @fullName, @firstName, @lastName, @email, @isActive, @createdBy, @createdDate)
    `);
    return userId;
  });
  return findUserById(userId);
}

export async function updateUser(id, fields) {
  const updates = [];
  const params = { id: { type: sql.Int, value: Number(id) } };
    const fieldMap = {
    name: ['FULLNAME', sql.NVarChar(75)],
    phone: ['PHONE', sql.NVarChar(15)],
    address: ['ADDRESS', sql.NVarChar(250)],
    avatar: ['AVATAR', sql.NVarChar(500)],
    company: ['COMPANY_CODE', sql.NVarChar(20)],
  };

  for (const [key, value] of Object.entries(fields)) {
    if (!fieldMap[key]) continue;
    const [column, type] = fieldMap[key];
    updates.push(`${column} = @${key}`);
    params[key] = { type, value };
  }

  if (!updates.length) return findUserById(id);
  updates.push('LAST_EDITED_DATE = @editedDate');
  params.editedDate = { type: sql.DateTime, value: new Date() };

  const result = await query(`UPDATE dbo.USER_MANAGEMENT SET ${updates.join(', ')} WHERE USERID = @id`, params);
  if (!result.rowsAffected[0]) return null;
  return findUserById(id);
}
