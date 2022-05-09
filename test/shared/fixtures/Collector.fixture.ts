import { Fixture } from 'ethereum-waffle';
import { BigNumber, utils } from 'ethers';
import { waffle } from 'hardhat';
import { Collector, Collector__factory, IERC20Minimal, TestERC20__factory } from '../../../typechain-types';
import { ActorFixture } from '../actors';
import { provider } from '../provider';

const { parseEther } = utils;

export type CollectorFixture = {
  collector: Collector;
  owner: string;
  beneficiary: string;
  initialETHBalance: BigNumber;
  token: IERC20Minimal;
  zeroToken: IERC20Minimal;
  initialTokenBalance: BigNumber;
};

export const collectorFixture: Fixture<CollectorFixture> = async ([wallet]) => {
  const actors = new ActorFixture(provider.getWallets(), provider);
  const initialETHBalance = parseEther('10');
  const initialTokenBalance = parseEther('1000');
  const owner = actors.owner().address;
  const beneficiary = actors.beneficiary().address;

  // Create the collector contract:
  const collector = (await waffle.deployContract(
    wallet,
    {
      abi: Collector__factory.abi,
      bytecode: Collector__factory.bytecode,
    },
    [beneficiary]
  )) as Collector;

  // Create the test token to withdraw:
  const token = (await waffle.deployContract(
    wallet,
    { abi: TestERC20__factory.abi, bytecode: TestERC20__factory.bytecode },
    [parseEther('10000000000')]
  )) as IERC20Minimal;

  const zeroToken = (await waffle.deployContract(
    wallet,
    { abi: TestERC20__factory.abi, bytecode: TestERC20__factory.bytecode },
    [parseEther('10000000000')]
  )) as IERC20Minimal;

  // Transfer some ETH to the contract:
  await actors.deployer().sendTransaction({ to: collector.address, value: initialETHBalance });

  // Transfer some tokens directly to the contract:
  await token.transfer(collector.address, initialTokenBalance);

  return {
    collector,
    owner,
    beneficiary,
    initialETHBalance,
    token,
    zeroToken,
    initialTokenBalance,
  };
};
