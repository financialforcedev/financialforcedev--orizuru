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
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { EventEmitter } from 'events';
import avsc from 'avsc';
import { Handler } from '../../lib';
import HandlerValidator from '../../lib/index/validator/handler';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('index/handler', () => {

	let mocks: any;

	beforeEach(() => {

		mocks = {};

		mocks.config = {
			transport: {
				publish: _.noop,
				subscribe: _.noop
			},
			transportConfig: _.noop
		};

		mocks.handlerValidator = sinon.stub().returnsThis();
		mocks.messageHandler = sinon.stub();
		mocks.transport = sinon.stub().returnsThis();

	});

	afterEach(() => {

	});

	describe('constructor', () => {

		it('should extend EventEmitter', () => {

			// Given
			// When
			const handler = new Handler(mocks.config);

			// Then
			chai.expect(handler).to.be.an.instanceof(EventEmitter);

		});

		it('should emit an error event if the configuration is invalid', () => {

			// Given
			sinon.spy(EventEmitter.prototype, 'emit');

			// When
			// Then
			chai.expect(() => new Handler({})).to.throw(/^Missing required object parameter: transport\.$/g);

			chai.expect(EventEmitter.prototype.emit).to.have.been.calledTwice;
			chai.expect(EventEmitter.prototype.emit).to.have.been.calledWith('info_event', 'Creating handler.');
			chai.expect(EventEmitter.prototype.emit).to.have.been.calledWith('error_event');

		});

		it('should initialise the transport', () => {

			// Given
			// When
			const handler = new Handler(mocks.config);

			// Then
			chai.expect(mocks.transport).to.have.been.calledOnce;
			chai.expect(mocks.transport).to.have.been.calledWithNew;

		});

		it('should initialise the handler validator', () => {

			// Given
			// When
			const handler = new Handler(mocks.config);

			// Then
			chai.expect(mocks.handlerValidator).to.have.been.calledOnce;
			chai.expect(mocks.handlerValidator).to.have.been.calledWithNew;

		});

	});

	describe('handle', () => {

		it('should install the handler for a schema', () => {

			// Given
			mocks.config.transport.subscribe = sinon.stub().resolves();
			sinon.stub(HandlerValidator.prototype, 'validate');
			sinon.spy(EventEmitter.prototype, 'emit');

			const
				handler = new Handler(mocks.config),
				config = {
					handler: sinon.stub(),
					schema: avsc.Type.forSchema({
						type: 'record',
						namespace: 'com.example',
						name: 'FullName',
						fields: [
							{ name: 'first', type: 'string' },
							{ name: 'last', type: 'string' }
						]
					}),
					message: {
						first: 'First',
						last: 'Last'
					}
				};

			// When
			// Then
			return chai.expect(handler.handle(config))
				.to.eventually.be.fulfilled
				.then(() => {
					chai.expect(HandlerValidator.prototype.validate).to.have.been.calledOnce;
					chai.expect(EventEmitter.prototype.emit).to.have.been.calledTwice;
					chai.expect(EventEmitter.prototype.emit).to.have.been.calledWith('info_event', 'Creating handler.');
					chai.expect(EventEmitter.prototype.emit).to.have.been.calledWith('info_event', 'Installing handler for com.example.FullName events.');
					chai.expect(mocks.messageHandler).to.have.been.calledOnce;
				});

		});

		describe('should throw an error', () => {

			it('if no config is provided', () => {

				// Given
				sinon.stub(HandlerValidator.prototype, 'validate').throws(new Error('Missing required object parameter.'));

				const handler = new Handler(mocks.config);

				// When
				// Then
				chai.expect(() => handler.handle({})).to.throw(/^Missing required object parameter\.$/);
				chai.expect(HandlerValidator.prototype.validate).to.have.been.calledOnce;
				chai.expect(mocks.messageHandler).to.not.have.been.called;

			});

		});

	});

});