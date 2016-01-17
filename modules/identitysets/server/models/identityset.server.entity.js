'use strict';

/**
 * Module dependencies.
 */
var ldapmodel = require('../../../core/server/models/ldap-model.js'),
    Entity = require('../../../core/server/models/entity.js'),
    _ = require('lodash'),
    util = require('util');

var entityDef = {
    schema: {
        dn: {
            attributeName: '_id',
            template: 'ou=%ou%,ou=users,ou=idm,ou=%tenancy%,ou=%cluster%,ou=tenants,o=data'
        },
        objectClass: {
            fixedValue: ['organizationalUnit','iaasIdentitySet']
        },
        ou: {
            attributeName: 'name',
            naming: 'true',
            required: 'Please Enter Identity Set Name'
        },
        iaasSetType: {
            attributeName: 'setType'
        },
        description: {
            attributeName: 'description'
        },
        objectGUID: {
            attributeName: 'guid',
            static: 'true'
        }
    },
    searchBase: 'ou=users,ou=idm,ou=%tenancy%,ou=%cluster%,ou=tenants,o=data',
    searchFilter: '(&(objectClass=organizationalUnit)(!(|(ou=system)(ou=users))))'
};


function IdentitySet( attributes ) {
    this._id = attributes._id;
    this.name = attributes.name;
    this.description = attributes.description;
    this.setType = attributes.setType;
    IdentitySet.super_.call(this, entityDef.schema, attributes);
}

_.extend(IdentitySet, Entity); // copy the static properties and methods
util.inherits(IdentitySet, Entity); // inherit the constructor
Entity.registerDefinition('IdentitySet', entityDef);
module.exports = IdentitySet;
