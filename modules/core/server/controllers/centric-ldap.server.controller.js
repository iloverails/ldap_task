'use strict';

/**
 * Module dependencies.
 */
var ldap = require('ldapjs'),
    _ = require('lodash');
var ldapClients = {
    'cn=~example~,o=~example~' : {}
};
// ldap.Attribute.settings.guid_format = ldap.GUID_FORMAT_B;

exports.transformToTree = function( input, transform ) {
    var output = {};
    // Iterate the Object Definition
    _.forEach( transform, function(attrDef, key) {
        // Check for Fixed Value
        if (!_.isUndefined(attrDef.fixedValue)) {
            output[key] = attrDef.fixedValue;
        }
        // Get the attribute name and see if it exists in input
        if (!_.isUndefined(attrDef.attributeName)) {
            // Check whether the attribute is localized
            if (!_.isUndefined(attrDef.localized)) {
                output[key] = 'en~' + input[attrDef.attributeName]; // TODO: get language from the session
            }
            else {
                output[key] = input[attrDef.attributeName];
            }
        }
    });
    return (output);
};

exports.transformFromTree = function( input, transform ) {
    var output = {};
    // Iterate the results from LDAP
    _.forEach( input, function(attr, key) {
        // if this attribute has a definition then transform it
        if (!_.isUndefined(transform[key])) {
            // check whether localized
            var attrVal = attr;
            if (!_.isUndefined(transform[key].localized)) {
                attrVal = attrVal.substring(3); // TODO: find the multi-value for the language in the session
            }
            if (!_.isUndefined(transform[key].attributeName)) {
                output[transform[key].attributeName] = attrVal;
            }
            else {
                output[key] = attrVal;
            }
        }
    });
    return output;
};

/**
 * return an ldapClient object if one exists for this user, otherwise error (should have been registered on login
 */
exports.getClient = function( connection, callback ) {
    if (typeof ldapClients[connection.bindDN] !== 'undefined' ) {
        callback( null, ldapClients[connection.bindDN] );
    } else {
        console.log('Connection not available, re-binding');
        var ldapclient = ldap.createClient(connection);
        ldapclient.bind(connection.bindDN, connection.bindCredentials, function(err) {
            if (err) {
                callback(err);
            }
            else {
                console.log('Re-bound LDAP connection');
                ldapClients[connection.bindDN] = ldapclient;
                callback(null, ldapclient);
            }
        });
    }

};

/**
 * bind and register the ldap client for this user
 */
exports.bind = function( userDN, password, callback ) {
    var connection = {
        url: 'ldap://54.79.98.149:389',
        bindDN: userDN,
        bindCredentials: password,
        maxConnections: 4
    };
    // Store the original connection details as they are supplemented during the bind
    // and we want to pass them back to the caller to store in the session
    var connectionCredentials = {
        url: 'ldap://54.79.98.149:389',
        bindDN: userDN,
        bindCredentials: password,
        maxConnections: 4
    };
    var ldapclient = ldap.createClient(connection);
    ldapclient.bind(userDN, password, function(err) {
        if (err) {
            callback(err);
        }
        else {
            ldapClients[userDN] = ldapclient;
            callback(null, connectionCredentials);
        }
    });
};

exports.modify = function( connection, entityDef, original, entity, callback ) { //err
    function buildChange( oldentity, newentity ) {
        var changes = [];
        // check each attribute for a new, removed or updated value
        _.forEach( entityDef, function( attrDef, attrName ) {
            console.log(attrName+': OLD: '+JSON.stringify(oldentity[attrName])+ ', NEW: '+JSON.stringify(newentity[attrName]));
            if (attrDef.static !== 'true') {
                if (!_.isUndefined(newentity[attrName]) && _.isUndefined(oldentity[attrName])) { // new exists and old doest
                    var addop = {
                        operation: 'add'
                    };
                    addop.modification = {};
                    addop.modification[attrName] = newentity[attrName];
                    console.log('CHANGE: ' + JSON.stringify(addop));
                    changes.push(new ldap.Change(addop));
                }
                else if (!_.isUndefined(newentity[attrName]) && !_.isUndefined(oldentity[attrName]) && !_.isEqual(newentity[attrName], oldentity[attrName])) { // new exists and old exists and values are different
                    // TODO: if it's multi-valued, work out whats removed and whats added
                    var modop = {
                        operation: 'replace'
                    };
                    modop.modification = {};
                    modop.modification[attrName] = newentity[attrName];
                    console.log('CHANGE: ' + JSON.stringify(modop));
                    changes.push(new ldap.Change(modop));
                }
                else if (_.isUndefined(newentity[attrName]) && !_.isUndefined(oldentity[attrName])) {// new is removed and old exists
                    var delop = {
                        operation: 'delete'
                    };
                    delop.modification = attrName;
                    console.log('CHANGE: ' + JSON.stringify(delop));
                    changes.push(new ldap.Change(delop));
                }
            }
        });
        return changes;
    }
    var entry = module.exports.transformToTree( entity, entityDef );
    var oldentry = {};
    var context = this;
    this.getByDN(JSON.parse(JSON.stringify(connection)), entityDef, entry.dn, function( err, existing ) {
        if (err) {
            console.log(err);
        }
        else {
            oldentry = existing;
            oldentry = module.exports.transformToTree( oldentry, entityDef );

            // Note: for some reason ldapjs doesn't like the object so transform it:
            entry = JSON.parse(JSON.stringify(entry));
            var changes = buildChange( oldentry, entry );
            context.getClient(connection, function( err, ldapclient ) {
                if (err) {
                    callback(err);
                }
                else {
                    ldapclient.modify(entry.dn, changes, function(err) {
                        if (err) {
                            console.log(err.message);
                            callback(err);
                        }
                        else {
                            callback(null );
                        }
                    });
                }
            });
        }
    });

};
exports.delete = function( connection, id, callback ) { //err
    this.getClient(connection, function( err, ldapclient ) {
        if (err) {
            callback(err);
        }
        else {
            ldapclient.del(id, function(err) {
                if (err) {
                    console.log(err.message);
                    callback(err);
                }
                else {
                    callback(null );
                }
            });
        }
    });
};

