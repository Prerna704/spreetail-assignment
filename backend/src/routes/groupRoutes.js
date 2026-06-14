import { Router } from 'express';
import {
  addMemberHandler,
  createGroupHandler,
  deleteGroupHandler,
  getGroup,
  listGroups,
  removeMemberHandler,
  updateGroupHandler
} from '../controllers/groupController.js';
import { validate } from '../middleware/validate.js';
import { groupSchemas } from '../validators/schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const groupRoutes = Router();

groupRoutes.get('/', asyncHandler(listGroups));
groupRoutes.post('/', validate(groupSchemas.create), asyncHandler(createGroupHandler));
groupRoutes.get('/:groupId', asyncHandler(getGroup));
groupRoutes.patch('/:groupId', validate(groupSchemas.update), asyncHandler(updateGroupHandler));
groupRoutes.delete('/:groupId', asyncHandler(deleteGroupHandler));
groupRoutes.post('/:groupId/members', validate(groupSchemas.member), asyncHandler(addMemberHandler));
groupRoutes.delete('/:groupId/members', validate(groupSchemas.member), asyncHandler(removeMemberHandler));
