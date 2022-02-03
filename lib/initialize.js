import { disableLogs } from '/lib/util.js';

const root = '/hacking/root-runner.js',
    rootHack = '/hacking/root.js',
    wgwRunner = '/hacking/wgwRunner.js',
    hwgwManager = '/hacking/HWGW-manager.js',
    hud = '/hud/hud.js',
    tor = '/lib/purchase-tor.js',
    cscan = '/lib/contract-scanner.js',
    servers = '/servers/servers.js',
    stocks = '/stocks/stocks.js';

let darkweb = [
    { name: "BruteSSH.exe", cost: 500e3 },
    { name: "DeepscanV1.exe", cost: 500e3 },
    { name: "FTPCrack.exe", cost: 1500e3 },
    { name: "relaySMTP.exe", cost: 5e6 },
    { name: "HTTPWorm.exe", cost: 30e6 },
    { name: "DeepscanV2.exe", cost: 25e6 },
    { name: "SQLInject.exe", cost: 250e6 }
];

/** @param {import("../.").NS} ns **/
export async function main(ns) {
    /*
    * Repetitive first steps after aug reset:
    *   Run CSCAN <--- Most Important for early in BitNode to farm contract money
    *   If CashRoot, else wait for $200k
    *       Purchase TOR Router
    *   If Home RAM >32GB
    *       Launch HUD.js
    *       Run root.js (every 5min rootHack.js to blast servers open and backdoor)
    *       Run leafHack.js, keeping 24GB ram reserved for CSCAN to trigger
    *   While earning from CSCAN:
    *       Upgrade Home Server to ~512GB (On new BitNode)
    *       Buy programs from darkweb (get all port scripts) 312.5mil
            Run rootHack.js to blast new servers with new ports
    *       Rerun leafHack.js with new size and ports
    *           Run every 30min to utilize gained hacking XP
    *   Run factions.js to join a faction and start rep grind  
    */
    disableLogs(ns, ['sleep','getServerMaxRam','getServerMoneyAvailable','getHackingLevel'])
    ns.tail();
    let ram = ns.getServerMaxRam('home'),
        autoLinkStarted = false,
        serverProfilerStarted = false;
    if (ns.fileExists("AutoLink.exe", 'home')) autoLinkStarted = true;
    if (ns.fileExists("ServerProfiler.exe", 'home')) serverProfilerStarted = true;

    ns.print("CSCAN-Exclusive period beginning. WARNING: Joining factions/jobs before complete will be detremental to progress.")
    // Run CSCAN to farm contract money early
    ns.run(cscan);
    let freeRam = ram - ns.getServerUsedRam('home');
    // If we don't have 24GB of ram left (the cost of the contract solver) then we have to kill this script to earn any money
    if (freeRam < 24) return;

    // Spawn TOR purchase script (small, but keeps ram out of this init script)
    ns.run(tor);

    // If there is room for HUD.js, spawn it.  Non-critical, but QoL I don't want to go without
    if ((freeRam - ns.getScriptRam(hud)) > 24) ns.run(hud);

    // If room for root.js start blastin open servers
    if ((freeRam - ns.getScriptRam(root)) > 24) ns.run(root);

    // If there is room for HWGW-runner and manager, lets get started prepping servers
    if (freeRam - ns.getScriptRam(wgwRunner) - ns.getScriptRam(hwgwManager) > 24) ns.run(hwgwManager, 1, '--prep', '--reserve', 24);

    darkweb = darkweb.filter(f => !ns.fileExists(f.name, 'home'));
    let darkwebFile = darkweb[0],
        fileId = 0;
    // Attempt to upgrade the home server to 512GB and buy all relevant darkweb files
    while ((ram = ns.getServerMaxRam('home')) < 512 || fileId < darkweb.length) {
        let upgradeCost = ns.getUpgradeHomeRamCost(ram * 2),
            cash = ns.getServerMoneyAvailable('home'),
            hackLvl = ns.getHackingLevel();

        // If we have enough cash, upgrade the home server ram to the next tier
        if (cash >= upgradeCost) {
            if (ns.upgradeHomeRam()) {
                cash -= upgradeCost;
                // If there is room for HWGW-runner and manager, lets get started prepping servers
                if (freeRam - ns.getScriptRam(wgwRunner) - ns.getScriptRam(hwgwManager) > 24) ns.run(hwgwManager, 1, '--prep', '--reserve', 24);
                ns.toast("HomeRam upgraded: " + (ram * 2), 'success', 5000);
            }
        }

        // Create AutoLink.exe then ServerProfiler.exe just for passive INT gain while CSCAN works
        // Specifically don't focus as INT gain is based on time it takes to complete
        if (!autoLinkStarted) {
            autoLinkStarted = ns.createProgram("AutoLink.exe", false);
        }
        if (ns.fileExists("AutoLink.exe", 'home') && !serverProfilerStarted && hackLvl >= 75) {
            serverProfilerStarted = ns.createProgram("ServerProfiler.exe", false);
        }

        // If we have enough cash, attempt to buy the cheapest darkweb file
        if (cash >= darkwebFile.cost) {
            if (ns.purchaseProgram(darkwebFile.name)) {
                ns.toast(darkwebFile.name + " acquired!", 'success', 5000);
                fileId++;
                if (fileId > darkweb.length) break;
                darkwebFile = darkweb[fileId];
                // New files means more servers we can access
                ns.run(rootHack, 1, '--backdoor-only');
            }
        }
        await ns.sleep(10000);
    }

    ns.print("CSCAN-Exclusive period completed. Joining factions/jobs no longer detremental to progress.")
    // Once our intial setup cost has been sunk we can start putting money into player owned servers
    ns.run(servers, 1, '--tail');
    // Run the stock puchasing script.  This will wait until we have enough money to invest
    ns.run(stocks);
    // Final set of prep, before we can kick off HWGW batches
    ns.run(hwgwManager, 1, '--prep', '--all-servers', '--reserve', 24);
}
