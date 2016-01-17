'use strict';

/**
 * Module dependencies.
 */
var identitysetsPolicy = require('../policies/identitysets.server.policy'),
  identitysets = require('../controllers/identitysets.server.controller');

module.exports = function (app) {
  // Identitysets collection routes
  app.route('/api/identitysets').all(identitysetsPolicy.isAllowed)
    .get(identitysets.list)
    .post(identitysets.create);

  // Single article routes
  app.route('/api/identitysets/:').all(identitysetsPolicy.isAllowed)
    .get(identitysets.read)
    .put(identitysets.update)
    .delete(identitysets.delete);

  // Finish by binding the article middleware
  app.param('identitysetId', identitysets.identitysetByID);
};
