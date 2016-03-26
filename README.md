# loveboat-nested-scopes
support nested auth scopes in hapi

(a transform written for [**loveboat**](https://github.com/devinivy/loveboat))

[![Build Status](https://travis-ci.org/devinivy/loveboat-nested-scopes.svg?branch=master)](https://travis-ci.org/devinivy/loveboat-nested-scopes) [![Coverage Status](https://coveralls.io/repos/devinivy/loveboat-nested-scopes/badge.svg?branch=master&service=github)](https://coveralls.io/github/devinivy/loveboat-nested-scopes?branch=master)

## Usage

This loveboat transform allows you to define hierarchical auth scopes on routes, and be able to leverage that hierarchy when writing your route config.  The core idea is that allowing unprivileged scopes on a route should also permit the higher-priviledged scopes.

Imagine a `basic-user` scope and an `admin` scope.  Every admin is naturally allowed to perform the actions of a basic user.  So let's make our app aware of that and start writing this,

```js
// Scopes can be smart!
server.loveboat({
    method: 'get',
    path: '/my/file.gif',
    handler: handler,
    config: {
        auth: {
            access: {
                scope: ['[basic-user]']
                // Becomes ['basic-user', 'admin']
            }
        }
    }
});
```

To use this transform,

1. Make sure the [loveboat](https://github.com/devinivy/loveboat) hapi plugin is registered to your server.
2. Tell loveboat that you'd like to use this transform by calling,
```js
server.routeTransforms([{
    transform: require('loveboat-nested-scopes'),
    options: {
        scope: 'admin',
        subscopes: ['basic-user']
        // Define your nested scopes
    }
}]);
```
possibly listing any other transforms you'd like to use.*

3. Register your routes using `server.loveboat()` rather than `server.route()`.

<sup>* There are other ways to tell loveboat which transforms to use too!  Just check-out the [readme](https://github.com/devinivy/loveboat/blob/master/README.md).

```js
const Hapi = require('hapi');
const Loveboat = require('loveboat');

const server = new Hapi.Server();
server.connection();

// 1. Register loveboat
server.register(Loveboat, (err) => {

    // 2. Tell loveboat to use this transform, providing info about your nested scopes
    server.routeTransforms([{
        transform: require('loveboat-nested-scopes'),
        options: {
            scope: 'admin',
            subscopes: [
                {
                    scope: 'super-user',
                    subscopes: [
                        'api-user',
                        'files-user'
                    ]
                }
            ]
        }
    }]);

    // 3. Configure your routes!
    server.loveboat({
        method: 'get',
        path: '/my/file.gif',
        handler: handler,
        config: {
            auth: {
                access: {
                    scope: ['[files-user]']
                    /*
                     * Use '[]' to indicate that the
                     * scope should be expanded.
                     *
                     * Scope becomes effectively,
                     * [
                     *    'files-user',
                     *    'super-user',
                     *    'admin'
                     * ]
                     */
                }
            }
        }
    });

    // The route above will allow users with scope 'files-user'
    // as well as that scope's parents, 'super-user' and 'admin'
});
```

## API
### Options
When the transform is registered, options should be specified to define the hierarchy of your scopes.  Options take the form of an item or array of items, each of which is of the format,
  - a string naming a scope, or
  - an object of the format,
    - `scope` - a string naming a scope.
    - `subscopes` - (optional) an item or array of items as defined here and above.  These items specify scopes that are considered "included" by the scope specified in `scope`.

The same scope cannot be listed twice.

You'll notice that this leads to options that can be arbitrarily deep, since the `subscopes` parameter may in turn contain an array of objects with their own `subscopes` parameters.  This options object defines a hierarchical tree of scopes.  For example, see the following options and scope hierarchy,
```js
/*
 *            admin
 *              |
 *         super-user
 *        /          \
 *       /            \
 *   api-user     files-user
 *
 * An admin is a super-user, api-user and files-user.
 * A super-user is an api-user and files-user.
 */

const scopeHierarchy = [{
    scope: 'admin',
    subscopes: [
        {
            scope: 'super-user',
            subscopes: [
                'api-user',
                'files-user'
            ]
        }
    ]
}];

server.routeTransforms([{
    transform: require('loveboat-nested-scopes'),
    options: scopeHierarchy
}]);

// ...
```

### Route Definition
 - `config.auth.access` - The standard route `config.auth.access` [configurations](https://github.com/hapijs/hapi/blob/master/API.md#route-options) are all fully supported by this transformer.  Additionally, when a scope is specified with brackets `[]` around it, it is expanded based upon the scope hierarchy defined in the [transform options](#options).  The behavior here depends on the scope modifier (`+`, `!`, or none),
   - No modifier - the scope `'[scope-name]'` is expanded to include itself or any of the scopes up the scope hierarchy.
   - Forbidden (`!`) - the scope `'[!scope-name]'` is expanded to forbid itself and all scopes up the scope hierarchy.
   - Required (`+`) - the scope `'[+scope-name]'` is expanded to require itself and all scopes down the scope hierarchy.
