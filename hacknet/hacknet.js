import {currMoney} from "util.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("getServerMoneyAvailable");
    ns.disableLog("sleep");

    var cnt = ns.args[0];
    if (cnt == null) {cnt = 8};
    var lvl = ns.args[1];
    if (lvl == null) {lvl = 80};
    var ram = ns.args[2];
    if (ram == null) {ram = 16};
    var core = ns.args[3];
    if (core == null) {core = 8};
    var res;

    // Purchase up to the target count of hacknet nodes
    while(ns.hacknet.numNodes() < cnt) {
        var cost = ns.hacknet.getPurchaseNodeCost(cnt);
        while( currMoney(ns) < cost ){
            ns.print("Need $" + cost + ". Have $" + currMoney(ns));
            await ns.sleep(10e3);
        }
        res = ns.hacknet.purchaseNode();
        ns.print("Purchased hacknet Node with index "+res);
    };

    // Purchase level upgrades for each node up to target level
    for (var i=0; i < cnt;i++){
        while(ns.hacknet.getNodeStats(i).level < lvl){
            var cost = ns.hacknet.getLevelUpgradeCost(i,1);
            while( currMoney(ns) < cost ){
                ns.print("Need $" + cost + ". Have $" + currMoney(ns));
                await ns.sleep(10e3);
            };
            res = ns.hacknet.upgradeLevel(i, 1);
        };
    };

    ns.print("All nodes upgraded to lvl " + lvl);

    // Purchase RAM upgrades for each node up to MAX 16GB
    for (var i=0; i < cnt;i++){
        while(ns.hacknet.getNodeStats(i).ram < ram){
            var cost = ns.hacknet.getRamUpgradeCost(i,1);
            while( currMoney(ns) < cost ){
                ns.print("Need $" + cost + ". Have $" + currMoney(ns));
                await ns.sleep(10e3);
            };
            res = ns.hacknet.upgradeRam(i, 1);
        };
    };

    ns.print("All nodes upgraded to "+ram+"GB RAM");

    // Purchase level upgrades for each node up to target level
    for (var i=0; i < cnt;i++){
        while(ns.hacknet.getNodeStats(i).cores < core){
            var cost = ns.hacknet.getCoreUpgradeCost(i,1);
            while( currMoney(ns) < cost ){
                ns.print("Need $" + cost + ". Have $" + currMoney(ns));
                await ns.sleep(10e3);
            };
            res = ns.hacknet.upgradeCore(i, 1);
        };
    };

    ns.print("All nodes upgraded to "+core+" Cores");

}