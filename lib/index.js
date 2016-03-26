'use strict';

const Graph = require('gert').Graph;
const Hoek = require('hoek');
const Joi = require('joi');

const internals = {};

// Look for scopes wrapped in brackets, e.g. '[+admin]'
internals.regex = /^\[.+\]$/;

// Matches config.auth.access wth expandable scopes
internals.match = Joi.array().items([
    Joi.object({
        scope: [false, Joi.array().items(Joi.string()).single()]
    }).unknown(),
    Joi.object({
        scope: Joi.array().items([
            Joi.string(),
            Joi.string().regex(internals.regex).required()
        ]).single()
    }).unknown().required()
]).single();

module.exports = {
    name: 'loveboat-nested-scopes',
    root: 'config.auth.access',
    match: internals.match,
    handler: function (access, route, server, options) {

        const scopeTree = internals.tree(options);

        for (let i = 0; i < access.length; ++i) {

            const accessItem = access[i];

            if (accessItem.scope !== false) {

                accessItem.scope = accessItem.scope.map((scope) => {

                    if (!internals.regex.test(scope)) {
                        return scope;
                    }

                    // [scope] -> scope
                    scope = scope.slice(1, -1);

                    return internals.expand(scope, scopeTree);
                });

                accessItem.scope = Hoek.flatten(accessItem.scope);
            }
        }

        return [access];
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
