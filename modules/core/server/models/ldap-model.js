'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    ldapservice = require('../controllers/centric-ldap.server.controller');

/**
 * Privates
 */
var schemas = [];


exports.model = function ( entityName, EntityDef ) {
    if (_.isUndefined(EntityDef )) {
        // ummm return the Schema object with this name?
        return schemas[entityName];
    }
    else {
        // The Entity Def is a Schema Object (this). Store it ????
        schemas[entityName] = EntityDef;
    }
};

