export {};
import { NextFunction, Request, Response, Router } from 'express';
const mongoose = require('mongoose');
const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');
const moment = require('moment-timezone');
const jwt = require('jwt-simple');
const uuidv4 = require('uuid/v4');
const APIError = require('../../api/utils/APIError');
import { transformData, listData } from '../../api/utils/ModelUtils';
import { required } from 'joi';
const { env, JWT_SECRET, JWT_EXPIRATION_MINUTES } = require('../../config/vars');

/**
 * User Roles
 */
const roles = ['user', 'admin', 'fullTime', 'contractor'];

/**
 * User Schema
 * @private
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      match: /^\S+@\S+\.\S+$/,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      minlength: 6,
      maxlength: 128
    },
    tempPassword: {
      type: String, // one-time temporary password (must delete after user logged in)
      required: false,
      minlength: 6,
      maxlength: 128
    },
    services: {
      facebook: String,
      google: String
    },
    picture: {
      type: String,
      trim: true
    },
    userRole: {
      type: String,
      enum: roles,
      default: 'contractor'
    },
    userName: {
      type: String,
      maxlength: 128,
      index: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      index: true,
      validate: {
        validator: function (value: string) {
          return /^\d{10}$/.test(value);
        },
        message: 'Please enter a valid 10 digit phone number (e.g., 1234567890)'
      }
    },
    otp: {
      type: String
    }
  },
  {
    timestamps: true
  }
);
const ALLOWED_FIELDS = ['id', 'email', 'picture', 'role', 'createdAt', 'userRole', 'userName', 'isActive', 'phone'];

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */
userSchema.pre('save', async function save(next: NextFunction) {
  try {
    // modifying password => encrypt it:
    const rounds = env === 'test' ? 1 : 10;
    if (this.isModified('password')) {
      const hash = await bcrypt.hash(this.password, rounds);
      this.password = hash;
    } else if (this.isModified('tempPassword')) {
      const hash = await bcrypt.hash(this.tempPassword, rounds);
      this.tempPassword = hash;
    }
    return next(); // normal save
  } catch (error) {
    return next(error);
  }
});

/**
 * Methods
 */
userSchema.method({
  // query is optional, e.g. to transform data for response but only include certain "fields"
  transform({ query = {} }: { query?: any } = {}) {
    // transform every record (only respond allowed fields and "&fields=" in query)
    return transformData(this, query, ALLOWED_FIELDS);
  },

  token() {
    const playload = {
      exp: moment().add(JWT_EXPIRATION_MINUTES, 'minutes').unix(),
      iat: moment().unix(),
      sub: this._id
    };
    return jwt.encode(playload, JWT_SECRET);
  },

  async passwordMatches(password: string) {
    return bcrypt.compare(password, this.password);
  }
});

/**
 * Statics
 */
userSchema.statics = {
  roles,

  /**
   * Get user
   *
   * @param {ObjectId} id - The objectId of user.
   * @returns {Promise<User, APIError>}
   */
  async get(id: any) {
    try {
      let user;

      if (mongoose.Types.ObjectId.isValid(id)) {
        user = await this.findById(id).exec();
      }
      if (user) {
        return user;
      }

      throw new APIError({
        message: 'User does not exist',
        status: httpStatus.NOT_FOUND
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Find user by email and tries to generate a JWT token
   *
   * @param {ObjectId} id - The objectId of user.
   * @returns {Promise<User, APIError>}
   */
  async findAndGenerateToken(options: any) {
    const { email, password, refreshObject } = options;
    if (!email) {
      throw new APIError({ message: 'An email is required to generate a token' });
    }

    const user = await this.findOne({ email }).exec();
    const err: any = {
      status: httpStatus.UNAUTHORIZED,
      isPublic: true
    };
    if (password) {
      if (user && (await user.passwordMatches(password))) {
        return { user, accessToken: user.token() };
      }
      err.message = 'Incorrect email or password';
    } else if (refreshObject && refreshObject.userEmail === email) {
      if (moment(refreshObject.expires).isBefore()) {
        err.message = 'Invalid refresh token.';
      } else {
        return { user, accessToken: user.token() };
      }
    } else {
      err.message = 'Incorrect email or refreshToken';
    }
    throw new APIError(err);
  },

  /**
   * List users.
   * @returns {Promise<User[]>}
   */
  list({ query }: { query: any }) {
    return listData(this, query, ALLOWED_FIELDS);
  },

  /**
   * Return new validation error
   * if error is a mongoose duplicate key error
   *
   * @param {Error} error
   * @returns {Error|APIError}
   */
  checkDuplicateEmail(error: any) {
    if (error.name === 'MongoError' && error.code === 11000) {
      return new APIError({
        message: 'Validation Error',
        errors: [
          {
            field: 'email',
            location: 'body',
            messages: ['"email" already exists']
          }
        ],
        status: httpStatus.CONFLICT,
        isPublic: true,
        stack: error.stack
      });
    }
    return error;
  },

  async oAuthLogin({ service, id, email, name, picture }: any) {
    const user = await this.findOne({ $or: [{ [`services.${service}`]: id }, { email }] });
    if (user) {
      user.services[service] = id;
      if (!user.name) {
        user.name = name;
      }
      if (!user.picture) {
        user.picture = picture;
      }
      return user.save();
    }
    const password = uuidv4();
    return this.create({
      services: { [service]: id },
      email,
      password,
      name,
      picture
    });
  },

  async count() {
    return this.find().count();
  }
};

/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);
User.ALLOWED_FIELDS = ALLOWED_FIELDS;
module.exports = User;
