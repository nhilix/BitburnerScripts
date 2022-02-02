import { currMoney, formatMoney, formatRam, disableLogs } from "/lib/util.js";

let baseHack = '/hacking/basicHack.js',
    leafHack = '/hacking/leafHack.js',
    util = '/lib/util.js';
let argSchema = [
    ['--tail',false], // Open up tail window on execute
]

/** @param {import("../.").NS} ns */
export async function main(ns) {
    let options = ns.flags(argSchema);
    if (options['tail']) ns.tail();
    disableLogs(ns,['sleep','scp','getServerMoneyAvailable','getServerMaxRam','exec']);
    let upgrade = getNextUpgrade(ns,32), 
        leafTargets = 10,
        server = 'leaf';

    while (true) {
        if (upgrade.cost < currMoney(ns)) {
            // Recompute the next upgrade based on available cash
            upgrade = getNextUpgrade(ns,upgrade.maxRam);

            // Find the first purchased server with less ram than our upgrade target
            var oldServer = ns.getPurchasedServers().find(s => ns.getServerMaxRam(s) < upgrade.maxRam);
            // If we don't have full 25 purchased server, just buy another
            if (ns.getPurchasedServers().length < 25) {
                await buyServer(ns, server, upgrade.maxRam, leafTargets);
            // Otherwise, if we found an upgradable server
            } else if (oldServer) {
                // Kill all scripts on that server then delete it
                ns.killall(oldServer);
                ns.deleteServer(oldServer);
                // Then buy a new server with the original's name
                await buyServer(ns, oldServer, upgrade.maxRam, leafTargets);
            }
        }
        await ns.sleep(10000);
        if (upgrade.maxRam > Math.pow(2, 20)) { return; }
    }
}

/** @param {import("../.").NS} ns */
function getNextUpgrade(ns, maxRam) {
    let prevMaxRam = maxRam,
        cash = currMoney(ns),
        cost = ns.getPurchasedServerCost(maxRam);
    while (cost < (cash/2)) {
        maxRam = maxRam * 2;
        cost = ns.getPurchasedServerCost(maxRam);
        if (maxRam > Math.pow(2, 20)) { 
            maxRam = Math.pow(2, 20); 
            cost = ns.getPurchasedServerCost(maxRam);
            break;
        }
    }
    if (prevMaxRam != maxRam) {
        ns.print("Leafs -> " + formatRam(ns,maxRam) + " @ " + formatMoney(ns,cost));
    }
    return {cost: cost, maxRam: maxRam}
}

/** @param {import("../.").NS} ns */
async function buyServer(ns, server, maxRam, leafTargets) {
    // buy a new server with the upgraded max ram target
    var newServer = ns.purchaseServer(server, maxRam);
    // copy our primary hacking utilities to the new server and execute leafHack.js
    if (newServer) {
        await ns.scp(baseHack, newServer);
        await ns.scp(leafHack, newServer);
        await ns.scp(util, newServer);

        ns.exec(leafHack, newServer, 1, '-N', leafTargets);
    }
}