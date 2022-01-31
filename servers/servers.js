import { currMoney } from "/lib/util.js";

let baseHack = '/hacking/basicHack.js',
    leafHack = '/hacking/leafHack.js',
    util = '/lib/util.js';

/** @param {NS} ns **/
export async function main(ns) {
    var initialMoney = ns.getServerMoneyAvailable('home');
    var maxRam = 2; //GB
    var ramPort = ns.getPortHandle(1);
    //var maxRam = ns.getPurchasedServerMaxRam() / 256;
    var cost = ns.getPurchasedServerCost(maxRam);
    while(cost < (initialMoney/2)){
        maxRam = maxRam * 2;
        cost = ns.getPurchasedServerCost(maxRam);
        if (maxRam > Math.pow(2, 20)) { break; }
    }
    ns.tprint("Upgrading all servers to " + ns.nFormat(maxRam * 1e9,'0.00b') + " @ " + ns.nFormat(cost, '$0.00a'));
    var sRam = ns.getScriptRam(baseHack);
    var sTotal = Math.floor(maxRam / (sRam * 10)); // enough for 10 servers to be targetted
    var server = 'leaf';
    ramPort.write(maxRam);

    while (true) {
        if (cost < currMoney(ns)) {
            // find the first purchased server with less ram than our upgrade target
            var oldServer = ns.getPurchasedServers().find(s => ns.getServerMaxRam(s) < maxRam);
            // if we don't have full 25 purchased server, just buy another
            if (ns.getPurchasedServers().length < 25) {
                await buyServer(ns, server, maxRam, sTotal);
                // otherwise, if we found an upgradable server
            } else if (oldServer) {
                // kill all scripts on that server then delete it
                ns.killall(oldServer);
                ns.deleteServer(oldServer);
                // then buy a new server with the original's name
                await buyServer(ns, oldServer, maxRam, sTotal);
            } else {
                // If all servers have been upgraded, jump to the next server size (power of 2)
                // updating the maxRam and associated cost for a server of this size
                // as well as the target number of threads to run with leafHack.js
                maxRam = maxRam * 2;
                ramPort.write(maxRam);
                cost = ns.getPurchasedServerCost(maxRam);
                sTotal = sTotal * 2;
                ns.tprint("Upgrading all servers to " + ns.nFormat(maxRam * 1e9,'0.00b') + " @ " + ns.nFormat(cost, '$0.00a'));
                await ns.sleep(1000);
            }
        } else {
            await ns.sleep(10000);
        }
        if (maxRam > Math.pow(2, 20)) { return; }
    }
}

/** @param {NS} ns **/
async function buyServer(ns, server, maxRam, sTotal) {
    // buy a new server with the upgraded max ram target
    var newServer = ns.purchaseServer(server, maxRam);
    // copy our primary hacking utilities to the new server and execute leafHack.js
    if (newServer) {
        await ns.scp(baseHack, newServer);
        await ns.scp(leafHack, newServer);
        await ns.scp(util, newServer);

        ns.exec(leafHack, newServer, 1, '-n', sTotal);
    }
}