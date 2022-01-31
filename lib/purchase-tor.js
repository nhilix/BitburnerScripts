/** @param {NS} ns **/
export async function main(ns) {
    // Wait until we have $200k for the TOR
    while(ns.getServerMoneyAvailable('home') < 2e5) {
        await ns.sleep(1000);
    }
    ns.purchaseTor();
    ns.toast('Purchased TOR!','success',5000);
}