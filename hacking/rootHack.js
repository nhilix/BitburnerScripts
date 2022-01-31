import { canHack, tryRootAccess } from "/lib/util.js";

let processedHosts = ['home'],
    baseHack = '/hacking/basicHack.js',
    util = '/lib/util.js',
    backdoor = '/lib/backdoor.js',
    connect = '/lib/connect.js';

let argSchema = [
    ['b',false], // backdoor only
    ['backdoor-only', false],
]

/** @param {NS} ns **/
export async function main(ns) {
    let options = ns.flags(argSchema);
    processedHosts = ['home'];
    // Determine initial list of connections from home
    var hostArray = ns.scan("home");
    ns.tprint("Starting on hostArray:" + hostArray);
    await mainHack(ns, hostArray, options);
}

/** @param {NS} ns **/
export async function mainHack(ns, hostArray, options) {
    // While there are connections left to process
    while (hostArray.length > 0) {
        // Look at the latest connection
        var hostName = hostArray.pop()
        // Connection loop needs to be broken
        if (processedHosts.includes(hostName)) { continue; }
        // Skip purchased servers
        if (ns.getPurchasedServers().includes(hostName)) { continue; }
        // Try to gain root access, if we can't move to the next
        if (tryRootAccess(ns,hostName)) { 
            if (canHack(ns, hostName)) {
                let server = ns.getServer(hostName);
                // Determine the number of threads we can spawn to max RAM usage
                var ram = ns.getServerMaxRam(hostName) - ns.getServerUsedRam(hostName);
                var threads = Math.floor(ram / ns.getScriptRam(baseHack));
    
                // Load the script onto the hostName so it may be launched locally
                await ns.scp(baseHack, hostName);
                await ns.scp(util, hostName);
                // If we have not backdoored the server, try to
                if (!server.backdoorInstalled){
                    if (!(hostName === 'w0rld_d34m0n')) {
                        ns.run(connect,1,hostName); // run connect.js to connect to the server
                        let pid = ns.run(backdoor, 1, hostName); // initiate the backdoor process
                        if (pid === 0) ns.print("Couldn't initiate backdoor on "+hostName+" (insufficient RAM?).  Will try again later"); 
                        await ns.sleep(50); // give a few milliseconds for backdoor process to start
                        ns.connect('home');
                    } else {
                        // We might not want to backdoor w0rld d43m0n immediately, but let player know its ready
                        ns.toast(hostName+" ready to backdoor!",'success',5000);
                    }
                } 
                if (threads > 0 && !(options.b || options['backdoor-only'])) { // Run our basicHack.js on the server, unless we only want backdoors
                    ns.exec(baseHack, hostName, threads, hostName);
                }
    
            }
        }

        // Mark hostName as processed
        processedHosts.push(hostName);
        // Added to the list of hosts to process all sub-hosts of hostName
        var newHostArray = ns.scan(hostName);
        await mainHack(ns, newHostArray, options);

    };

}