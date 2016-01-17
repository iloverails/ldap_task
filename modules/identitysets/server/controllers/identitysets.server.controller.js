'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
IdentitySet = require('../models/identityset.server.entity'),
	_ = require('lodash'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'));

/**
 * Create an Identity Set
 */
exports.create = function(req, res) {
    if (_.isUndefined(req.user) || _.isUndefined(req.user.tenancy)) {
        return res.status(401).send({
            message: 'Unauthorized. Please log in'
        });
    }
    var entity = new IdentitySet(req.body);
    entity.tenancy = req.user.tenancy;
    entity.setConnection(req.session.connection);
    entity.save(function(err, entity) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.jsonp(entity);
        }
    });
};

/**
 * Show the current Identity Set
 */
exports.read = function(req, res) {
	res.jsonp(req.identityset);
};

/**
 * Update an Identity Set
 */
exports.update = function(req, res) {
    if (_.isUndefined(req.user) || _.isUndefined(req.user.tenancy)) {
        return res.status(401).send({
            message: 'Unauthorized. Please log in'
        });
    }
    var original = req.identityset ;
    var entity = new IdentitySet(req.body);
    entity.setConnection(req.session.connection);
    entity.setPreviousVersion(original);
    entity.save(function(err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.jsonp(entity);
        }
    });
};

/**
 * Delete an Identity Set
 */
exports.delete = function(req, res) {
    if (_.isUndefined(req.user) || _.isUndefined(req.user.tenancy)) {
        return res.status(401).send({
            message: 'Unauthorized. Please log in'
        });
    }
    var entity = new IdentitySet(req.identityset);
    entity.setConnection(req.session.connection);

    entity.remove( function(err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.jsonp(entity);
        }
    });
};

/**
 * List of Identity Sets
 */
exports.list = function(req, res) {
    if (_.isUndefined(req.user) || _.isUndefined(req.user.tenancy)) {
        return res.status(401).send({
            message: 'Unauthorized. Please log in'
        });
    }
    var searchOpts = {
        tenancy: req.user.tenancy,
        cluster: req.session.cluster
    };
    IdentitySet.find(searchOpts, req.session.connection, function (err, list) {
        if (err) {
            return res.status(400).send(err);
        } else {
            // put the currently selected set at the top (so pages with a drop-down have it selected)
            if (typeof req.session.identitySet !== 'undefined') {
                var selected = [];
                var i = 0;
                // find the selected one, save it, remove it from main list, then add the modified list to the selected
                list.forEach(function (item) {
                    if (item._id === req.session.identitySet) {
                        selected.push(item);
                        list.splice(i, 1);
                    }
                    ++i;
                });
                list = selected.concat(list);
            }
            res.jsonp(list);
        }
    });
};

/**
 * Identity Set middleware
 */
exports.identitysetByID = function(req, res, next, id) {
    if (_.isUndefined(req.user) || _.isUndefined(req.user.tenancy)) {
        return res.status(401).send({
            message: 'Unauthorized. Please log in'
        });
    }
    IdentitySet.findById(id, req.session.connection, function(err, entity) {
        if (err) {
            return next(err);
        }
        if (! entity) {
            return next(new Error('Failed to load Identity Set' + id));
        }
        req.identityset = entity ;
        next();
    });
};

/**
 * Identity Set authorization middleware
 * TODO: check tenancy
 */
exports.hasAuthorization = function(req, res, next) {
	/*if (req.identityset.user.id !== req.user.id) {
		return res.status(403).send('User is not authorized');
	}*/
	next();
};
