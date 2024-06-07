"use strict";

// Import required libraries
const CoinKey = require('coinkey'); // For generating Bitcoin key pairs
const axios = require('axios'); // For making HTTP requests
const fs = require('fs'); // For file operations

// Constants
const SATOSHIS_PER_BTC = 1e8; // Number of Satoshis in 1 BTC
const BLOCKCHAIN_API_URL = "https://blockchain.info/address/{}?format=json"; // Blockchain API URL for fetching address info
const RICHES_FILE_PATH = './riches.txt'; // Path to the file containing rich addresses
const LIST_ADDRESSES_FILE_PATH = './list-addresses.txt'; // Path to the file for storing generated addresses
const BALANCE_FILE_PATH = './addresses-with-balance.txt'; // Path to the file for writing balances

let isPaused = false; // Flag to track whether the program is paused
let isRunning = true; // Flag to track whether the program is running

// Function to generate random hex string
function generateRandomHexString(length) {
    const randomChars = 'ABCDEF0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
}

// Function to fetch balance from a given Bitcoin address
async function fetchBalance(address) {
    try {
        const response = await axios.get(BLOCKCHAIN_API_URL.replace('{}', address), { timeout: 10000 });
        const { total_received, final_balance } = response.data;
        return { totalReceived: total_received, finalBalance: final_balance };
    } catch (error) {
        console.error(`Error fetching balance for address ${address}: ${error}`);
        return { totalReceived: 0, finalBalance: 0 };
    }
}

// Function to check balance of a given address
async function checkBalance(address) {
    try {
        const truncatedAddress = address.substring(0, 34);
        const { totalReceived, finalBalance } = await fetchBalance(truncatedAddress);
        console.log(`\nBitcoin Address: ${truncatedAddress}`);
        console.log(`Total Received: ${totalReceived / SATOSHIS_PER_BTC} BTC`);
        console.log(`Final Balance: ${finalBalance / SATOSHIS_PER_BTC} BTC`);
        if (finalBalance > 0.0) {
            writeBalanceToFile(truncatedAddress, finalBalance);
        }
    } catch (error) {
        console.error(`Error checking balance for address ${address}: ${error}`);
    }
}

// Function to write address and balance to a file
function writeBalanceToFile(address, balance) {
    const formattedBalance = balance / SATOSHIS_PER_BTC;
    const data = `Bitcoin Address: ${address}\t Balance: ${formattedBalance} BTC\n`;
    fs.appendFile(BALANCE_FILE_PATH, data, (error) => {
        if (error) {
            console.error(`Error writing to file: ${error}`);
        }
    });
}

// Function to generate a new Bitcoin wallet
function generateWallet() {
    // Generate random private key hex
    const privateKeyHex = generateRandomHexString(64);
    // Create new bitcoin key pair
    const ck = new CoinKey(Buffer.from(privateKeyHex, 'hex'));
    ck.compressed = false;
    return { publicKey: ck.publicAddress, privateKey: ck.privateWif };
}

// Function to pause the program
function pauseProgram() {
    console.log("\x1b[33m%s\x1b[0m", ">> Paused");
    isPaused = true;
}

// Function to resume the program
function resumeProgram() {
    console.log("\x1b[32m%s\x1b[0m", ">> Resumed");
    isPaused = false;
}

// Function to handle keyboard input
function handleInput(input) {
    switch (input) {
        case 'p':
            if (!isPaused) {
                pauseProgram();
            }
            break;
        case 'r':
            if (isPaused) {
                resumeProgram();
            }
            break;
        case 'q':
            console.log("\x1b[31m%s\x1b[0m", ">> Quitting...");
            isRunning = false;
            break;
        default:
            break;
    }
    printInstructions();
}

// Function to print instructions
function printInstructions() {
    console.log("\n\x1b[36m%s\x1b[0m", "Keyboard Commands:");
    console.log("\x1b[36m%s\x1b[0m", "p: Pause");
    console.log("\x1b[36m%s\x1b[0m", "r: Resume");
    console.log("\x1b[36m%s\x1b[0m", "q: Quit");
}

// Main function
async function main() {
    try {
        console.log("\x1b[32m%s\x1b[0m", ">> Sachdevakunal7"); // Log startup message

        const addresses = new Set(fs.readFileSync(RICHES_FILE_PATH, 'utf-8').split("\n"));

        // Print initial instructions
        printInstructions();

        // Listen for keyboard input
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', function (key) {
            handleInput(key.trim());
        });

        while (isRunning) {
            if (!isPaused) {
                // Generate new wallet
                const wallet = generateWallet();
                const { publicKey, privateKey } = wallet;
                
                console.log("\x1b[32m%s\x1b[0m", ">> Sachdevakunal7 >> P - Pause, R - Resume, Q - Quit"); // Log startup message

                // Log the public address and private key (seed)
                const output = `${publicKey} : ${privateKey}`;
                console.log(output);

                // Save the output to list-addresses.txt
                fs.appendFileSync(LIST_ADDRESSES_FILE_PATH, output + '\n');

                // Check if generated wallet matches any from the riches.txt file
                if (addresses.has(publicKey)) {
                    console.log("");
                    process.stdout.write('\x07'); // Beep sound
                    console.log("\x1b[32m%s\x1b[0m", ">> Success: " + publicKey);
                    const successString = "Wallet: " + publicKey + "\n\nSeed: " + privateKey;

                    // Save the wallet and its private key (seed) to a Success.txt file
                    fs.writeFileSync('./Success.txt', successString);

                    // Exit program after success
                    process.exit();
                }

                await checkBalance(publicKey); // Check balance for generated address

                if (process.memoryUsage().heapUsed / 1000000 > 500) {
                    global.gc(); // Perform garbage collection if memory usage exceeds 500MB
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 0.5 seconds before generating next address
        }
        console.log("\x1b[31m%s\x1b[0m", ">> Program has been quit.");
    } catch (error) {
        console.error(`Error occurred: ${error}`);
    }
}

// Entry point of the script
main();
