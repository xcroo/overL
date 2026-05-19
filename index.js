require("dotenv").config();
const { ethers } = require("ethers");
const readline = require("readline");

// =========================
// PROVIDER
// =========================

const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL
);

const wallet = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  provider
);

// =========================
// CONFIG
// =========================

const TOTAL_TX = 41;

const DELAY_MIN = 50000;
const DELAY_MAX = 70000;

let MIN_TOKEN = 10;
let MAX_TOKEN = 100;

let TX_COUNT = 1;

let SELECTED_ASSET = "USDT";

// =========================
// CONTRACT
// =========================

// T+
const TPLUS =
  "0xe20534a32f9162488a90026F268a74fBE28d272D";

// C+
const USDC_PLUS =
  "0xE815718D44694ec4637CB775C468d87f6e15B538";

// STAKE T+
const STAKE_CONTRACT_TPLUS =
  "0x079a4Bf1Cbd0E4ce15391340cB46efA6396aBc82";

// STAKE C+
const STAKE_CONTRACT_CPLUS =
  "0x753937137Eb92871A6F3517514d4f1Ee860e3FDF";

// USDT
const USDT =
  "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";

// USDC
const USDC =
  "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";

// =========================
// ABI
// =========================

const erc20ABI = [

  "function approve(address spender,uint256 amount) returns (bool)",

  "function balanceOf(address owner) view returns (uint256)",

  "function decimals() view returns (uint8)",

  "function symbol() view returns (string)"

];

const bridgeABI = [

  "function send(tuple(uint32 dstEid,bytes32 to,uint256 amountLD,uint256 minAmountLD,bytes extraOptions,bytes composeMsg,bytes oftCmd) _sendParam, tuple(uint256 nativeFee,uint256 lzTokenFee) _fee, address _refundAddress) payable"

];

// =========================
// CONTRACT INSTANCE
// =========================

const usdtContract = new ethers.Contract(
  USDT,
  erc20ABI,
  wallet
);

const usdcContract = new ethers.Contract(
  USDC,
  erc20ABI,
  wallet
);

const tPlusContract = new ethers.Contract(
  TPLUS,
  erc20ABI,
  wallet
);

const usdcPlusContract = new ethers.Contract(
  USDC_PLUS,
  erc20ABI,
  wallet
);

// =========================
// READLINE
// =========================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {

  return new Promise((resolve) => {

    rl.question(question, resolve);

  });

}

// =========================
// UTIL
// =========================

function sleep(ms) {

  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

}

function randomDelay() {

  return Math.floor(

    Math.random() *
      (DELAY_MAX - DELAY_MIN + 1) +

      DELAY_MIN

  );

}

function randomNumber(min, max) {

  return Math.floor(

    Math.random() *
      (max - min + 1) +

      min

  );

}

function randomAsset() {

  const rand =
    Math.floor(Math.random() * 2);

  if (rand === 0) {

    SELECTED_ASSET = "USDT";

  } else {

    SELECTED_ASSET = "USDC";

  }

}

function getAssetConfig() {

  if (SELECTED_ASSET === "USDC") {

    return {

      baseToken: USDC,

      wrappedToken: USDC_PLUS,

      stakeContract:
        STAKE_CONTRACT_CPLUS,

      symbol: "USDC",

      wrappedSymbol: "C+"

    };

  }

  return {

    baseToken: USDT,

    wrappedToken: TPLUS,

    stakeContract:
      STAKE_CONTRACT_TPLUS,

    symbol: "USDT",

    wrappedSymbol: "T+"

  };

}

// =========================
// SHOW BALANCE
// =========================

async function showBalances() {

  try {

    const ethBalance =
      await provider.getBalance(
        wallet.address
      );

    const usdtBalance =
      await usdtContract.balanceOf(
        wallet.address
      );

    const usdcBalance =
      await usdcContract.balanceOf(
        wallet.address
      );

    const tplusBalance =
      await tPlusContract.balanceOf(
        wallet.address
      );

    const usdcPlusBalance =
      await usdcPlusContract.balanceOf(
        wallet.address
      );

    console.log("\n========================");
    console.log("BALANCE");
    console.log("========================");

    console.log(
      "ETH:",
      ethers.formatEther(
        ethBalance
      )
    );

    console.log(
      "USDT:",
      Number(usdtBalance) / 1e6
    );

    console.log(
      "USDC:",
      Number(usdcBalance) / 1e6
    );

    console.log(
      "T+:",
      ethers.formatEther(
        tplusBalance
      )
    );

    console.log(
      "C+:",
      ethers.formatEther(
        usdcPlusBalance
      )
    );

    console.log("========================\n");

  } catch (err) {

    console.log(
      "Balance Error:",
      err.message
    );

  }
}

// =========================
// MINT
// =========================

