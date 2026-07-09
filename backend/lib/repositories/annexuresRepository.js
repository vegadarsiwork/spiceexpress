import { query, sql, txRequest, withTransaction } from '../sqlServer.js';
import { mapTrackingEvent } from './legacyMappers.js';
import { findLRByIdOrNumber } from './lrsRepository.js';

export async function createAnnexure({ lrId, status }, user) {
  const lr = await findLRByIdOrNumber(lrId, false);
  if (!lr) return null;
  return withTransaction(async (transaction) => {
    const next = await txRequest(transaction).query(
      'SELECT ISNULL(MAX(TBLROWID), 0) + 1 AS nextId FROM dbo.ORDER_DELIVERY WITH (UPDLOCK, HOLDLOCK)',
    );
    const id = next.recordset[0].nextId;
    await txRequest(transaction, {
      id: { type: sql.Int, value: id },
      orderId: { type: sql.Int, value: Number(lr.id) },
      status: { type: sql.NVarChar(50), value: status || 'Generated' },
      description: { type: sql.NVarChar(255), value: status || 'Annexure generated' },
      now: { type: sql.DateTime, value: new Date() },
      createdBy: { type: sql.NVarChar(50), value: user?.username || user?.email || 'api' },
    }).query(`
      INSERT INTO dbo.ORDER_DELIVERY (TBLROWID, ORDER_ID, STATUS_DATETIME, STATUS_CODE, STATUS_DESCR, CREATED_BY, CREATED_DATE)
      VALUES (@id, @orderId, @now, @status, @description, @createdBy, @now)
    `);
    return { id: String(id), _id: String(id), lrId: lr.id, status, generatedAt: new Date() };
  });
}

export async function listAnnexures(status) {
  const params = {};
  const where = status ? 'WHERE od.STATUS_CODE = @status OR od.STATUS_DESCR = @status' : '';
  if (status) params.status = { type: sql.NVarChar(100), value: status };
  const result = await query(`
    SELECT od.*
    FROM dbo.ORDER_DELIVERY od
    ${where}
    ORDER BY od.STATUS_DATETIME DESC, od.TBLROWID DESC
  `, params);
  return result.recordset.map((row) => {
    const event = mapTrackingEvent(row);
    return {
      id: event.id,
      _id: event.id,
      lrId: event.lrId,
      status: event.status,
      generatedAt: event.timestamp,
    };
  });
}
