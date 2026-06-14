import { z } from 'zod';

const uuid = z.string().uuid();
const currency = z.enum(['INR', 'USD']);
const splitType = z.enum(['EQUAL', 'PERCENTAGE', 'EXACT']);
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const authSchemas = {
  register: z.object({
    body: z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8)
    })
  }),
  login: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(1)
    })
  })
};

export const groupSchemas = {
  create: z.object({
    body: z.object({
      name: z.string().min(2),
      baseCurrency: currency.default('INR')
    })
  }),
  update: z.object({
    params: z.object({ groupId: uuid }),
    body: z.object({
      name: z.string().min(2).optional(),
      baseCurrency: currency.optional()
    })
  }),
  member: z.object({
    params: z.object({ groupId: uuid }),
    body: z.object({
      userId: uuid.optional(),
      email: z.string().email().optional(),
      joinDate: dateString.optional(),
      leaveDate: dateString.optional()
    }).refine((body) => body.userId || body.email, {
      message: 'Either userId or email is required'
    })
  })
};

export const expenseBodySchema = z.object({
  description: z.string().min(1),
  category: z.string().min(1).default('General'),
  amount: z.coerce.number().positive(),
  currency,
  expenseDate: dateString,
  paidBy: uuid,
  splitType,
  participants: z.array(
    z.object({
      userId: uuid,
      percentage: z.coerce.number().optional(),
      exactAmount: z.coerce.number().optional()
    })
  ).min(1)
});

export const expenseSchemas = {
  create: z.object({
    params: z.object({ groupId: uuid }),
    body: expenseBodySchema
  }),
  update: z.object({
    params: z.object({ expenseId: uuid }),
    body: expenseBodySchema.extend({ groupId: uuid.optional() })
  })
};

export const settlementSchemas = {
  create: z.object({
    params: z.object({ groupId: uuid }),
    body: z.object({
      payerId: uuid,
      receiverId: uuid,
      amount: z.coerce.number().positive(),
      currency,
      settlementDate: dateString,
      note: z.string().optional()
    })
  })
};

export const exchangeRateSchemas = {
  create: z.object({
    body: z.object({
      sourceCurrency: currency,
      targetCurrency: currency,
      rate: z.coerce.number().positive(),
      effectiveDate: dateString
    })
  })
};
