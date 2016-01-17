'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport'),
    LdapStrategy = require('passport-ldapauth'),
    authHelper = require('../authHelper.js');


module.exports = function () {
    // Use ldap strategy
    passport.use(new LdapStrategy({
        server: {
            url: 'ldap://54.79.98.149:389',
            bindDn: 'cn=admin,ou=sa,o=system',
            bindCredentials: 'netIQ000',
            searchBase: 'ou=config,o=data',
            searchFilter: '(username={{username}})'
        }
    }, function(req, user, done) {
        if (!(user && req.password && authHelper.authenticate(user, req.password))) return done(null, false, {
            message: 'Invalid username or password'
        });

        done(null, user);
    }));
};
