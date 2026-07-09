export function serializeUser(user) {
  if (!user) return null;
  return {
    ...user,
    _id: user.id,
    passwordHash: undefined,
  };
}

export function serializeCustomer(customer) {
  if (!customer) return null;
  return {
    ...customer,
    _id: customer.id,
  };
}

export function serializeLR(lr) {
  if (!lr) return null;
  return {
    ...lr,
    _id: lr.id,
    customer: lr.customerId || lr.customer || undefined,
  };
}

export function serializeInvoice(invoice) {
  if (!invoice) return null;
  const lrList = invoice.lrLinks
    ? invoice.lrLinks
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
        .map((link) => serializeLR(link.lr))
    : invoice.lrList;

  return {
    ...invoice,
    _id: invoice.id,
    lrList: lrList || [],
    lrLinks: undefined,
  };
}

export function serializeAnnexure(annexure) {
  if (!annexure) return null;
  return {
    ...annexure,
    _id: annexure.id,
    lrId: annexure.lr ? serializeLR(annexure.lr) : annexure.lrId,
  };
}

