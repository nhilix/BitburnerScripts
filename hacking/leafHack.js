import { canHack, tryRootAccess, getServerInfo } from "/lib/util.js";

let processedHosts = ['home', 'HacknetHost'],
    targetServers = [],
    baseHack = '/hacking/basicHack.js';

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
    let whereAmI = ns.getHostname(),
        options = ns.flags(argSchema),
        numTargets = options.N != 10 ? options.N : options['number-of-targets'],
        threadTarget = options.n != 0 ? options.n : options['thread-target'],
        reverse = options.R ? options.R : options['reverse'],
        reserveRam = options.r != 0 ? options.r : options['reserve'];
    ns.scriptKill(baseHack, whereAmI);
    processedHosts = ['home'];
    targetServers = [];
    let targetInfo = {};
    // Determine initial list of connections from home
    var hostArray = ns.scan("home");
    await mainHack(ns, hostArray);
    // Determine our max ram for running scripts on home server
    var ram = ns.getServerMaxRam(whereAmI) - ns.getServerUsedRam(whereAmI) - reserveRam;
    // Determine how many threads of baseHack home server can support in total
    var threads = Math.floor(ram / ns.getScriptRam(baseHack));
    if (threadTarget === 0) {
        threadTarget = Math.floor(threads / numTargets); // enough for 10 servers to be targetted
    }

    for (let t of targetServers) {
        targetInfo[t] = getServerInfo(ns, t);
    }
    // Sort targets by cash to security quotient
    targetServers.sort((t1, t2) => {
        return (targetInfo[t1].quotient - targetInfo[t2].quotient) * (reverse ? -1 : 1); // reverse option will revert sort order
    });
    // Starting with the server with the highest max money, start running scripts utilizing threadTarget chunks
    while (threads > 0 && targetServers.length > 0) {
        var server = targetServers.pop();
        var currThreads = Math.min(threadTarget, threads);

        ns.tprint("Starting " + baseHack + " on " + server + " with " + currThreads + " threads");
        ns.exec(baseHack, whereAmI, currThreads, server);
        threads -= currThreads;
    }
}

export async function mainHack(ns, hostArray) {
    // While there are connections left to process
    while (hostArray.length > 0) {
        // Look at the latest connection
        var hostName = hostArray.pop();
        // Connection loop needs to be broken
        if (processedHosts.includes(hostName)) { continue; }
        // Skip purchased servers
        if (ns.getPurchasedServers().includes(hostName)) { continue; }
        // Try to gain root access, if we can't move to the next
        if (!tryRootAccess(ns, hostName)) { continue; }

        if (canHack(ns, hostName)) {
            // Add this server to the list of targets
            targetServers.push(hostName);
        };

        // Mark hostName as processed
        processedHosts.push(hostName);
        // Added to the list of hosts to process all sub-hosts of hostName
        var newHostArray = ns.scan(hostName);
        await mainHack(ns, newHostArray);

    };
}