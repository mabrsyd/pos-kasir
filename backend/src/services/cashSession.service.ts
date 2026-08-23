import prisma from '../lib/prisma';
import { ValidationError, NotFoundError } from '../utils/errors';

export async function openCashSession(userId: string, openingBalance: number) {
  // Check if user already has an open session
  const existing = await prisma.cashSession.findFirst({
    where: { userId, status: 'OPEN' },
  });
  if (existing) {
    throw new ValidationError('Anda sudah memiliki sesi kasir yang aktif. Tutup sesi terlebih dahulu.');
  }

  const session = await prisma.cashSession.create({
    data: {
      userId,
      openingBalance,
      expectedBalance: openingBalance,
      status: 'OPEN',
    },
    include: { user: { select: { id: true, fullName: true } } },
  });

  return session;
}

export async function getCurrentSession(userId: string) {
  const session = await prisma.cashSession.findFirst({
    where: { userId, status: 'OPEN' },
    include: {
      user: { select: { id: true, fullName: true } },
      cashTransactions: { orderBy: { createdAt: 'desc' } },
    },
  });
  return session;
}

export async function closeCashSession(sessionId: string, actualBalance: number, notes: string | undefined, userId: string) {
  const session = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: { cashTransactions: true },
  });

  if (!session) throw new NotFoundError('Sesi kasir tidak ditemukan');
  if (session.status === 'CLOSED') throw new ValidationError('Sesi kasir sudah ditutup');
  if (session.userId !== userId) throw new ValidationError('Anda tidak dapat menutup sesi kasir orang lain');

  const expectedBalance = Number(session.expectedBalance);
  const difference = actualBalance - expectedBalance;

  const updated = await prisma.$transaction(async (tx) => {
    const closed = await tx.cashSession.update({
      where: { id: sessionId },
      data: {
        actualBalance,
        expectedBalance,
        difference,
        status: 'CLOSED',
        closedAt: new Date(),
        notes,
      },
      include: {
        user: { select: { id: true, fullName: true } },
        cashTransactions: { orderBy: { createdAt: 'desc' } },
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'CASH_CLOSING',
        entityType: 'CASH_SESSION',
        entityId: sessionId,
        newValues: {
          openingBalance: Number(session.openingBalance),
          expectedBalance,
          actualBalance,
          difference,
        },
        description: `Tutup kasir. Expected: ${expectedBalance}, Actual: ${actualBalance}, Selisih: ${difference}`,
      },
    });

    return closed;
  });

  return updated;
}

export async function addCashTransaction(
  sessionId: string,
  type: 'CASH_IN' | 'CASH_OUT',
  amount: number,
  description: string,
  userId: string
) {
  const session = await prisma.cashSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundError('Sesi kasir tidak ditemukan');
  if (session.status === 'CLOSED') throw new ValidationError('Sesi kasir sudah ditutup');

  const signedAmount = type === 'CASH_IN' ? Math.abs(amount) : -Math.abs(amount);

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.cashTransaction.create({
      data: {
        cashSessionId: sessionId,
        type,
        amount: signedAmount,
        description,
      },
    });

    await tx.cashSession.update({
      where: { id: sessionId },
      data: { expectedBalance: { increment: signedAmount } },
    });

    return transaction;
  });

  return result;
}
