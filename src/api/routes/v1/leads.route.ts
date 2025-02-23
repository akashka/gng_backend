export {};
const express = require('express');
const validate = require('express-validation');
const controller = require('../../controllers/leads.controller');
const { authorize, ADMIN, LOGGED_USER } = require('../../middlewares/auth');

const router = express.Router();

router.route('/').get(controller.listLeads);
router.route('/').post(controller.createLead);
router.route('/:leadId').get(controller.getLead);
router.route('/:leadId').put(controller.updateLead);

module.exports = router;
