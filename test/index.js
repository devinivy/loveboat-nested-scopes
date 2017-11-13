'use strict';

// Load modules

const Lab = require('lab');
const Code = require('code');
const Hapi = require('hapi');
const Joi = require('joi');
const Loveboat = require('loveboat');
const LoveboatNestedScopes = require('..');

// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

const internals = {};

describe('loveboat-nested-scopes', () => {

    const scopeOptions = [
        {
            scope: 'admin',
            subscopes: [
                { scope: 'app' },
                {
                    scope: 'user',
                    subscopes: [
                        'group-one',
                        'group-two',
                        {
                            scope: 'group-three',
                            subscopes: [
                                'group-three-one',
                                { scope: 'group-three-two' }
                            ]
                        }
                    ]
                }
            ]
        },
        'grandma',
        { scope: 'grandpa', subscopes: 'dad' }
    ];

    it('integrates with hapi and loveboat.', (done) => {

        internals.server((err, server) => {

            expect(err).to.not.exist();

            server.routeTransforms({
                transform: LoveboatNestedScopes,
                options: scopeOptions
            });

            server.loveboat({
                method: 'get',
                path: '/',
                handler: internals.boringHandler,
                config: {
                    auth: {
                        access: [
                            { scope: false },
                            { scope: 'whatever' },
                            {
                                scope: [
                                    '[+group-three]',
                                    '[!dad]',
                                    '[app]',
                                    'some-scope'
                                ],
                                entity: 'app'
                            }
                        ]
                    }
                }
            });

            const route = server.match('get', '/');
            expect(route.settings.auth.access).to.equal([
                { scope: false },
                { scope: { selection: ['whatever'] } },
                {
                    scope: {
                        required: [
                            'group-three',
                            'group-three-two',
                            'group-three-one'
                        ],
                        forbidden: [
                            'dad',
                            'grandpa'
                        ],
                        selection: [
                            'app',
                            'admin',
                            'some-scope'
                        ]
                    },
                    entity: 'app'
                }
            ]);

            done();
        });

    });

    describe('handler', () => {

        const handler = LoveboatNestedScopes.handler;
        const tryHandler = (access, options) => {

            // Make sure the test is valid
            const match = LoveboatNestedScopes.match;
            const result = Joi.validate(access, match);

            expect(result.error).to.not.exist();
            expect(result.value).to.equal(access);

            return handler(access, null, null, options);
        };

        it('expands simple nested scopes and passes through non-nested scopes.', (done) => {

            const input = [{
                scope: ['[dad]', 'some-scope', '[group-one]', 'some-other-scope']
            }];

            const output = [{
                scope: ['dad', 'grandpa', 'some-scope', 'group-one', 'user', 'admin', 'some-other-scope']
            }];

            expect(tryHandler(input, scopeOptions)).to.equal([output]);

            done();
        });

        it('processes multiple access items.', (done) => {

            const input = [
                {
                    scope: ['[app]']
                },
                {
                    scope: ['[grandma]']
                }
            ];

            const output = [
                {
                    scope: ['app', 'admin']
                },
                {
                    scope: ['grandma']
                }
            ];

            expect(tryHandler(input, scopeOptions)).to.equal([output]);

            done();
        });

        it('passes through entity field.', (done) => {

            const input = [{
                scope: ['[grandma]'],
                entity: 'app'
            }];

            const output = [{
                scope: ['grandma'],
                entity: 'app'
            }];

            expect(tryHandler(input, scopeOptions)).to.equal([output]);

            done();
        });

        it('ignores false scope.', (done) => {

            const input = [
                {
                    scope: false
                },
                {
                    scope: ['[grandma]']
                }
            ];

            const output = [
                {
                    scope: false
                },
                {
                    scope: ['grandma']
                }
            ];

            expect(tryHandler(input, scopeOptions)).to.equal([output]);

            done();
        });

        it('processes \'!\' modifier.', (done) => {

            const input = [{
                scope: ['[!group-one]']
            }];

            const output = [{
                scope: ['!group-one', '!user', '!admin']
            }];

            expect(tryHandler(input, scopeOptions)).to.equal([output]);

            done();
        });

        it('processes \'+\' modifier, walking down the scope tree.', (done) => {

            const input = [{
                scope: ['[+user]']
            }];

            const output = [{
                scope: [
                    '+user',
                    '+group-three',
                    '+group-three-two', '+group-three-one',
                    '+group-two', '+group-one'
                ]
            }];

            expect(tryHandler(input, scopeOptions)).to.equal([output]);

            done();
        });

        it('throws when expanding a scope that is not listed.', (done) => {

            const message = 'Scope "user" was not specified in transform options and can\'t be expanded.';

            // With options
            expect(() => {

                tryHandler([{
                    scope: ['[user]']
                }], ['admin']);

            }).to.throw(message);

            // Without options
            expect(() => {

                tryHandler([{
                    scope: ['[user]']
                }]);

            }).to.throw(message);

            done();
        });
    });

    describe('matcher', () => {

        const match = LoveboatNestedScopes.match;

        it('matches access props with nested scopes.', (done) => {

            const check = (value) => {

                expect(() => Joi.assert(value, match)).to.not.throw();
            };

            check({
                scope: '[scope]'
            });

            check({
                scope: ['others', '[scope]']
            });

            check({
                scope: ['others', '[scope]'],
                entity: 'app'
            });

            check([
                {
                    scope: false
                },
                {
                    scope: '[scope]'
                }
            ]);

            check([
                {
                    scope: false
                },
                {
                    scope: ['others', '[scope]']
                }
            ]);

            check([
                {
                    scope: ['others']
                },
                {
                    scope: ['others', '[scope]']
                }
            ]);

            check([
                {
                    scope: ['others'],
                    entity: 'app'
                },
                {
                    scope: ['others', '[scope]'],
                    entity: 'app'
                }
            ]);

            done();
        });

        it('does not match access props without nested scopes.', (done) => {

            const check = (value) => {

                expect(() => Joi.assert(value, match)).to.throw();
            };

            check({
                scope: false
            });

            check({
                scope: 'scope'
            });

            check({
                scope: ['others', 'scope']
            });

            check({
                scope: ['others', 'scope'],
                entity: 'app'
            });

            check([
                {
                    scope: false
                },
                {
                    scope: 'scope'
                }
            ]);

            check([
                {
                    scope: false
                },
                {
                    scope: ['others', 'scope']
                }
            ]);

            check([
                {
                    scope: ['others']
                },
                {
                    scope: ['others', 'scope']
                }
            ]);

            check([
                {
                    scope: ['others'],
                    entity: 'app'
                },
                {
                    scope: ['others', 'scope'],
                    entity: 'app'
                }
            ]);

            done();
        });

    });

});

internals.server = function (cb) {

    const server = new Hapi.Server();
    server.connection();

    // Mock scheme for testing
    server.auth.scheme('mock', (srv, options) => {

        return {
            authenticate: function (request, reply) {

                reply({ credentials: {} });
            }
        };
    });

    // To register a strategy that logs you in with this canned record
    server.auth.strategy('testing', 'mock');
    server.auth.default('testing');

    return server.register(Loveboat, (err) => cb(err, server));
};

internals.boringHandler = function (request, reply) {

    reply('ok');
};
