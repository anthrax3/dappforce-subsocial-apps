// Copyright 2017-2018 @polkadot/app-staking authors & contributors
// This software may be modified and distributed under the terms
// of the ISC license. See the LICENSE file for details.

import { I18nProps } from '@polkadot/ui-app/types';
import { QueueTx$ExtrinsicAdd } from '@polkadot/ui-signer/types';
import { RxBalanceMap } from '@polkadot/api-observable/types';

import BN from 'bn.js';
import React from 'react';
import Api from '@polkadot/api-observable';
import { AccountId, Balance, Extrinsic } from '@polkadot/types';
import AddressMini from '@polkadot/ui-app/AddressMini';
import AddressSummary from '@polkadot/ui-app/AddressSummary';
import Button from '@polkadot/ui-app/Button';
import Icon from '@polkadot/ui-app/Icon';
import classes from '@polkadot/ui-app/util/classes';
import withMulti from '@polkadot/ui-react-rx/with/multi';
import withObservable from '@polkadot/ui-react-rx/with/observable';

import Nominating from './Nominating';
import UnnominateButton from './UnnominateButton';
import translate from '../translate';

type Props = I18nProps & {
  accountNonce?: BN,
  accountId: string,
  balances: RxBalanceMap,
  name: string,
  stakingNominating?: AccountId,
  stakingNominatorsFor?: Array<string>,
  intentions: Array<string>,
  isValidator: boolean,
  queueExtrinsic: QueueTx$ExtrinsicAdd,
  validators: Array<string>
};

type State = {
  isNominateOpen: boolean
};

class Account extends React.PureComponent<Props, State> {
  constructor (props: Props) {
    super(props);

    this.state = {
      isNominateOpen: false
    };
  }

  render () {
    const { accountId, intentions, isValidator, name } = this.props;
    const { isNominateOpen } = this.state;

    return (
      <article className='staking--Account'>
        <Icon
          className={classes('staking--Account-validating', isValidator ? 'isValidator' : '')}
          name='certificate'
          size='large'
        />
        <Nominating
          isOpen={isNominateOpen}
          onClose={this.toggleNominate}
          onNominate={this.nominate}
          intentions={intentions}
        />
        <AddressSummary
          balance={this.balanceArray(accountId)}
          name={name}
          value={accountId}
          identIconSize={96}
        >
          <div className='staking--Account-expand'>
            {this.renderButtons()}
            {this.renderNominee()}
            {this.renderNominators()}
          </div>
        </AddressSummary>
      </article>
    );
  }

  private balanceArray (_address: AccountId | string): Array<Balance> | undefined {
    const { balances } = this.props;

    if (!_address) {
      return undefined;
    }

    const address = _address.toString();

    return balances[address]
      ? [balances[address].stakingBalance, balances[address].nominatedBalance]
      : undefined;
  }

  private renderNominee () {
    const { stakingNominating } = this.props;

    if (!stakingNominating) {
      return null;
    }

    return (
      <AddressMini
        balance={this.balanceArray(stakingNominating)}
        value={stakingNominating}
        withBalance
      />
    );
  }

  private renderNominators () {
    const { stakingNominatorsFor } = this.props;

    if (!stakingNominatorsFor) {
      return null;
    }

    return stakingNominatorsFor.map((nominator) => (
      <AddressMini
        key={nominator}
        value={nominator}
        withBalance
      />
    ));
  }

  private renderButtons () {
    const { accountId, intentions, stakingNominating, t } = this.props;
    const isIntending = intentions.includes(accountId);
    const isNominating = !!stakingNominating;
    const canStake = !isIntending && !isNominating;

    if (canStake) {
      return (
        <Button.Group>
          <Button
            isPrimary
            onClick={this.stake}
            text={t('account.stake', {
              defaultValue: 'stake'
            })}
          />
          <Button.Or />
          <Button
            isPrimary
            onClick={this.toggleNominate}
            text={t('account.nominate', {
              defaultValue: 'nominate'
            })}
          />
        </Button.Group>
      );
    }

    if (isNominating) {
      return (
        <Button.Group>
          <UnnominateButton
            accountId={accountId || ''}
            nominating={stakingNominating || ''}
            onClick={this.unnominate}
          />
        </Button.Group>
      );
    }

    return (
      <Button.Group>
        <Button
          isNegative
          onClick={this.unstake}
          text={t('account.unstake', {
            defaultValue: 'unstake'
          })}
        />
      </Button.Group>
    );
  }

  private send (extrinsic: Extrinsic) {
    const { accountNonce, accountId, queueExtrinsic } = this.props;

    queueExtrinsic({
      extrinsic,
      accountNonce: accountNonce || new BN(0),
      accountId
    });
  }

  private toggleNominate = () => {
    this.setState(
      ({ isNominateOpen }: State) => ({
        isNominateOpen: !isNominateOpen
      })
    );
  }

  private nominate = (nominee: string) => {
    this.send(Api.extrinsics.staking.nominate(nominee));

    this.toggleNominate();
  }

  private unnominate = (index: number) => {
    this.send(Api.extrinsics.staking.unnominate(index));
  }

  private stake = () => {
    this.send(Api.extrinsics.staking.stake());
  }

  private unstake = () => {
    const { accountId, intentions } = this.props;

    this.send(Api.extrinsics.staking.unstake(intentions.indexOf(accountId)));
  }
}

export default withMulti(
  translate(Account),
  withObservable('stakingNominatorsFor', { paramProp: 'accountId' }),
  withObservable('stakingNominating', { paramProp: 'accountId' }),
  withObservable('accountNonce', { paramProp: 'accountId' })
);