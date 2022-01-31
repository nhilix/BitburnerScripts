let baseHack = '/hacking/basicHack.js',
    leafHack = '/hacking/leafHack.js',
    util = '/lib/util.js';

let argSchema = [
    ['n', 0], // thread target
    ['thread-target', 0],
    ['r', 0], // GB to reserve on server
    ['reserve', 0],
    ['R', false], // reverse target order, i.e. prioritize worst servers first (useful to build hacking lvl early)
    ['reverse', false], 
    ['N', 10], // Number of servers to target
    ['number-of-targets', 10]
]

/** @param {NS} ns **/
export async function main(ns) {
    let options = ns.flags(argSchema),
        numTargets = options.N != 10 ? options.N : options['number-of-targets'],
        threadTarget = options.n != 0 ? options.n : options['thread-target'],
        reserveRam = options.r != 0 ? options.r : options['reserve'],
        reverse = options.R ? options.R : options['reverse'],
        servers = ns.getPurchasedServers();
        
    for (var i = 0; i < servers.length; i++) {
        var server = servers[i];
        // kill all scripts on that server
        ns.scriptKill(baseHack,server);
        // copy our primary hacking utilities to the new server
        await ns.scp(baseHack, server);
        await ns.scp(leafHack, server);
        await ns.scp(util, server);
        let args = ['-n', threadTarget, '-N', numTargets, '-r', reserveRam ];
        if (reverse) args.push('-R');
        // execute the leafHack.js script on the server with desired thread target
        ns.exec(leafHack, server, 1, ...args);
        // allow time for the script to execute
        await ns.sleep(1000);
    }
}