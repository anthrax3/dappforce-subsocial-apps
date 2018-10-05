// Copyright 2017-2018 @polkadot/app-rpc authors & contributors
// This software may be modified and distributed under the terms
// of the ISC license. See the LICENSE file for details.

import { RpcMethod } from '@polkadot/jsonrpc/types';
import { RawParam } from '@polkadot/ui-app/Params/types';
import { I18nProps } from '@polkadot/ui-app/types';
import { QueueTx$RpcAdd } from '@polkadot/ui-signer/types';

import './index.css';

import BN from 'bn.js';
import React from 'react';
import rpc from '@polkadot/jsonrpc';
import Button from '@polkadot/ui-app/Button';
import InputRpc from '@polkadot/ui-app/InputRpc';
import Params from '@polkadot/ui-app/Params';

import Account from './Account';
import translate from './translate';

type Props = I18nProps & {
  queueRpc: QueueTx$RpcAdd
};

type State = {
  isValid: boolean,
  accountNonce: BN,
  publicKey?: Uint8Array | null,
  rpc: RpcMethod,
  values: Array<RawParam>
};

const defaultMethod = rpc.author.methods.submitExtrinsic;

class Selection extends React.PureComponent<Props, State> {
  state: State = {
    isValid: false,
    accountNonce: new BN(0),
    publicKey: null,
    rpc: defaultMethod,
    values: []
  };

  render () {
    const { t } = this.props;
    const { isValid } = this.state;

    return (
      <section className='rpc--Selection'>
        <InputRpc
          defaultValue={defaultMethod}
          onChange={this.onChangeMethod}
        />
        {this.renderAccount()}
        <Params
          onChange={this.onChangeValues}
          params={[]}
        />
        <Button.Group>
          <Button
            isDisabled={!isValid}
            isPrimary
            onClick={this.onSubmit}
            text={t('submit', {
              defaultValue: 'Submit RPC call'
            })}
          />
        </Button.Group>
      </section>
    );
  }

  private renderAccount () {
    const { rpc: { isSigned = false }, publicKey } = this.state;

    if (!isSigned) {
      return null;
    }

    return (
      <Account
        defaultValue={publicKey}
        onChange={this.onChangeAccount}
      />
    );
  }

  private nextState (newState: State): void {
    this.setState(
      (prevState: State): State => {
        const { rpc = prevState.rpc, accountNonce = prevState.accountNonce, publicKey = prevState.publicKey, values = prevState.values } = newState;
        const hasNeededKey = rpc.isSigned !== true || (!!publicKey && publicKey.length === 32);
        const isValid = values.reduce((isValid, value) => {
          return isValid && value.isValid === true;
        }, rpc.params.length === values.length && hasNeededKey);

        return {
          isValid,
          rpc,
          accountNonce: accountNonce || new BN(0),
          publicKey,
          values
        };
      }
    );
  }

  private onChangeAccount = (publicKey: Uint8Array | undefined | null, accountNonce: BN): void => {
    this.nextState({
      accountNonce,
      publicKey
    } as State);
  }

  private onChangeMethod = (rpc: RpcMethod): void => {
    this.nextState({
      rpc,
      values: [] as Array<RawParam>
    } as State);
  }

  private onChangeValues = (values: Array<RawParam>): void => {
    this.nextState({ values } as State);
  }

  private onSubmit = (): void => {
    const { queueRpc } = this.props;
    const { accountNonce, publicKey, rpc, values } = this.state;

    queueRpc({
      accountNonce,
      publicKey,
      rpc,
      values: values.map(({ value }) => value)
    });
  }
}

export default translate(Selection);
