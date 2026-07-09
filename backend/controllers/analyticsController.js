import { listLRs } from '../lib/repositories/lrsRepository.js';

export const getBusinessComparison = async (req, res) => {
  try {
    const {
      periodA_start: periodAStart,
      periodA_end: periodAEnd,
      periodB_start: periodBStart,
      periodB_end: periodBEnd,
      customerId,
    } = req.query;

    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
      return res.status(400).json({
        error: 'Missing required query parameters',
        required: ['periodA_start', 'periodA_end', 'periodB_start', 'periodB_end'],
      });
    }

    const parseDate = (value) => (value ? new Date(value) : undefined);

    const getPeriodMetrics = async (startDate, endDate, code) => {
      const lrs = await listLRs({ fromDate: startDate, toDate: endDate, customerCode: code, user: req.user });

      return {
        revenue: lrs.reduce((sum, lr) => sum + (Number(lr.charges?.total) || 0), 0),
        lrCount: lrs.length,
      };
    };

    const [periodA, periodB] = await Promise.all([
      getPeriodMetrics(parseDate(periodAStart), parseDate(periodAEnd), customerId),
      getPeriodMetrics(parseDate(periodBStart), parseDate(periodBEnd), customerId),
    ]);

    return res.json({ periodA, periodB });
  } catch (error) {
    console.error('Business comparison error:', error);
    return res.status(500).json({ error: 'Failed to compute business comparison' });
  }
};

