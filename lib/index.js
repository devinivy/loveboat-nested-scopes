'use strict';

const Gert = require('gert');
const Hoek = require('hoek');
const Joi = require('joi');

const internals = {};

internals.regex = /^\[.+\]$/;

module.exports = {
    name: 'loveboat-nested-scopes',
    root: 'config.auth.access.scope',
    match: Joi.array().items(Joi.string(), Joi.string().regex(internals.regex).required()).single(),
    handler: function (scopes, route, server, options) {

        const state = server.realm.plugins.loveboat = server.realm.plugins.loveboat || {};
        state['nested-scopes'] = state['nested-scopes'] || internals.tree(options);

        const scopeTree = state['nested-scopes'];

        scopes = [].concat(scopes);
        scopes = scopes.map((scope) => {

            if (!internals.regex.test(scope)) {
                return scope;
            }

            // [scope] -> scope
            scope = scope.slice(1, -1);

            return internals.expand(scope, scopeTree);
        });

        return Hoek.flatten(scopes);
    }
};

internals.expand = function (scope, scopeTree) {

};

internals.tree = function (options) {

    const stack = [].concat(options || []);
    const vertices = {};

    while (stack.length) {

        let item = stack.pop();
        item = (typeof item === 'string') ? { scope: item } : item;

        const subscopes = [].concat(item.subscopes || []);

        // Push next scopes to process stack
        item.subscopes.forEach((subscope) => stack.push(subscope));

        // Define vertex and its outgoing edges
        vertices[item.scope] = {
            to: subscopes.map((subscope) => {
                return (typeof subscope === 'string') ? subscope : subscope.scope);
            }
        };
    }

    return new Gert.Graph({ vertices });
};