async function doMint() {

  try {

    const asset =
      getAssetConfig();

    const tokenContract =
      new ethers.Contract(
        asset.baseToken,
        erc20ABI,
        wallet
      );

    const amount =
      randomNumber(
        MIN_TOKEN,
        MAX_TOKEN
      );

    const collateralAmount =
      BigInt(amount) *
      BigInt(1e6);

    const wrapAmount =
      BigInt(amount) *
      BigInt("1000000000000000000");

    console.log("\n====================");
    console.log("MINT");

    console.log(
      `${asset.symbol} Amount:`,
      amount
    );

    // approve
    const approveTx =
      await tokenContract.approve(
        asset.wrappedToken,
        collateralAmount
      );

    console.log(
      "Approve TX:",
      approveTx.hash
    );

    await approveTx.wait();

    console.log(
      "Approve Success"
    );

    // mint
    const iface =
      new ethers.Interface([
        "function mint((address,address,address,uint256,uint256))"
      ]);

    const data =
      iface.encodeFunctionData(
        "mint",
        [[
          wallet.address,
          wallet.address,
          asset.baseToken,
          collateralAmount,
          wrapAmount
        ]]
      );

    const tx =
      await wallet.sendTransaction({

        to: asset.wrappedToken,

        data,

        gasLimit: 300000

      });

    console.log(
      "Mint TX:",
      tx.hash
    );

    const receipt =
      await tx.wait();

    if (receipt.status === 1) {

      console.log(
        "Mint Success"
      );

    } else {

      console.log(
        "Mint Failed"
      );

    }

  } catch (err) {

    console.log(
      "Mint Error:",
      err.shortMessage ||
      err.message
    );

  }
}

// =========================
// BRIDGE
// =========================

async function doBridge() {

  try {

    const asset =
      getAssetConfig();

    const wrappedContract =
      new ethers.Contract(
        asset.wrappedToken,
        erc20ABI,
        wallet
      );

    const amount =
      randomNumber(
        MIN_TOKEN,
        MAX_TOKEN
      );

    const amountWei =
      BigInt(amount) *
      BigInt("1000000000000000000");

    console.log("\n====================");
    console.log("BRIDGE");

    console.log(
      `${asset.wrappedSymbol} Amount:`,
      amount
    );

    // approve
    const approveTx =
      await wrappedContract.approve(
        asset.wrappedToken,
        amountWei
      );

    console.log(
      "Approve TX:",
      approveTx.hash
    );

    await approveTx.wait();

    console.log(
      "Approve Success"
    );

    const bridgeContract =
      new ethers.Contract(
        asset.wrappedToken,
        bridgeABI,
        wallet
      );

    const sendParam = {

      dstEid: 40245,

      to: ethers.zeroPadValue(
        wallet.address,
        32
      ),

      amountLD: amountWei,

      minAmountLD: amountWei,

      extraOptions: "0x",

      composeMsg: "0x",

      oftCmd: "0x"

    };

    const fee = {

      nativeFee:
        ethers.parseEther("0.0003"),

      lzTokenFee: 0

    };

    const tx =
      await bridgeContract.send(

        sendParam,

        fee,

        wallet.address,

        {
          value: fee.nativeFee,
          gasLimit: 800000
        }

      );

    console.log(
      "Bridge TX:",
      tx.hash
    );

    const receipt =
      await tx.wait();

    if (receipt.status === 1) {

      console.log(
        "Bridge Success"
      );

    } else {

      console.log(
        "Bridge Failed"
      );

    }

  } catch (err) {

    console.log(
      "Bridge Error:",
      err.shortMessage ||
      err.message
    );

  }
}

// =========================
// STAKE
// =========================

async function doStake() {

  try {

    const asset =
      getAssetConfig();

    const wrappedContract =
      new ethers.Contract(
        asset.wrappedToken,
        erc20ABI,
        wallet
      );

    const balance =
      await wrappedContract.balanceOf(
        wallet.address
      );

    if (balance <= 0) {

      console.log(
        `${asset.wrappedSymbol} balance kosong`
      );

      return;
    }

    // random nominal
    const amount =
      randomNumber(
        MIN_TOKEN,
        MAX_TOKEN
      );

    const amountWei =
      BigInt(amount) *
      BigInt("1000000000000000000");

    // cek balance cukup
    if (amountWei > balance) {

      console.log(
        `Balance ${asset.wrappedSymbol} tidak cukup`
      );

      return;
    }

    console.log("\n====================");
    console.log("STAKE / DEPOSIT");

    console.log(
      `${asset.wrappedSymbol} Amount:`,
      amount
    );

    // approve
    const approveTx =
      await wrappedContract.approve(
        asset.stakeContract,
        amountWei
      );

    console.log(
      "Approve TX:",
      approveTx.hash
    );

    await approveTx.wait();

    console.log(
      "Approve Success"
    );

    // deposit
    const iface =
      new ethers.Interface([
        "function deposit(uint256 assets,address owner) returns (uint256)"
      ]);

    const data =
      iface.encodeFunctionData(
        "deposit",
        [
          amountWei,
          wallet.address
        ]
      );

    const tx =
      await wallet.sendTransaction({

        to: asset.stakeContract,

        data,

        gasLimit: 500000

      });

    console.log(
      "Stake TX:",
      tx.hash
    );

    const receipt =
      await tx.wait();

    if (receipt.status === 1) {

      console.log(
        "Stake Success"
      );

    } else {

      console.log(
        "Stake Failed"
      );

    }

  } catch (err) {

    console.log(
      "Stake Error:",
      err.shortMessage ||
      err.message
    );

  }
}

