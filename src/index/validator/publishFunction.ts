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
 * @module validator/publishFunction
 */

import { isPlainObject } from 'lodash';

import { AvroSchema, Options } from '../..';

import { SchemaValidator } from './shared/schema';

export interface ValidatedPublishFunctionOptions<C extends Orizuru.Context, M extends Orizuru.Message> extends Options.IPublishFunction<C, M> {

	/**
	 * The [Apache Avro](https://avro.apache.org/docs/current/) schema.
	 */
	schema: AvroSchema;
}

/**
 * Validates {@link Publisher} function options.
 */
export class PublishFunctionValidator {

	/**
	 * Validate the publish function options.
	 * @param options The publish function options to validate.
	 */
	public validate<C extends Orizuru.Context, M extends Orizuru.Message>(options: Options.IPublishFunction<C, M>) {

		if (!options) {
			throw new Error('Missing required object parameter.');
		}

		if (!isPlainObject(options)) {
			throw new Error(`Invalid parameter: ${options} is not an object.`);
		}

		// Validate the schema
		options.schema = new SchemaValidator().validate(options.schema);

		return options as ValidatedPublishFunctionOptions<C, M>;

	}

}
