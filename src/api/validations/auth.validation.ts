export {};
const Joi = require('joi');

module.exports = {
  // POST /v1/auth/register
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6).max(128)
  }),

  // POST /v1/auth/login
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6).max(128)
  }),

  // POST /v1/auth/facebook
  // POST /v1/auth/google
  oAuth: {
    body: Joi.object({
      access_token: Joi.string().required()
    })
  },

  // POST /v1/auth/refresh
  refresh: {
    body: Joi.object({
      email: Joi.string()
        .email()
        .required(),
      refreshToken: Joi.string().required()
    })
  },

  // POST /v1/auth/forgot-password
  forgotPassword: {
    body: Joi.object({
      email: Joi.string()
        .email()
        .required()
    })
  }
};
