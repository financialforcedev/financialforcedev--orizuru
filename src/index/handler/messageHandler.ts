/*
 * Copyright (c) 2017-2019, FinancialForce.com, inc
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
 */

/**
 * @module handler/messageHandler
 */

import { Type } from 'avsc';
import { get } from 'lodash';

import { Handler, IOrizuruMessage, Options } from '../..';
import { Transport } from '../transport/transport';

/**
 * Handles an incoming message with the given handler.
 *
 * @param handler The Orizuru Handler.
 * @param options The handler function options.
 */
export function messageHandler<C extends Orizuru.Context, M extends Orizuru.Message>(handler: Handler, options: Options.IHandlerFunction<C, M>) {

	const eventName = get(options.subscribeOptions, 'eventName') || get(options.schema, 'name');
	const transport = new Transport();

	return async (content: Buffer) => {

		handler.info(`Handler received ${eventName} event.`);

		try {
			const decodedContent: IOrizuruMessage<C, M> = transport.decode(options.schema as Type, content);
			return await options.handler(decodedContent);
		} catch (err) {
			handler.error(err);
		}

	};

}
