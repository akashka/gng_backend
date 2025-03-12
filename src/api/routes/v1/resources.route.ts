export {};
const express = require('express');
import { NextFunction, Request, Response, Router } from 'express';
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');
const router = express.Router();

const controller = require('../../controllers/resources.controller');

router.route('/generateEducationalContent').post(controller.generateEducationalContent);
router.get('/').post(controller.listResources);

module.exports = router;
