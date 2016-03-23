'use strict';

const Hoek = require('hoek');
const Joi = require('joi');

const internals = {};

internals.regex = /^\[.+\]$/;

module.exports = {
    name: 'loveboat-nested-scopes',
    root: 'config.auth.access.scope',
    match: Joi.array().items(Joi.string(), Joi.string().regex(internals.regex).required()).single(),
    handler: function (scopes, route, server, options) {

        scopes = [].concat(scopes);

        scopes = scopes.map((scope) => {

            if (!internals.regex.test(scope)) {
                return scope;
            }

            // [scope] -> scope
            scope = scope.slice(1, -1);

            return internals.expand(scope, options);
        });

        return Hoek.flatten(scopes);
    }
};

internals.expand = function (scope, options) {

};
