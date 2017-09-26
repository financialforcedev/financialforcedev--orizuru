'use strict';

const
	_ = require('lodash'),
	express = require('express'),
	expressRouter = express.Router,
	bodyParser = require('body-parser'),
	helmet = require('helmet'),

	Publish = require('./messaging/publish'),

	SCHEMA_API_PARAM = '/:schemaName',

	{ compileSchemas } = require('./shared/compileSchemas'),

	serverStore = new WeakMap(),

	api = schemaNameToDefinition => (request, response) => {

		const
			schemaName = request.params.schemaName,
			schema = schemaNameToDefinition[schemaName],
			body = request.body;

		if (!schema) {
			response.status(400).send(`No schema for '${schemaName}' found.`);
		} else {

			try {
				const buffer = schema.toBuffer(body);

				Publish
					.send({ schemaName, buffer })
					.then(() => response.status(200).send('Ok.'))
					.catch(() => response.status(400).send(`Error propogating event for '${schemaName}'.`));

			} catch (err) {
				response.status(400).send(`Error encoding post body for schema: '${schemaName}'.`);
			}

		}

	};

/** Class representing a server. */
class Server {

	/**
	 * Constructs a new 'Server'
	 * 
	 * @example
	 * // returns serverInstance
	 * new Server();
	 * 
	 * @returns {Server}
	 */
	constructor() {

		// create server
		const server = express();

		// body parser
		server.use(bodyParser.json());

		// Header security
		server.use(helmet());

		// add server to private store
		serverStore[this] = server;

	}

	/**
	 * Adds a 'route' to the server
	 * 
	 * @example
	 * // adds schemas to the default ( http://host/{schemaName} ) route
	 * server.addRoute({
	 * 	schemaNameToDefinition: {
	 * 		test: {} // an avro compliant schema (see avro schema API)
	 * 	}
	 * });
	 * @example
	 * // adds schemas to a route at ( http://host/api/test/{schemaName} )
	 * server.addRoute({ schemaNameToDefinition, apiEndpoint: '/api/test' });
	 * @example
	 * // adds middleware functions contained in the middlewares array (see express middleware API)
	 * server.addRoute({ schemaNameToDefinition, middlewares: [...] });
	 * 
	 * @param {*} input - { schemaNameToDefinition [, middlewares] [, apiEndpoint] }
	 * 
	 * @returns {Server}
	 */
	addRoute({ schemaNameToDefinition, middlewares, apiEndpoint }) {

		// create router
		const router = expressRouter();

		// validate
		if (!_.isString(apiEndpoint)) {
			apiEndpoint = '';
		}
		if (!_.isArray(middlewares)) {
			middlewares = [];
		}

		// compile schemas
		compileSchemas(schemaNameToDefinition);

		// apply middlewares
		_.each(middlewares, middleware => {
			if (_.isFunction(middleware)) {
				router.use(middleware);
			}
		});

		// add post method
		router.post(SCHEMA_API_PARAM, api(schemaNameToDefinition));

		serverStore[this].use(apiEndpoint, router);

		return this;

	}

	/**
	 * Returns the express server
	 * 
	 * @example
	 * // returns the express server
	 * server.getServer().listen('8080');
	 * @returns {express}
	 */
	getServer() {
		return serverStore[this];
	}

}

module.exports = Server;