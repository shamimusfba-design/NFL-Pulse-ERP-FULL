import { BadRequestException } from '@nestjs/common';

type JobNumberInput = {
  jobType?: 'NEW' | 'REPEAT';
  repeatBaseJobNo?: string;
  repeatLotNo?: string;
};

export async function resolveJobNumber(tx: any, factoryId: string, input: JobNumberInput) {
  const jobType = input.jobType || 'NEW';
  if (jobType === 'REPEAT') {
    const base = String(input.repeatBaseJobNo || '').trim();
    const lot = String(input.repeatLotNo || '').trim();
    if (!base) throw new BadRequestException('Repeat Job requires Base Job No');
    if (!/^\d+$/.test(base)) throw new BadRequestException('Base Job No must be numeric, e.g. 48515');
    if (!lot) throw new BadRequestException('Repeat Job requires Lot No, e.g. 1st');
    const jobNo = `${base} ${lot}`;
    const exists = await tx.order.findUnique({ where: { jobNo } });
    if (exists) throw new BadRequestException(`${jobNo} already exists`);
    return { jobNo, baseJobNo: base, lotNo: lot, jobType };
  }

  const year = 0; // global running Job sequence; does not reset each calendar year
  const seq = await tx.jobSequence.upsert({
    where: { factoryId_year: { factoryId, year } },
    update: { lastValue: { increment: 1 } },
    create: { factoryId, year, lastValue: 1 },
  });
  return { jobNo: String(seq.lastValue), baseJobNo: String(seq.lastValue), lotNo: null, jobType: 'NEW' as const };
}
