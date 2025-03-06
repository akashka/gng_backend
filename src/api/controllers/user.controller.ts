export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const httpStatus = require('http-status');
const { omit } = require('lodash');
import { User } from '../../api/models';
import { apiJson } from '../../api/utils/Utils';
const { handler: errorHandler } = require('../middlewares/error');

const likesMap: any = {}; // key (userId__noteId) : 1

/**
 * Load user and append to req.
 * @public
 */
exports.load = async (req: Request, res: Response, next: NextFunction, id: any) => {
  try {
    const user = await User.get(id);
    req.route.meta = req.route.meta || {};
    req.route.meta.user = user;
    return next();
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

/**
 * Get logged in user info
 * @public
 */
const loggedIn = (req: Request, res: Response) => res.json(req.route.meta.user.transform());
exports.loggedIn = loggedIn;

/**
 * Get user
 * @public
 */
exports.get = loggedIn;

/**
 * Create new user
 * @public
 */
exports.create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = new User(req.body);
    const savedUser = await user.save();
    res.status(httpStatus.CREATED);
    res.json(savedUser.transform());
  } catch (error) {
    next(User.checkDuplicateEmail(error));
  }
};

/**
 * Replace existing user
 * @public
 */
exports.replace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.route.meta;
    const newUser = new User(req.body);
    // const ommitRole = user.role !== 'admin' ? 'role' : '';
    // const newUserObject = omit(newUser.toObject(), '_id', ommitRole);

    await user.update(newUser, { override: true, upsert: true });
    const savedUser = await User.findById(user._id);

    res.json(savedUser.transform());
  } catch (error) {
    next(User.checkDuplicateEmail(error));
  }
};

/**
 * Update existing user
 * @public
 */
exports.update = (req: Request, res: Response, next: NextFunction) => {
  // const ommitRole = req.route.meta.user.role !== 'admin' ? 'role' : '';
  // const updatedUser = omit(req.body, ommitRole);
  const user = Object.assign(req.route.meta.user, req.body);

  user
    .save()
    .then((savedUser: any) => res.json(savedUser.transform()))
    .catch((e: any) => next(User.checkDuplicateEmail(e)));
};

/**
 * Get user list
 * @public
 * @example GET /v1/users?role=admin&limit=5&offset=0&sort=email:desc,createdAt
 */
exports.list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = (await User.list(req)).transform(req);
    apiJson({ req, res, data, model: User });
  } catch (e) {
    next(e);
  }
};

/**
 * Delete user
 * @public
 */
exports.remove = (req: Request, res: Response, next: NextFunction) => {
  const { user } = req.route.meta;
  user
    .remove()
    .then(() => res.status(httpStatus.NO_CONTENT).end())
    .catch((e: any) => next(e));
};

exports.updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let emailUser = [];
    let emailPhone: string | any[] = [];
    let userFound = null;

    if (req.body.email) {
      emailUser = await User.find({ email: req.body.email });
    }
    if (req.body.phone) {
      emailPhone = await User.find({ email: req.body.phone });
    }

    if (emailUser.length && emailPhone.length)
      userFound = emailUser.filter((value: any) => emailPhone.includes(value))[0];
    else if (emailUser.length) userFound = emailUser[0];
    else if (emailPhone.length) userFound = emailPhone[0];

    userFound.password = req.body.password;
    const savedUser = await userFound.save();
    res.json(savedUser.transform());
  } catch (error) {
    next(error);
  }
};
