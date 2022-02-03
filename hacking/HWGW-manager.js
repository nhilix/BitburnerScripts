import { getServerTargets, getRam, disableLogs } from '/lib/util.js';

let argSchema = [
    ['r', 0], // GB to reserve on server
    ['reserve', 0],
    ['R', false], // reverse target order, i.e. prioritize worst servers first (useful to build hacking lvl early)
    ['reverse', false], 
    ['a', false], // use all servers
    ['all-servers', false],
    ['h', 20], // percent of max cash to hack each ratio
    ['hack-percent',20],
    ['p', false ], // flag if just prepping servers
    ['prep', false ], 
    ['host', 'home'], // initial host server
    ['s', ''], // target server
    ['server-target',''],
    ['d', 100], // millisecond delay between growThreads
    ['delay', 100]
]
let hack = '/hacking/hack.js',
    grow = '/hacking/grow.js',
    weaken = '/hacking/weaken.js',
    hwgwManager = '/hacking/HWGW-manager.js',
    hwgwRunner = '/hacking/HWGW-runner.js',
    wgwRunner = '/hacking/WGW-runner.js',
    util = '/lib/util.js';

/** @param {import('..').NS} ns */
export async function main(ns) {
    // Determine HGW Ratios to attempt to hover between 80% and 100% max cash
    disableLogs(ns, ['getServerMinSecurityLevel', 'getServerMaxMoney', 'getServer',
                     'getServerSecurityLevel', 'getServerMaxRam', 'getServerUsedRam',
                     'scan', 'sleep', 'exec','scp', 'getServerRequiredHackingLevel',
                     'getHackingLevel'])

    let options = ns.flags(argSchema);

    let reverse = options.R ? options.R : options['reverse'],
        reserve = options.r != 0 ? options.r : options['reserve'],
        useAll = options.a ? options.a : options['all-servers'],
        delayMs = options.d != 100 ? options.d : options['delay'],
        hackPercent = options.h != 20 ? options.h : options['hack-percent'],
        prep = options.p ? options.p : options['prep'],
        host = options['host'],
        target = options.s != '' ? options.s : options['server-target'],
        targets = target != '' ? [target] : getServerTargets(ns, reverse),
        prepPort = ns.getPortHandle(1),
        prepping = prepPort.clear(); // wipe prepping port for a clean slate

    // List of servers to use for HGWRatio
    let servers = [host];
    if (host != 'home') await ns.scp([wgwRunner, hwgwRunner, hack, grow, weaken, util], host);
    if (useAll) { // If useAll, then add all player owned servers to the list
        let pServers = ns.getPurchasedServers();
        if (pServers.length > 0) {
            for (let s of pServers) {
                if (!servers.includes(s)) servers.push(s);
                await ns.scp([wgwRunner, hwgwRunner, hack, grow, weaken, util], s);
            }
        }
        servers.sort((s1, s2) => {return (getRam(ns,s1,s1 === 'home' ? reserve : 0) - getRam(ns,s2,s2 === 'home' ? reserve : 0)) * (reverse ? -1 : 1)})
    }

    // For each target, pick the best host-server and run HWGW-runner.js targetting it
    while (targets.length > 0 && servers.length > 0) {
        let target = targets.pop(),
            host = servers.pop();
        if (prep) {
            ns.exec(wgwRunner, host, 1, '-s', target, '-r', host === 'home' ? reserve : 0, '-d', delayMs);
        } else {
            ns.exec(hwgwRunner, host, 1, '-s', target, '-r', host === 'home' ? reserve : 0, '-h', hackPercent, '-d', delayMs);
        }
    }

    await ns.sleep(500);

    while (true) {
        prepPort = ns.getPortHandle(1);
        prepping = prepPort.peek();
        if (prepping === 'NULL PORT DATA') break;
        ns.print("INFO: Waiting for prepping to finish: " + prepping);
        await ns.sleep(1000);
    }

    if (prep) {
        // respawn this same script, but without flagging prep
        let args = ['-r',reserve, '--host', host, '-d', delayMs, '-h', hackPercent];
        if (useAll) args.push('-a');
        if (reverse) args.push('-R');
        ns.spawn(hwgwManager,1,...args);
    }
}