import { ApiError } from '../utils/ApiError.js';
import { toMoney } from './currencyService.js';

function requireParticipants(participants) {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new ApiError(400, 'At least one participant is required');
  }
}

export function buildParticipantShares({ splitType, baseAmount, participants }) {
  requireParticipants(participants);
  const amount = Number(baseAmount);

  if (splitType === 'EQUAL') {
    const share = toMoney(amount / participants.length);
    let assigned = 0;
    return participants.map((participant, index) => {
      const owed = index === participants.length - 1 ? toMoney(amount - assigned) : share;
      assigned = toMoney(assigned + owed);
      return { ...participant, percentage: null, exactAmount: null, owedBaseAmount: owed };
    });
  }

  if (splitType === 'PERCENTAGE') {
    const totalPercentage = participants.reduce((sum, participant) => sum + Number(participant.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new ApiError(400, 'Percentage split total must equal 100');
    }
    return participants.map((participant) => ({
      ...participant,
      exactAmount: null,
      owedBaseAmount: toMoney((amount * Number(participant.percentage)) / 100)
    }));
  }

  if (splitType === 'EXACT') {
    const totalExact = participants.reduce((sum, participant) => sum + Number(participant.exactAmount || 0), 0);
    if (Math.abs(totalExact - amount) > 0.01) {
      throw new ApiError(400, 'Exact split total must equal converted base amount');
    }
    return participants.map((participant) => ({
      ...participant,
      percentage: null,
      owedBaseAmount: toMoney(participant.exactAmount)
    }));
  }

  throw new ApiError(400, `Unsupported split type: ${splitType}`);
}
