'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    ldapservice = require('../controllers/centric-ldap.server.controller'),
    q = require('q');

var entityDefinitions = [];

function Entity( schema, attributes )  {
    Entity.super_.call(this);
    this._schema = schema;
    this._connection = {};
    this.language = 'en';
    this._previousVersion = {};
    if (!_.isUndefined(attributes)) {
        // set initial attributes
        if(!_.isUndefined(attributes._connection)) {
            this._connection = attributes._connection;
        }
        if(!_.isUndefined(attributes.tenancy)) {
            this.tenancy = attributes.tenancy;
        }
        // TODO: set valid attributes from schema
    }
}

util.inherits(Entity, EventEmitter);

//////////////////////////////////////////////////////////

// STATIC METHODS

//////////////////////////////////////////////////////////

Entity.transformToTree = function( entity, schema ) {
    //console.log('TRANSFORMING TO TREE: ENTITY: '+JSON.stringify(entity));
    var output = {};
    // Iterate the Object Definition
    _.forEach( schema, function(attrDef, key) {
        // Check for Fixed Value
        if (!_.isUndefined(attrDef.fixedValue)) {
            output[key] = attrDef.fixedValue;
        }
        // Get the attribute name and see if it exists in input
        if (!_.isUndefined(attrDef.attributeName)) {
            // Check whether the attribute is localized
            if (!_.isUndefined(attrDef.localized)) {
                output[key] = entity.language+'~' + entity[attrDef.attributeName];
            }
            else {
                output[key] = entity[attrDef.attributeName];
            }
        }
    });
    return (output);
};


Entity.transformFromTree = function( entry, schema ) {
    var output = {};
    var me = this;
    // Iterate the results from LDAP
    _.forEach( entry, function(attr, key) {
        // if this attribute has a definition then transform it
        if (!_.isUndefined(schema[key])) {
            // check whether localized
            var attrVal = attr;
            if (!_.isUndefined(schema[key].localized)) {
                attrVal = attrVal.substring(3); // TODO: find the multi-value for the language in the session
            }
            if (!_.isUndefined(schema[key].attributeName)) {
                output[schema[key].attributeName] = attrVal;
            }
            else {
                output[key] = attrVal;
            }
        }
    });
    return output;
};
/**
 * Register the schema definition so static methods understand how to transform objects
 *
 * @param entityName
 * @param schema
 */
Entity.registerDefinition = function( entityName, def ) {
    entityDefinitions[entityName] = def;
    console.log('ENTITY "'+entityName+'" REGISTERED: '+ JSON.stringify(def));
};

/**
 * Find an object by it's identifier
 * @param id
 * @param connection
 * @param callback
 */
Entity.findById = function( id, connection, callback ) {
    var thisSchema = entityDefinitions[this.prototype.constructor.name].schema;
    var me = this;
    ldapservice.getByDN( JSON.parse(JSON.stringify(connection)), thisSchema, id, function( err, entity) {
        if (err) {
            callback( err );
        }
        else {
            //callback( null, new me.prototype.constructor(entity) ); //return a new object of the type of calling class
            callback( null, entity );
        }
    });
};

Entity.find = function( searchOptions, connection, callback ) {
    var def = entityDefinitions[this.prototype.constructor.name];
    var searchOpts = {
        filter: def.searchFilter,
        scope: 'sub'
    };
    //console.log('FINDING: '+def.searchFilter);
    var searchBase = entityDefinitions[this.prototype.constructor.name].searchBase.replace('%tenancy%', searchOptions.tenancy).replace('%cluster%', searchOptions.cluster).replace('%l%', searchOptions.base);
    ldapservice.getList( JSON.parse(JSON.stringify(connection)), def.schema, searchBase, searchOpts, function( err, list ) {
        if (err) {
            callback( err );
        } else {
            callback( null, list );
        }
    });
};


Entity.validateEntity = function( entity, schema, callback ) {
    var error = {};
    _.forEach( schema, function(attr, key) {
        if (!_.isUndefined(attr.required)) {
            // check for a value
            if ( _.isUndefined(entity[attr.attributeName]) ) {
                console.log('VALIDATION ERROR: '+ attr.attributeName + ' not present');
                error = {code: 45543, message: attr.required};
                return false;
            }
            else if (entity[attr.attributeName] === '') {
                // TODO: come up with error code list
                error = {code: 45543, message: attr.required};
                return false;
            }
        }
    });
    if (_.isUndefined(error.message)) {
        callback( null );
    }
    else {
        callback( error );
    }
};
/////////////////////////////////////////////////////////

// CLASS METHODS

/////////////////////////////////////////////////////////
Entity.prototype.setPreviousVersion = function( oldVersion ) {
    this._previousVersion = oldVersion;
    this._id = oldVersion._id; // make sure there is a unique ID for the new object.
};

Entity.prototype.save = function( callback ) {
    var me = this;
    // Validate required fields
    Entity.validateEntity( this, this._schema, function( err ) {
        if (err) {
            callback( err );
        }
        else {
            var entry = Entity.transformToTree( me, me._schema );
            if (_.isUndefined(entry.dn))  {
                // ADD new object
                var dn = me._schema.dn.template.replace('%tenancy%', me.tenancy).replace('%cn%', entry.cn).replace('%ou%',entry.ou).replace('%l%',entry.l);
                //console.log('ADDING: '+JSON.stringify(entry)+' AT '+JSON.stringify(dn));
                ldapservice.add( me._connection, me._schema, entry, dn, function(err, entity) {
                    if (err) {
                        console.log('LDAP Error: '+JSON.stringify(err));
                        callback( err );
                    } else {
                        //console.log('Created Entity: '+JSON.stringify(entity));
                        me.emit('created', JSON.stringify(entity));
                        callback( null, Entity.transformFromTree(entity, me._schema) );
                    }
                });
            }
            else {
                // MODIFY object
                //console.log('MODIFYING '+entry.dn);
                ldapservice.modify( me._connection, me._schema, Entity.transformToTree(me._previousVersion, me._schema), me, function( err, list ) {
                    if (err) {
                        console.log('Error: '+JSON.stringify(err));
                        callback( err );
                    } else {
                        callback( null );
                    }
                });
            }
        }
    });
};

Entity.prototype.setConnection = function( connection ) {
    this._connection = JSON.parse(JSON.stringify(connection));
};

Entity.prototype.remove = function( callback) {
    //console.log('REMOVING: '+ this._id);
    ldapservice.delete( this._connection, this._id, function( err ) {
        if (err) {
            callback(err);
        } else {
            callback(null);
        }
    });
};



module.exports = Entity;

