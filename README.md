# loveboat-nested-scopes
support nested auth scopes in hapi

(a transform written for [**loveboat**](https://github.com/devinivy/loveboat))

[![Build Status](https://travis-ci.org/devinivy/loveboat-nested-scopes.svg?branch=master)](https://travis-ci.org/devinivy/loveboat-nested-scopes) [![Coverage Status](https://coveralls.io/repos/devinivy/loveboat-nested-scopes/badge.svg?branch=master&service=github)](https://coveralls.io/github/devinivy/loveboat-nested-scopes?branch=master)

Lead Maintainer - [Devin Ivy](https://github.com/devinivy)

## Usage

> See also the [API Reference](API.md)

This loveboat transform allows you to define hierarchical auth scopes on routes and to leverage that hierarchy when writing your route configurations.  The core idea is that allowing unprivileged scopes on a route should also permit the higher-privileged scopes.

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

    and possibly listing any other transforms you'd like to use.*

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
