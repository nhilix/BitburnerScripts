/** @param {import("../.").NS} ns */
export function determineAction(ns, target, moneyThresh, securityThresh) {
    if (ns.getServerSecurityLevel(target) > securityThresh) {
        return 'weaken';
    }
    if (ns.getServerMoneyAvailable(target) < moneyThresh) {
        return 'grow';
    }
    return 'hack';
}

export function getServers(ns) {
    var servers = ['home'];
    for (var i = 0, sName; i < servers.length; i++) {
        for (sName of ns.scan(servers[i])) {
            if (!servers.includes(sName) && !sName.includes('leaf')) servers.push(sName);
        }
    }
    return servers;
}

export function getServerInfo(ns, s) {
    let server = ns.getServer(s),
        playerOwned = server.purchasedByPlayer,
        backdoored = server.backdoorInstalled,
        minSec = server.minDifficulty,
        security = server.hackDifficulty,
        maxCash = server.moneyMax,
        cash = server.moneyAvailable,
        maxRam = server.maxRam,
        usedRam = server.ramUsed,
        growthRate = server.serverGrowth; 
    if (s === 'n00dles') growthRate = 3; // n00dles is randomly 3,000; every other server is between 0-100. 
    let hackingQuotient = growthRate * (maxCash / minSec);
    return {
        minSec: minSec,
        maxCash: maxCash,
        cash: cash,
        maxRam: maxRam,
        usedRam: usedRam,
        security: security,
        growthRate: growthRate,
        quotient: hackingQuotient,
        owned: playerOwned,
        backdoor: backdoored,
    };
}

export function tryRootAccess(ns, hostName) {
    var ports = ['ssh', 'ftp', 'smtp', 'http', 'sql']
    // If we do not have root access, attempt to NUKE it to gain access
    if (!ns.hasRootAccess(hostName)) {
        // For now, we can only successfully do this on servers that require no
        // ports to run NUKE.exe
        var numPorts = ns.getServerNumPortsRequired(hostName)
        var opened = 0;
        for (var i = 0; i < numPorts; i++) {
            var port = ports[i]
            switch (port) {
                case 'ssh':
                    if (ns.fileExists('BruteSSH.exe', 'home')) {
                        ns.brutessh(hostName);
                        opened++;
                    }
                    break;
                case 'ftp':
                    if (ns.fileExists('FTPCrack.exe', 'home')) {
                        ns.ftpcrack(hostName);
                        opened++;
                    }
                    break;
                case 'smtp':
                    if (ns.fileExists('relaySMTP.exe', 'home')) {
                        ns.relaysmtp(hostName);
                        opened++;
                    }
                    break;
                case 'http':
                    if (ns.fileExists('HTTPWorm.exe', 'home')) {
                        ns.httpworm(hostName);
                        opened++;
                    }
                    break;
                case 'sql':
                    if (ns.fileExists('SQLInject.exe', 'home')) {
                        ns.sqlinject(hostName);
                        opened++;
                    }
                    break;
            };
        }
        if (opened >= numPorts) {
            ns.nuke(hostName);
        }
    };
    return ns.hasRootAccess(hostName);
}

export function canHack(ns, target) {
    var hackLvl = ns.getServerRequiredHackingLevel(target) <= ns.getHackingLevel() ? true : false;
    return hackLvl && ns.hasRootAccess(target);
}

export function currMoney(ns) {
    return ns.getServerMoneyAvailable('home');
}

export function disableLogs(ns, arr) {
    for (let l of arr) {
        ns.disableLog(l);
    }
}
export function formatNumberShort(ns, num) {
    return ns.nFormat(num, "0.00a");
}
export function formatMoney(ns, cash) {
    return ns.nFormat(cash, "$0.00a");
}
export function formatDuration(ns, time) {
    return ns.nFormat(time, '00:00:00');
}
export function formatRam(ns, ram) {
    return ns.nFormat(ram*1e9, '0.00b');
}