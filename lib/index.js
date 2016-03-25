'use strict';

const Graph = require('gert').Graph;
const Hoek = require('hoek');
const Joi = require('joi');

const internals = {};

internals.regex = /^\[.+\]$/;

internals.match = Joi.array().items([
    Joi.string(),
    Joi.object({
        scope: Joi.array().items(Joi.string()).single()
    }).unknown(),
    Joi.alternatives([
        Joi.string().regex(internals.regex),
        Joi.object({
            scope: Joi.array().items([
                Joi.string(),
                Joi.string().regex(internals.regex).required()
            ]).single()
        }).unknown(),
    ]).required()
]).single()

module.exports = {
    name: 'loveboat-nested-scopes',
    root: 'config.auth.access.scope',
    match: internals.match,
    handler: function (scopes, route, server, options) {

        const scopeTree = internals.tree(options);

        scopes = [].concat(scopes).map(internals.normalize);
        scopes = scopes.map((scope) => {

            if (!internals.regex.test(scope)) {
                return scope;
            }

            // [scope] -> scope
            scope = scope.slice(1, -1);

            return internals.expand(scope, scopeTree);
        });

        return [Hoek.flatten(scopes)];
    }
};

internals.normalize = function (scope) {

    if (typeof scope !== 'object') {
        scope = { scope };
    }
    else {
        scope = Hoek.shallow(scope);
    }

    if (typeof scope.scope === 'string') {
        scope.scope = [scope.scope];
    }

    return scope;
};

internals.expand = function (scope, scopeTree) {

    const modifier = (scope[0] === '+' || scope[0] === '!') && scope[0];
    scope = modifier ? scope.slice(1) : scope;

    Hoek.assert(scopeTree.vertexExists(scope), `Scope "${scope}" was not specified in transform options and can't be expanded.`);

    const traversal = scopeTree.traverse(scope);

    if (modifier === '+') {

        // Move down the scope tree

        const stack = traversal.currentVertex().from;

        while (stack.length) {
            const current = traversal.hop(stack.pop()).currentVertex();
            current.from.forEach((nextScope) => stack.push(nextScope));
        }
    }
    else {

        // Move up the scope tree

        let parent;
        while (parent = traversal.currentVertex().to[0]) {
            traversal.hop(parent);
        }
    }

    return traversal.visitedVertices().map((traversedScope) => {

        return (modifier || '') + traversedScope;
    });
};

internals.tree = function (options) {

    const stack = [].concat(options || []);
    const vertices = {};

    while (stack.length) {

        let item = stack.pop();
        item = (typeof item === 'string') ? { scope: item } : item;

        const subscopes = [].concat(item.subscopes || []);

        // Push next scopes to process stack
        subscopes.forEach((subscope) => stack.push(subscope));

        // Define vertex and incoming edges from its children

        Hoek.assert(!vertices[item.scope], `Scope "${item.scope}" can not appear multiple times.`);

        vertices[item.scope] = {
            from: subscopes.map((subscope) => {

                return (typeof subscope === 'string') ? subscope : subscope.scope;
            })
        };
    }

    return new Graph({ vertices });
};
