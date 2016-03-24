'use strict';

const Graph = require('gert').Graph;
const Hoek = require('hoek');
const Joi = require('joi');

const internals = {};

internals.regex = /^\[.+\]$/;

module.exports = {
    name: 'loveboat-nested-scopes',
    root: 'config.auth.access.scope',
    match: Joi.array().items([
        Joi.string(),
        Joi.string().regex(internals.regex).required()
    ]).single(),
    handler: function (scopes, route, server, options) {

        const scopeTree = internals.tree(options);

        scopes = [].concat(scopes);
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
