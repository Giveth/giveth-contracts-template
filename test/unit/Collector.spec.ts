import { expect } from 'chai';
import { constants, utils, Wallet } from 'ethers';
import { createFixtureLoader, collectorFixture, CollectorFixture, provider, ActorFixture, toAddr } from '../shared';
import { LoadFixtureFunction } from '../types';

const { AddressZero } = constants;

let loadFixture: LoadFixtureFunction;

describe('unit/Collector', () => {
  let context: CollectorFixture;
  const actors = new ActorFixture(provider.getWallets(), provider);

  before('loader', async () => {
    loadFixture = createFixtureLoader(provider.getWallets(), provider);
  });

  beforeEach('create fixture loader', async () => {
    context = await loadFixture(collectorFixture);
  });

  describe('#changeBeneficiary', () => {
    let subject: (caller: Wallet, _beneficiaryAddr: Wallet | string) => Promise<any>;

    before(() => {
      subject = (caller: Wallet, _beneficiaryAddr: Wallet | string) =>
        context.collector.connect(caller).changeBeneficiary(toAddr(_beneficiaryAddr));
    });

    describe('works and', () => {
      it('changes the beneficiary address', async () => {
        await subject(actors.owner(), actors.other());
        expect(await context.collector.beneficiary()).to.be.eq(actors.other().address);
      });
    });

    describe('fails when', () => {
      it('not called by owner address', async () => {
        await expect(subject(actors.other(), actors.anyone())).to.be.reverted;
      });

      it('trying to set zero address as beneficiary', async () => {
        await expect(subject(actors.owner(), AddressZero)).to.be.revertedWith('NoAddressZero');
      });
    });
  });

  describe('#receive', () => {
    describe('works and', () => {
      const value = utils.parseEther('1');

      it('increases the contract ETH balance', async () => {
        await actors.deployer().sendTransaction({ to: context.collector.address, value });
        expect(await provider.getBalance(context.collector.address)).to.be.eq(context.initialETHBalance.add(value));
      });

      it('emits the collected event', async () => {
        await expect(actors.deployer().sendTransaction({ to: context.collector.address, value }))
          .to.emit(context.collector, 'Collected')
          .withArgs(actors.deployer().address, value);
      });
    });
  });

  describe('#withdraw', () => {
    let subject: (sender: Wallet) => Promise<any>;

    before(() => {
      subject = (sender: Wallet) => context.collector.connect(sender).withdraw();
    });

    describe('works and', () => {
      it('emits the withdrawn event', async () => {
        await expect(subject(actors.beneficiary()))
          .to.emit(context.collector, 'Withdrawn')
          .withArgs(actors.beneficiary().address, context.initialETHBalance);
      });

      it('withdraws all of the collected eth in the contract', async () => {
        await subject(actors.beneficiary());
        expect(await provider.getBalance(context.collector.address)).to.be.eq(0);
      });
    });

    describe('fails when', () => {
      it('not called by beneficiary', async () => {
        await expect(subject(actors.anyone())).to.be.revertedWith('OnlyBeneficiary');
      });
    });
  });

  describe('#withdrawTokens', () => {
    let subject: (sender: Wallet, _token: string) => Promise<any>;

    before(() => {
      subject = (sender: Wallet, _token: string) => context.collector.connect(sender).withdrawTokens(_token);
    });

    describe('works and', () => {
      it('emits the withdrawnTokens event', async () => {
        // Should withdraw all the tokens owned by the contract. This should be equal to the initial balance.
        const amount = context.initialTokenBalance;
        await expect(subject(actors.beneficiary(), context.token.address))
          .to.emit(context.collector, 'WithdrawnTokens')
          .withArgs(context.token.address, actors.beneficiary().address, amount);
      });

      it('transfers the exact amount of tokens to the beneficiary', async () => {
        await subject(actors.beneficiary(), context.token.address);
        // Token balance of the contract should be 0, while the token balance of the beneficiary should be equal to the
        // initial balance.
        const amount = context.initialTokenBalance;
        expect(await context.token.balanceOf(context.collector.address)).to.be.eq(0);
        expect(await context.token.balanceOf(actors.beneficiary().address)).to.be.eq(amount);
      });

      it('does nothing if contract has no token balance', async () => {
        await subject(actors.beneficiary(), context.zeroToken.address);
        // Balance of tokens should be unchanged.
        const amount = context.initialTokenBalance;
        expect(await context.token.balanceOf(context.collector.address)).to.be.eq(amount);
        expect(await context.token.balanceOf(actors.beneficiary().address)).to.be.eq(0);
      });
    });

    describe('fails when', () => {
      it('not called by beneficiary', async () => {
        await expect(subject(actors.anyone(), AddressZero)).to.be.revertedWith('OnlyBeneficiary');
      });

      it('token contract is not an ERC20 token', async () => {
        const tokenAddress = actors.other().address; // Random non-token address.
        await expect(subject(actors.beneficiary(), tokenAddress)).to.be.reverted;
      });
    });
  });

  describe('#beneficary', () => {
    describe('works and', () => {
      it('returns the beneficiary address', async () => {
        expect(await context.collector.beneficiary()).to.be.eq(context.beneficiary);
      });
    });
  });
});
