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
 */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import avsc from 'avsc';
import { EventEmitter } from 'events';
import _ from 'lodash';

import { AvroSchema, ITransport, Options } from '../../src';
import { Transport } from '../../src/index/transport/transport';
import { PublishFunctionValidator } from '../../src/index/validator/publishFunction';

import { Publisher } from '../../src/index/publisher';

chai.use(chaiAsPromised);
chai.use(sinonChai);

const expect = chai.expect;

describe('index/publisher', () => {

	let transport: ITransport;
	let options: Options.IPublisher;

	beforeEach(() => {

		transport = {
			close: sinon.stub(),
			connect: sinon.stub().resolves(),
			publish: sinon.stub(),
			subscribe: sinon.stub()
		};

		options = {
			transport
		};

	});

	afterEach(() => {
		sinon.restore();
	});

	describe('constructor', () => {

		it('should emit an error event if the options are invalid', () => {

			// Given
			sinon.spy(EventEmitter.prototype, 'emit');

			delete options.transport;

			// When
			// Then
			expect(() => new Publisher(options)).to.throw(/^Missing required object parameter: transport\.$/g);

			expect(EventEmitter.prototype.emit).to.have.been.calledOnce;
			expect(EventEmitter.prototype.emit).to.have.been.calledWith(Publisher.ERROR);

		});

		it('should extend EventEmitter', () => {

			// Given
			// When
			const publisher = new Publisher(options);

			// Then
			expect(publisher).to.be.an.instanceof(EventEmitter);

		});

	});

	describe('init', () => {

		it('should connect to the transport', async () => {

			// Given
			const publisher = new Publisher(options);

			// When
			await publisher.init();

			// Then
			expect(options.transport.connect).to.have.been.calledOnce;
			expect(options.transport.connect).to.have.been.calledWithExactly();

		});

	});

	describe('validate', () => {

		it('should throw an error if the transport cannot be encoded', () => {

			// Given
			sinon.stub(Transport.prototype, 'encode').throws(new Error('encoding error'));

			const message: any = {
				context: {},
				message: 'test'
			};

			const schema = avsc.Type.forSchema({
				fields: [
					{ name: 'first', type: 'string' },
					{ name: 'last', type: 'string' }
				],
				name: 'FullName',
				namespace: 'com.example',
				type: 'record'
			}) as AvroSchema;

			const publisher = new Publisher(options);

			sinon.spy(publisher, 'error');

			// When
			expect(() => publisher.validate(schema, message)).to.throw('Error validating message for schema (com.example.FullName)\nInvalid value (undefined) for path (first) it should be of type (string)\nInvalid value (undefined) for path (last) it should be of type (string)');

			// Then
			expect(publisher.error).to.have.been.calledOnce;

		});

		it('should not throw an error if the message is valid', () => {

			// Given
			sinon.stub(Transport.prototype, 'encode').returns('encoded message');

			const message: any = {
				first: 'Test',
				last: 'Tester'
			};

			const schema = avsc.Type.forSchema({
				fields: [
					{ name: 'first', type: 'string' },
					{ name: 'last', type: 'string' }
				],
				name: 'FullName',
				namespace: 'com.example',
				type: 'record'
			}) as AvroSchema;

			const publisher = new Publisher(options);

			sinon.spy(publisher, 'error');

			// When
			publisher.validate(schema, message);

			// Then
			expect(publisher.error).to.not.have.been.called;

		});

	})

	describe('publish', () => {

		it('should publish a message to the queue with the same name as the schema', async () => {

			// Given
			sinon.stub(PublishFunctionValidator.prototype, 'validate');
			sinon.spy(EventEmitter.prototype, 'emit');
			sinon.stub(Transport.prototype, 'encode').returns('encodedMessage');

			const publisher = new Publisher(options);

			const schema = avsc.Type.forSchema({
				fields: [
					{ name: 'first', type: 'string' },
					{ name: 'last', type: 'string' }
				],
				name: 'FullName',
				namespace: 'com.example',
				type: 'record'
			});

			const publishOptions = {
				message: {
					context: {
						user: {
							username: 'test@test.com'
						}
					},
					message: {
						first: 'First',
						last: 'Last'
					}
				},
				schema
			};

			sinon.spy(publisher, 'info');

			options.transport.publish = sinon.stub().resolves();

			// When
			await publisher.publish(publishOptions);

			// Then
			expect(PublishFunctionValidator.prototype.validate).to.have.been.calledOnce;
			expect(Transport.prototype.encode).to.have.been.calledWithExactly(publishOptions.schema, publishOptions.message);
			expect(transport.publish).to.have.been.calledOnce;
			expect(transport.publish).to.have.been.calledWithExactly('encodedMessage', {
				eventName: 'com.example.FullName'
			});
			expect(publisher.info).to.have.been.calledOnce;
			expect(publisher.info).to.have.been.calledWithExactly('Published com.example.FullName event.');
			expect(EventEmitter.prototype.emit).to.have.been.calledOnce;
			expect(EventEmitter.prototype.emit).to.have.been.calledWithExactly(Publisher.INFO, 'Published com.example.FullName event.');

		});

		it('should publish a message to the queue with the event name in the publish options', async () => {

			// Given
			sinon.stub(PublishFunctionValidator.prototype, 'validate');
			sinon.spy(EventEmitter.prototype, 'emit');
			sinon.stub(Transport.prototype, 'encode').returns('encodedMessage');

			const publisher = new Publisher(options);

			const schema = avsc.Type.forSchema({
				fields: [
					{ name: 'first', type: 'string' },
					{ name: 'last', type: 'string' }
				],
				name: 'FullName',
				namespace: 'com.example',
				type: 'record'
			});

			const messagePublishOptions = {
				message: {
					context: {
						user: {
							username: 'test@test.com'
						}
					},
					message: {
						first: 'First',
						last: 'Last'
					}
				},
				publishOptions: {
					eventName: 'test'
				},
				schema
			};

			sinon.spy(publisher, 'info');

			options.transport.publish = sinon.stub().resolves();

			// When
			await publisher.publish(messagePublishOptions);

			// Then
			expect(PublishFunctionValidator.prototype.validate).to.have.been.calledOnce;
			expect(Transport.prototype.encode).to.have.been.calledWithExactly(messagePublishOptions.schema, messagePublishOptions.message);
			expect(transport.publish).to.have.been.calledOnce;
			expect(transport.publish).to.have.been.calledWithExactly('encodedMessage', {
				eventName: 'test'
			});
			expect(publisher.info).to.have.been.calledOnce;
			expect(publisher.info).to.have.been.calledWithExactly('Published com.example.FullName event.');
			expect(EventEmitter.prototype.emit).to.have.been.calledOnce;
			expect(EventEmitter.prototype.emit).to.have.been.calledWithExactly(Publisher.INFO, 'Published com.example.FullName event.');

		});

		describe('should throw an error', () => {

			it('if no options is provided', async () => {

				// Given
				sinon.stub(PublishFunctionValidator.prototype, 'validate').throws(new Error('Missing required object parameter.'));

				const publisher = new Publisher(options);

				const publishOptions: any = {};

				// When
				await expect(publisher.publish(publishOptions)).to.eventually.be.rejectedWith(/^Missing required object parameter\.$/);

				// Then
				expect(PublishFunctionValidator.prototype.validate).to.have.been.calledOnce;

			});

			it('if the transport cannot be encoded', async () => {

				// Given
				sinon.stub(PublishFunctionValidator.prototype, 'validate');
				sinon.stub(Transport.prototype, 'encode').throws(new Error('encoding error'));

				const publishMessage = {
					message: {
						context: {},
						message: {
							first: 'Test',
							last: 'Tester'
						}
					},
					schema: avsc.Type.forSchema({
						fields: [
							{ name: 'first', type: 'string' },
							{ name: 'last', type: 'string' }
						],
						name: 'FullName',
						namespace: 'com.example',
						type: 'record'
					})
				};

				const publisher = new Publisher(options);

				sinon.spy(publisher, 'error');

				// When
				await expect(publisher.publish(publishMessage)).to.eventually.be.rejectedWith('Error encoding message for schema (com.example.FullName): encoding error');

				// Then
				expect(PublishFunctionValidator.prototype.validate).to.have.been.calledOnce;
				expect(publisher.error).to.have.been.calledOnce;

			});

			it('if the publishing the message fails', async () => {

				// Given
				sinon.stub(PublishFunctionValidator.prototype, 'validate');
				sinon.spy(EventEmitter.prototype, 'emit');

				const expectedError = new Error('Failed to publish message.');

				options.transport.publish = sinon.stub().rejects(expectedError);

				const publishMessage = {
					message: {
						context: {},
						message: {
							first: 'Test',
							last: 'Tester'
						}
					},
					schema: avsc.Type.forSchema({
						fields: [
							{ name: 'first', type: 'string' },
							{ name: 'last', type: 'string' }
						],
						name: 'FullName',
						namespace: 'com.example',
						type: 'record'
					})
				};

				const publisher = new Publisher(options);

				sinon.spy(publisher, 'error');

				// When
				await expect(publisher.publish(publishMessage)).to.eventually.be.rejectedWith('Failed to publish message.');

				// Then
				expect(PublishFunctionValidator.prototype.validate).to.have.been.calledOnce;
				expect(publisher.error).to.have.been.calledOnce;
				expect(publisher.error).to.have.been.calledWithExactly('Error publishing message on transport.');
				expect(EventEmitter.prototype.emit).to.have.been.calledOnce;
				expect(EventEmitter.prototype.emit).to.have.been.calledWith(Publisher.ERROR);

			});

		});

	});

});
