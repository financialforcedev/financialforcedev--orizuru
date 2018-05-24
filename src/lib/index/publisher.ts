/**
 * Copyright (c) 2017-2018, FinancialForce.com, inc
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 *   are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *      this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice,
 *      this list of conditions and the following disclaimer in the documentation
 *      and/or other materials provided with the distribution.
 * - Neither the name of the FinancialForce.com, inc nor the names of its contributors
 *      may be used to endorse or promote products derived from this software without
 *      specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 *  ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 *  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
 *  THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 *  OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 *  OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **/

'use strict';

import _ from 'lodash';
import { EventEmitter } from 'events';
import PublisherValidator from './validator/publisher';
import ServerValidator from './validator/server';
import Transport from './transport/transport';

/**
 * The Publisher for publishing messages based on Avro schemas.
 * @extends EventEmitter
 */
export default class Publisher extends EventEmitter {

	/**
	 * The error event name.
	 */
	static readonly ERROR: string = 'error_event';

	/**
	 * The info event name.
	 */
	static readonly INFO: string = 'info_event';

	private readonly transport: Transport;
	private readonly transportConfig: any;
	private readonly transportImpl: (config: any) => Promise<any>;
	private readonly validator: PublisherValidator;

	/**
	 * Constructs a new 'Publisher'.
	 *
	 * @param {Object} config - { transport [, transportConfig] }
	 * @param {transport} config.transport - the transport object
	 * @param {Object} config.transportConfig - config for the transport object
	 */
	constructor(config: any) {

		super();

		this.info('Creating publisher.');

		try {

			// Validate the config
			new ServerValidator(config);

			// Define the transport
			this.transport = new Transport();
			this.transportConfig = config.transportConfig;
			this.transportImpl = config.transport.publish;

			// Define the publisher validator
			this.validator = new PublisherValidator();

		} catch (err) {
			this.error(err);
			throw err;
		}

	}

	/**
	 * Publishes a message.
	 *
	 * @example
	 * // publishes a message
	 * publisher.publish({ schema, message });
	 * @example
	 * // publishes a message
	 * publisher.publish({ schema, message, context });
	 */
	publish(config: any) {

		// Validate the arguments.
		try {
			this.validator.validate(config);
		} catch (err) {
			this.error(err);
			throw err;
		}

		// Generate transport buffer.
		const
			schema = config.schema,
			message = config.message,
			eventName = config.schema.name,
			context = config.context,
			transportImplConfig = _.cloneDeep(this.transportConfig) || {};

		let buffer;

		try {
			buffer = this.transport.encode(schema, message, context);
		} catch (err) {

			const errors = new Array<String>();

			errors.push(`Error encoding message for schema (${eventName}):`);

			schema.isValid(config.message, {
				errorHook: (path: any, any: any, type: any) => {
					errors.push(`invalid value (${any}) for path (${path.join()}) it should be of type (${type.typeName})`);
				}
			});

			this.error(errors.join('\n'));
			throw new Error(errors.join('\n'));

		}

		transportImplConfig.config = config.config || {};
		transportImplConfig.config.rawMessage = message;

		// publish buffer on transport
		return this.transportImpl({ eventName, buffer, config: transportImplConfig })
			.then(result => {
				this.info(`Published ${schema.name} event.`);
				return result;
			})
			.catch(err => {
				this.error('Error publishing message on transport.');
				throw err;
			});

	}

	/**
	 * Emit an error event.
	 * @param {Object} event - The error event.
	 */
	error(event: any) {
		this.emit(Publisher.ERROR, event);
	}

	/**
	 * Emit an info event.
	 * @param {Object} event - The info event.
	 */
	info(event: any) {
		this.emit(Publisher.INFO, event);
	}

}