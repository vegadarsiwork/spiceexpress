import { createAnnexure as createAnnexureRecord, listAnnexures } from '../lib/repositories/annexuresRepository.js';
import { serializeAnnexure } from '../lib/serializers.js';

export const createAnnexure = async (req, res) => {
  try {
    const { lrId, status } = req.body;
    const annexure = await createAnnexureRecord({ lrId, status }, req.user);
    if (!annexure) return res.status(404).json({ error: 'LR not found' });
    res.status(201).json(serializeAnnexure(annexure));
  } catch (err) {
    console.error('Create annexure error:', err);
    res.status(500).json({ error: 'Failed to create annexure' });
  }
};

export const getAnnexures = async (req, res) => {
  try {
    const { status } = req.query;
    const annexures = await listAnnexures(status);
    res.json(annexures.map(serializeAnnexure));
  } catch (err) {
    console.error('Fetch annexures error:', err);
    res.status(500).json({ error: 'Failed to fetch annexures' });
  }
};