exports.add = function( connection, entityDef, entity, dn, callback ) { //err,entity
    // Note: for some reason ldapjs doesn't like the object so transform it:

    var entry = JSON.parse(JSON.stringify(entity));
    this.getClient(connection, function( err, ldapclient ) {
        if (err) {
            callback( err );
        }
        else {
            //console.log('Adding '+dn +': '+JSON.stringify(entry));
            ldapclient.add(dn, entry, function(err) {
                if (err) {
                    console.log(err.message);
                    callback(err);
                }
                else {
                    entry.dn = dn;
                    callback(null, entry);
                }
            });
        }
    });
};

exports.getByDN = function( connection, entityDef, dn, callback ) { //( err, entity)
    this.getClient( connection, function( err, ldapclient ) {
        if (err) {
            callback(err);
        }
        else {
            var entity = [];
            var searchOpts = {
                filter: '(objectClass=*)',
                scope: 'base',
                attributes: []
            };
            _.forEach( entityDef, function( attrDef, attrName ) {
                searchOpts.attributes.push(attrName);
            });
            var error = null;
            console.log('GETTING OBJECT : '+dn+', and ATTRIBUTES: '+searchOpts.attributes);
            ldapclient.search(dn, searchOpts, function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    res.on('searchEntry', function (entry) {
                        var e = module.exports.transformFromTree(entry.object, entityDef);
                        console.log('TRANSFORMED ENTITY: ' + JSON.stringify(e));
                        entity = e;
                    });
                    res.on('searchReference', function (referral) {
                        console.log('referral: ' + referral.uris.join());
                    });
                    res.on('error', function (err) {
                        console.error('error: ' + err.message);
                        error = err;
                    });
                    res.on('end', function (result) {
                        console.log('GET ENTRY STATUS: '+result);
                        callback(error, entity);
                    });
                }
            });
        }
    });
};
exports.getByID = function( connection, entityDef, searchBase, id, callback ) { //( err, entity)
    this.getClient( connection, function( err, ldapclient ) {
        if (err) {
            callback(err);
        }
        else {
            var objectGUIDBuffer = new Buffer('c9e39e00737a4c9bf5aa009ee3c97a73','hex');
            //var objectGUIDBuffer = '\\c9\\e3\\9e\\00\\73\\7a\\4c\\9b\\f5\\aa\\00\\9e\\e3\\c9\\7a\\73';
            var myFilter = new ldap.filters.EqualityFilter({
                attribute: 'objectGUID',
                value: objectGUIDBuffer
            });
            var entity = [];
            var searchOpts = {
                filter: myFilter,
                scope: 'sub',
                attributes: []
            };

            _.forEach( entityDef, function( attrDef, attrName ) {
                searchOpts.attributes.push(attrName);
            });
            var error = null;
            console.log('GETTING OBJECT : '+id);
            ldapclient.search(searchBase, searchOpts, function (err, res) {
                if (err) {
                    console.log('ERROR: '+err);
                    callback(err);
                } else {
                    res.on('searchEntry', function (entry) {
                        var e = module.exports.transformFromTree(entry.object, entityDef);
                        console.log('TRANSFORMED ENTITY: ' + JSON.stringify(e));
                        entity = e;
                    });
                    res.on('searchReference', function (referral) {
                        console.log('referral: ' + referral.uris.join());
                    });
                    res.on('error', function (err) {
                        console.error('ERROR: ' + err.message);
                        error = err;
                    });
                    res.on('end', function (result) {
                        console.log('GET ENTRY STATUS: '+result);
                        callback(error, entity);
                    });
                }
            });
        }
    });
};

exports.getList = function( connection, entityDef, searchBase, searchOpts, callback ) { //err, list
    this.getClient( connection, function( err, ldapclient ) {
        if (err) {
            callback( err );
        }
        else {
            var entities = [];
            var searchOptions = searchOpts;
            searchOptions.attributes = [];
            _.forEach( entityDef, function( attrDef, attrName ) {
                searchOptions.attributes.push(attrName);
            });
            console.log('SEARCHING: '+searchBase +' ATTRIBUTES: '+searchOptions.attributes);
            ldapclient.search(searchBase, searchOptions, function(err, res) {
                if (err) {
                    callback( err );
                } else {
                    res.on('searchEntry', function(entry) {
                        //console.log('FOUND: '+ JSON.stringify(entry.object));
                        // TODO: Refactor this so that a promise is returned and the caller trasforms the LDAP objects
                        var e = module.exports.transformFromTree( entry.object, entityDef);
                        //console.log('TRANSFORMED: ' + JSON.stringify(e));
                        entities.push(e);
                    });
                    res.on('searchReference', function(referral) {
                        console.log('referral: ' + referral.uris.join());
                    });
                    res.on('error', function(err) {
                        console.error('error: ' + err.message);
                    });
                    res.on('end', function(result) {
                        callback(null, entities);
                    });
                }
            });
        }

    } );
};


