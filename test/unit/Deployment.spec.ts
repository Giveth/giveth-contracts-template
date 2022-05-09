import { collectorFixture, CollectorFixture, createFixtureLoader, expect, provider } from '../shared';
import { LoadFixtureFunction } from '../types';

let loadFixture: LoadFixtureFunction;

describe('unit/deployments', () => {
  let context: CollectorFixture;

  before('loader', async () => {
    loadFixture = createFixtureLoader(provider.getWallets(), provider);
  });

  beforeEach('create fixture loader', async () => {
    context = await loadFixture(collectorFixture);
  });

  it('deploys and has an address', async () => {
    expect(context.collector.address).to.be.a.string;
  });

  it('has correct initial state', async () => {
    expect(await context.collector.owner()).eq(context.owner);
    expect(await provider.getBalance(context.collector.address)).to.be.eq(context.initialETHBalance);
    expect(await context.token.balanceOf(context.collector.address)).to.be.eq(context.initialTokenBalance);
  });
});
