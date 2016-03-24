'use strict';

// Load modules

const Lab = require('lab');
const Code = require('code');
const Hapi = require('hapi');
const Loveboat = require('loveboat');
const LoveboatNestedScopes = require('..');

// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

const internals = {};

describe('loveboat-nested-scopes', () => {

    it('supports passing no scope options.', (done) => {

        const server = internals.server();

        server.register(Loveboat, (err) => {

            expect(err).to.not.exist();

            expect(() => {

                server.routeTransforms({
                    transform: LoveboatNestedScopes
                });

                server.loveboat({
                    method: 'get',
                    path: '/',
                    handler: internals.boringHandler,
                    config: internals.scope(['user'])
                });

            }).to.not.throw();

            const route = server.match('get', '/');
            expect(route.settings.auth.access).to.deep.equal([
                { scope: { selection: ['user'] } }
            ]);

            done();
        });

    });

    it('throws when expanding a scope that is not listed.', (done) => {

        const server = internals.server();

        server.register(Loveboat, (err) => {

            expect(err).to.not.exist();

            server.routeTransforms({
                transform: LoveboatNestedScopes
            });

            expect(() => {

                server.loveboat({
                    method: 'get',
                    path: '/',
                    handler: internals.boringHandler,
                    config: internals.scope(['[user]'])
                });

            }).to.throw('Scope "user" was not specified in transform options and can\'t be expanded.');

            done();
        });

    });

});

internals.server = function() {

    const server = new Hapi.Server();
    server.connection();

    // Mock scheme for testing
    server.auth.scheme('mock', function(server, options) {

        return {
            authenticate: function(request, reply) {

                reply({ credentials: {} });
            }
        };
    });

    // To register a strategy that logs you in with this canned record
    server.auth.strategy('testing', 'mock');
    server.auth.default('testing');

    return server;
};

internals.boringHandler = function (request, reply) {

    reply('ok');
};

internals.scope = function (scope) {

    return {
        auth: {
            access: { scope }
        }
    };
}
