import {determineAction} from "/lib/util.js";

/** @param {import("../.").NS} ns **/
export async function main(ns) {
    var target = ns.args[0];

    var moneyThresh = ns.getServerMaxMoney(target) * 0.9;
    var securityThresh = ns.getServerMinSecurityLevel(target) + 1;
    while (true) {
        var action = determineAction(ns, target, moneyThresh, securityThresh);
        switch (action) {
            case 'grow':
                await ns.grow(target);
                break;
            case 'weaken':
                await ns.weaken(target);
                break;
            default:
                await ns.hack(target);
        }
    }
}