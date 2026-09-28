import { BadRequestException } from '@nestjs/common';

type JobNumberInput = {
  jobType?: 'NEW' | 'REPEAT';
  repeatBaseJobNo?: string;
  repeatLotNo?: string;
};

const BUYER_SHORT_CODE: Record<string, string> = {
  ONLY: 'ONL',
  ONL: 'ONL',
  ONLYSONS: 'ONS',
  'ONLY&SONS': 'ONS',
  'ONLY & SONS': 'ONS',
  ONS: 'ONS',
  NAMEIT: 'NMT',
  'NAME IT': 'NMT',
  NMT: 'NMT',
  OVS: 'OVS',
  UTG: 'UTG',
};

export function buyerShortCode(value?: string | null) {
  const raw = String(value || '').trim().toUpperCase();
  const compact = raw.replace(/\s+/g, '');
  return BUYER_SHORT_CODE[raw] || BUYER_SHORT_CODE[compact] || raw.replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'JOB';
}

function numericBase(value: string) {
  const matches = String(value || '').match(/\d+/g);
  return matches?.length ? matches[matches.length - 1] : '';
}

export async function resolveJobNumber(tx: any, factoryId: string, input: JobNumberInput, buyerCode: string) {
  const shortCode = buyerShortCode(buyerCode);
  const jobType = input.jobType || 'NEW';
  if (jobType === 'REPEAT') {
    const base = numericBase(String(input.repeatBaseJobNo || '').trim());
    const lot = String(input.repeatLotNo || '').trim();
    if (!base) throw new BadRequestException('Repeat Job requires Base Job No, e.g. 47502');
    if (!lot) throw new BadRequestException('Repeat Job requires Lot No, e.g. 1st');
    const jobNo = `${shortCode} ${base} ${lot}`;
    const exists = await tx.order.findUnique({ where: { jobNo } });
    if (exists) throw new BadRequestException(`${jobNo} already exists`);
    return { jobNo, baseJobNo: base, lotNo: lot, buyerShortCode: shortCode, jobType };
  }

  const year = 0; // one global running sequence; never resets by year or buyer
  const seq = await tx.jobSequence.upsert({
    where: { factoryId_year: { factoryId, year } },
    update: { lastValue: { increment: 1 } },
    create: { factoryId, year, lastValue: 1 },
  });
  return { jobNo: `${shortCode} ${seq.lastValue}`, baseJobNo: String(seq.lastValue), lotNo: null, buyerShortCode: shortCode, jobType: 'NEW' as const };
}