// =========================
// ALL TX
// =========================

async function runAllTransactions() {

  const tasks = [];

  for (let i = 0; i < 14; i++) {
    tasks.push("mint");
  }

  for (let i = 0; i < 14; i++) {
    tasks.push("stake");
  }

  for (let i = 0; i < 13; i++) {
    tasks.push("bridge");
  }

  tasks.sort(() => Math.random() - 0.5);

  for (let i = 0; i < tasks.length; i++) {

    randomAsset();

    console.log(
      `\n######## TX ${
        i + 1
      }/${TOTAL_TX} ########`
    );

    console.log(
      `Asset: ${SELECTED_ASSET}`
    );

    const type = tasks[i];

    if (type === "mint") {

      await doMint();

    }

    else if (type === "stake") {

      await doStake();

    }

    else if (type === "bridge") {

      await doBridge();

    }

    const delay =
      randomDelay();

    console.log(
      `\nDelay ${
        delay / 1000
      }s`
    );

    await sleep(delay);
  }
}

// =========================
// MAIN
// =========================

async function main() {

  console.log("\n========================");
  console.log("OVERLAYER AUTO TX BOT");
  console.log("Wallet:", wallet.address);
  console.log("========================");

  await showBalances();

  console.log("\nPilih Asset");
  console.log("1. USDT / T+");
  console.log("2. USDC / C+\n");

  const assetChoice =
    await ask("Asset: ");

  if (assetChoice === "2") {

    SELECTED_ASSET = "USDC";

  } else {

    SELECTED_ASSET = "USDT";

  }

  console.log(
    `\nSelected Asset: ${SELECTED_ASSET}`
  );

  console.log("\n1. Mint");
  console.log("2. Bridge");
  console.log("3. Stake");
  console.log("4. All Transaksi\n");

  const choice =
    await ask("Pilih menu: ");

  if (
    choice === "1" ||
    choice === "2" ||
    choice === "3" ||
    choice === "4"
  ) {

    const minInput =
      await ask(
        "Min token random: "
      );

    const maxInput =
      await ask(
        "Max token random: "
      );

    const txInput =
      await ask(
        "Jumlah Tx : "
      );

    MIN_TOKEN =
      parseInt(minInput);

    MAX_TOKEN =
      parseInt(maxInput);

    TX_COUNT =
      parseInt(txInput);

    console.log(
      `\nRandom token: ${MIN_TOKEN} - ${MAX_TOKEN}`
    );

  }

  if (choice === "1") {

    for (let i = 0; i < TX_COUNT; i++) {

      console.log(
        `\n######## MINT ${
          i + 1
        }/${TX_COUNT} ########`
      );

      await doMint();

      if (i !== TX_COUNT - 1) {

        const delay =
          randomDelay();

        console.log(
          `\nDelay ${
            delay / 1000
          }s`
        );

        await sleep(delay);

      }
    }

  }

  else if (choice === "2") {

    for (let i = 0; i < TX_COUNT; i++) {

      console.log(
        `\n######## BRIDGE ${
          i + 1
        }/${TX_COUNT} ########`
      );

      await doBridge();

      if (i !== TX_COUNT - 1) {

        const delay =
          randomDelay();

        console.log(
          `\nDelay ${
            delay / 1000
          }s`
        );

        await sleep(delay);

      }
    }

  }

  else if (choice === "3") {

    for (let i = 0; i < TX_COUNT; i++) {

      console.log(
        `\n######## STAKE ${
          i + 1
        }/${TX_COUNT} ########`
      );

      await doStake();

      if (i !== TX_COUNT - 1) {

        const delay =
          randomDelay();

        console.log(
          `\nDelay ${
            delay / 1000
          }s`
        );

        await sleep(delay);

      }
    }

  }

  else if (choice === "4") {

    await runAllTransactions();

  }

  else {

    console.log(
      "Pilihan tidak valid"
    );

  }

  rl.close();
}

main().catch(console.error);