import { getServers, getRam, disableLogs, tryRootAccess, getServerInfo, canHack } from '/lib/util.js';

let argSchema = [
    ['r', 0], // GB to reserve on server
    ['reserve', 0],
    ['R', false], // reverse target order, i.e. prioritize worst servers first (useful to build hacking lvl early)
    ['reverse', false], 
    ['a', false], // use all servers
    ['all-servers', false],
    ['h', 20], // percent of max cash to hack each ratio
    ['hack-percent',20]
]
let hack = '/hacking/hack.js',
    grow = '/hacking/grow.js',
    weaken = '/hacking/weaken.js',
    hwgwRunner = '/hacking/HWGW-runner.js',
    util = '/lib/util.js';

/** @param {import('..').NS} ns */
export async function main(ns) {
    // Determine HGW Ratios to attempt to hover between 80% and 100% max cash
    disableLogs(ns, ['getServerMinSecurityLevel', 'getServerMaxMoney', 'getServer', 'getServerSecurityLevel', 'getServerMaxRam', 'getServerUsedRam', 'scan', 'sleep', 'exec'])

    let options = ns.flags(argSchema);

    let reverse = options.R ? options.R : options['reverse'],
        reserve = options.r ? options.r : options['reserve'],
        useAll = options.a ? options.a : options['all-servers'],
        hackPercent = options.h ? options.h : options['hack-percent'],
        targetInfo = {},
        targets = getServers(ns); // All non-player servers
    targets = targets.filter(t => tryRootAccess(ns, t)); // Only select ones we have root access
    targets = targets.filter(t => !['home', 'darkweb'].includes(t)); // filter out some servers we will never hack
    targets = targets.filter(t => ns.getServerMaxMoney(t) > 0); // filter out servers that can't have money on them
    targets = targets.filter(t => canHack(ns,t)); // filter out servers that we can't hack

    for (let t of targets) {
        targetInfo[t] = getServerInfo(ns,t); // contains a ton of relevant information packed into a nice dict format
    }
    // Sort targets by cash to security quotient
    targets.sort((t1, t2) => {
        return (targetInfo[t1].quotient - targetInfo[t2].quotient) * (reverse ? -1 : 1); // reverse option will revert sort order
    });

    // List of servers to use for HGWRatio
    let servers = ['home'];
    if (useAll) { // If useAll, then add all player owned servers to the list
        let pServers = ns.getPurchasedServers();
        if (pServers.length > 0) {
            for (let s of pServers) {
                servers.push(s);
                await ns.scp([hwgwRunner, hack, grow, weaken, util], s);
            }
        }
    }
    servers.sort((s1, s2) => {return getRam(ns,s1,s1 === 'home' ? reserve : 0) - getRam(ns,s2,s2 === 'home' ? reserve : 0)})

    // For each target, pick the best host-server and run HWGW-runner.js targetting it
    while (targets.length > 0 && servers.length > 0) {
        let target = targets.pop(),
            host = servers.pop();
        ns.exec(hwgwRunner, host, 1, '-s', target, '-r', host === 'home' ? reserve : 0, '-h', hackPercent);
    }
}