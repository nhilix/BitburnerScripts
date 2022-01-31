let contract = '/lib/contract.js';

/** @param {NS} ns **/
export async function main(ns) {
    while (true) {
        // Simply, attempt to solve any contracts that are present on any servers, once a minute
        ns.run(contract, 1, '-s', '-f');
        await ns.sleep(60000);
    }
}