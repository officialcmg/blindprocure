import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedBlindProcure = await deploy("BlindProcure", {
    from: deployer,
    log: true,
  });

  console.log(`BlindProcure contract: `, deployedBlindProcure.address);
};
export default func;
func.id = "deploy_blind_procure"; // id required to prevent reexecution
func.tags = ["BlindProcure"];
