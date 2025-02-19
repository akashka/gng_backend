export {};
import * as Joi from 'joi';
import { User } from '../../api/models';

const requireEmail = () => Joi.string().email().required();

const postPutBody = () => {
  return Joi.object({
    email: requireEmail(),
    password: Joi.string().min(6).max(128).required(),
    name: Joi.string().max(128),
    role: Joi.string()
  });
};

module.exports = {
  // GET /v1/users
  listUsers: {
    query: Joi.object({
      limit: Joi.number().min(1).max(9999),
      offset: Joi.number().min(0),
      page: Joi.number().min(0),
      perPage: Joi.number().min(1),
      sort: Joi.string(),
      name: Joi.string(),
      email: Joi.string(),
      role: Joi.string()
    })
  },

  // POST /v1/users
  createUser: {
    body: postPutBody()
  },

  // PUT /v1/users/:userId
  replaceUser: {
    body: postPutBody(),
    params: Joi.object({
      userId: Joi.string()
        .regex(/^[a-fA-F0-9]{24}$/)
        .required()
    })
  },

  // PATCH /v1/users/:userId
  updateUser: {
    body: Joi.object({
      email: Joi.string().email(),
      password: Joi.string().min(6).max(128),
      name: Joi.string().max(128),
      role: Joi.string()
    }),
    params: Joi.object({
      userId: Joi.string()
        .regex(/^[a-fA-F0-9]{24}$/)
        .required()
    })
  }
};
