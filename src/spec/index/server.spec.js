'use strict';

const
	_ = require('lodash'),
	root = require('app-root-path'),
	sinon = require('sinon'),
	proxyquire = require('proxyquire'),
	{ expect } = require('chai'),
	{ calledOnce, calledTwice, calledThrice, calledWith, notCalled } = sinon.assert,
	request = require('supertest'),

	serverPath = root + '/src/lib/index/server',
	{ compileFromSchemaDefinition } = require(root + '/src/lib/index/shared/schema'),
	{ toBuffer } = require(root + '/src/lib/index/shared/transport'),

	sandbox = sinon.sandbox.create(),
	restore = sandbox.restore.bind(sandbox);

describe('index/server.js', () => {

	let config;

	beforeEach(() => {
		config = {
			transport: {
				publish: sandbox.stub(),
				subscribe: _.noop
			},
			transportConfig: 'testTransportConfig'
		};
	});

	afterEach(restore);

	describe('constructor', () => {

		let expressMock, expressMockResult, bodyParserMock, helmetMock, serverUseSpy, Server;

		beforeEach(() => {
			serverUseSpy = sandbox.spy();
			expressMockResult = {
				use: serverUseSpy
			};
			expressMock = function () {
				return expressMockResult;
			};
			bodyParserMock = 'bodyParserMock';
			helmetMock = 'helmetMock';
			Server = proxyquire(serverPath, {
				express: expressMock,
				'body-parser': {
					json: () => bodyParserMock
				},
				helmet: () => helmetMock
			});
		});

		it('should construct a server', () => {

			// given
			const
				server = new Server(config),
				express = server.getServer();

			// when - then
			expect(express).to.eql(expressMockResult);

			calledTwice(serverUseSpy);
			calledWith(serverUseSpy, bodyParserMock);
			calledWith(serverUseSpy, helmetMock);

		});

	});

	describe('addRoute', () => {

		let expressMock, expressMockResult, expressMockRouterResult, serverUseSpy, serverRouterUseSpy, serverRouterPostSpy, Server;

		beforeEach(() => {
			serverUseSpy = sandbox.spy();
			serverRouterUseSpy = sandbox.spy();
			serverRouterPostSpy = sandbox.spy();
			expressMockResult = {
				use: serverUseSpy
			};
			expressMock = function () {
				return expressMockResult;
			};
			expressMockRouterResult = {
				use: serverRouterUseSpy,
				post: serverRouterPostSpy
			};
			expressMock.Router = function () {
				return expressMockRouterResult;
			};
			Server = proxyquire(serverPath, {
				express: expressMock
			});
		});

		it('should throw an exception if schemaNameToDefinition isn\'t an object', () => {

			// given
			const
				server = new Server(config),
				input = {
					schemaNameToDefinition: null
				};

			// when - then
			expect(() => server.addRoute(input)).to.throw('Server init argument must be an object of: schemaName -> avroSchema.');

		});

		it('should throw an exception if schemaNameToDefinition values aren\'t valid schemas', () => {

			// given
			const
				server = new Server(config),
				input = {
					schemaNameToDefinition: {
						testSchema: []
					}
				};

			// when - then
			expect(() => server.addRoute(input)).to.throw('Schema name: \'testSchema\' schema could not be compiled.');

		});

		it('should add a route if schemaNameToDefinition map is correct, with default route and middlewares', () => {

			// given
			const
				server = new Server(config),
				input = {
					schemaNameToDefinition: {
						testSchema: {
							type: 'record',
							fields: [{
								name: 'f',
								type: 'string'
							}]
						}
					}
				};

			// when
			server.addRoute(input);

			// then
			notCalled(serverRouterUseSpy);
			calledOnce(serverRouterPostSpy);
			calledWith(serverRouterPostSpy, '/:schemaName', sinon.match.func);
			calledThrice(serverUseSpy);
			calledWith(serverUseSpy, sinon.match.func);
			calledWith(serverUseSpy, sinon.match.func);
			calledWith(serverUseSpy, '', expressMockRouterResult);

		});

		it('should add a route at custom endpoint if custom endpoint is provided', () => {

			// given
			const
				server = new Server(config),
				input = {
					schemaNameToDefinition: {
						testSchema: {
							type: 'record',
							fields: [{
								name: 'f',
								type: 'string'
							}]
						}
					},
					apiEndpoint: '/test'
				};

			// when
			server.addRoute(input);

			// then
			notCalled(serverRouterUseSpy);
			calledOnce(serverRouterPostSpy);
			calledWith(serverRouterPostSpy, '/:schemaName', sinon.match.func);
			calledThrice(serverUseSpy);
			calledWith(serverUseSpy, sinon.match.func);
			calledWith(serverUseSpy, sinon.match.func);
			calledWith(serverUseSpy, '/test', expressMockRouterResult);

		});

		it('should add a with middlewares if middlewares are provided', () => {

			// given
			const
				server = new Server(config),
				middleware = _.noop,
				input = {
					schemaNameToDefinition: {
						testSchema: {
							type: 'record',
							fields: [{
								name: 'f',
								type: 'string'
							}]
						}
					},
					middlewares: [middleware]
				};

			// when
			server.addRoute(input);

			// then
			calledOnce(serverRouterUseSpy);
			calledWith(serverRouterUseSpy, middleware);
			calledOnce(serverRouterPostSpy);
			calledWith(serverRouterPostSpy, '/:schemaName', sinon.match.func);
			calledThrice(serverUseSpy);
			calledWith(serverUseSpy, sinon.match.func);
			calledWith(serverUseSpy, sinon.match.func);
			calledWith(serverUseSpy, '', expressMockRouterResult);

		});

		it('should ignore middlewares that aren\'t functions', () => {

			// given
			const
				server = new Server(config),
				middleware = _.noop,
				input = {
					schemaNameToDefinition: {
						testSchema: {
							type: 'record',
							fields: [{
								name: 'f',
								type: 'string'
							}]
						}
					},
					middlewares: [middleware, 'a test']
				};

			// when
			server.addRoute(input);

			// then
			calledOnce(serverRouterUseSpy);
			calledWith(serverRouterUseSpy, middleware);
			calledOnce(serverRouterPostSpy);
			calledWith(serverRouterPostSpy, '/:schemaName', sinon.match.func);
			calledThrice(serverUseSpy);
			calledWith(serverUseSpy, sinon.match.func);
			calledWith(serverUseSpy, sinon.match.func);
			calledWith(serverUseSpy, '', expressMockRouterResult);

		});

	});

	describe('getServer', () => {

		describe('should return a server that', () => {

			let schema, server;

			beforeEach(() => {
				delete require.cache[require.resolve(serverPath)];
				const Server = require(serverPath);
				schema = {
					type: 'record',
					fields: [{
						name: 'f',
						type: 'string'
					}]
				};
				server = new Server(config).addRoute({
					schemaNameToDefinition: {
						testSchema1: schema
					},
					apiEndpoint: '/api'
				});
			});

			it('fails for an invalid schema', () => {

				// given - when - then
				return request(server.getServer())
					.post('/api/testSchemaUnknown')
					.expect(400, 'No schema for \'/api/testSchemaUnknown\' found.');

			});

			it('fails for a valid schema with no post body', () => {

				// given - when - then
				return request(server.getServer())
					.post('/api/testSchema1')
					.expect(400, 'Error encoding post body for schema: \'/api/testSchema1\'.');

			});

			describe('calls publish for a valid schema with a conforming post body and', () => {

				it('fails if publish rejects', () => {

					// given 
					config.transport.publish.rejects();

					// when - then
					return request(server.getServer())
						.post('/api/testSchema1')
						.send({
							f: 'test1'
						})
						.expect(400, 'Error propogating event for \'/api/testSchema1\'.')
						.then(() => {
							calledOnce(config.transport.publish);
							calledWith(config.transport.publish, {
								eventName: '/api/testSchema1',
								buffer: toBuffer(compileFromSchemaDefinition({
									type: 'record',
									fields: [{
										name: 'f',
										type: 'string'
									}]
								}), {
									f: 'test1'
								}),
								config: config.transportConfig
							});
						});

				});

				it('succeeds if publish resolves', () => {

					// given
					config.transport.publish.resolves();

					// when - then
					return request(server.getServer())
						.post('/api/testSchema1')
						.send({
							f: 'test2'
						})
						.expect(200, 'Ok.')
						.then(() => {
							calledOnce(config.transport.publish);
							calledWith(config.transport.publish, {
								eventName: '/api/testSchema1',
								buffer: toBuffer(compileFromSchemaDefinition({
									type: 'record',
									fields: [{
										name: 'f',
										type: 'string'
									}]
								}), {
									f: 'test2'
								}),
								config: config.transportConfig
							});
						});

				});

			});

		});

	});

});
