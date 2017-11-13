## API
### Options
When the transform is registered, options should be specified to define the hierarchy of your scopes.  Options take the form of an item or array of items, each of which is of the format,
  - a string naming a scope, or
  - an object of the format,
    - `scope` - a string naming a scope.
    - `subscopes` - (optional) an item or array of items as defined here and above.  These items specify scopes that are considered "included" by the scope named in `scope`.

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
 - `config.auth.access` - The standard route `config.auth.access` [configurations](https://github.com/hapijs/hapi/blob/v16/API.md#route-options) are all fully supported by this transformer.  Additionally, when a scope is specified with brackets `[]` around it, it is expanded based upon the scope hierarchy defined in the [transform options](#options).  The behavior here depends on the scope modifier (`+`, `!`, or none),
   - No modifier - the scope `'[scope-name]'` is expanded to include itself (`scope-name`) or any of the scopes up the scope hierarchy.
   - Forbidden (`!`) - the scope `'[!scope-name]'` is expanded to forbid itself and all scopes up the scope hierarchy.
   - Required (`+`) - the scope `'[+scope-name]'` is expanded to require itself and all scopes _down_ the scope hierarchy.
