# loveboat-nested-scopes
support nested auth scopes in hapi

(a transform written for [**loveboat**](https://github.com/devinivy/loveboat))

[![Build Status](https://travis-ci.org/devinivy/loveboat-nested-scopes.svg?branch=master)](https://travis-ci.org/devinivy/loveboat-nested-scopes) [![Coverage Status](https://coveralls.io/repos/devinivy/loveboat-nested-scopes/badge.svg?branch=master&service=github)](https://coveralls.io/github/devinivy/loveboat-nested-scopes?branch=master)

## Usage

This loveboat transform allows you to... whereas hapi on its own only supports...

Post-requisites run right after the handler, so they are especially useful for cleanup and for modifying the response.

```js
// Ever wish this worked?
server.loveboat({});
```

To use this transform,

1. Make sure the [loveboat](https://github.com/devinivy/loveboat) hapi plugin is registered to your server.
2. Tell loveboat that you'd like to use this transform by calling `server.routeTransforms([require('loveboat-nested-scopes')])`, possibly listing any other transforms you'd like to use.*
3. Register your routes using `server.loveboat()` rather than `server.route()`.

<sup>* There are other ways to tell loveboat which transforms to use too!  Just check-out the [readme](https://github.com/devinivy/loveboat/blob/master/README.md).

```js
const Hapi = require('hapi');
const Loveboat = require('loveboat');

const server = new Hapi.Server();
server.connection();

// 1. Register loveboat
server.register(Loveboat, (err) => {

    // 2. Tell loveboat to use this transform
    server.routeTransforms([
        require('loveboat-nested-scopes')
    ]);

    // 3. Configure your routes!
    server.loveboat({});

});
```

## API
### Options
The following options may be specified when the transform is registered,
 - `xxx` - xxx.

### Route Definition
 - `xxx` - xxx.
