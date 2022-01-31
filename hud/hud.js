/** @param {NS} ns **/
export async function main(ns) {
    let stockSymbols = [];
    try{
        stockSymbols = ns.stock.getSymbols();
    } catch (err) {
        ns.print('No WSE account, skipping stocks in HUD');
    }
    const hook0 = eval("document.getElementById('overview-extra-hook-0')");
    const hook1 = eval("document.getElementById('overview-extra-hook-1')");
    var sRam = 0;
    var ramPort = ns.getPortHandle(1);

    while( true ) {
        var investment = 0;
        var position = 0;
        for (const stock of stockSymbols) {
            let pos = ns.stock.getPosition(stock);
            if (pos[0] > 0) {
                investment += pos[0] * pos[1];
                position += pos[0] * ns.stock.getAskPrice(stock);
            }
        }
        if (!ramPort.empty()) {
            sRam = ramPort.read();
        } else {
            try {
                sRam = ns.getServerMaxRam('leaf');
            } catch (err) {null;}
        }
        var homeRam = ns.getServerMaxRam('home');
        var usedRam = ns.getServerUsedRam('home');
        try {
            const headers = []
            const values = [];
            // Add script income per second
            headers.push("Inc");
            values.push(ns.nFormat(ns.getScriptIncome()[0],'$0.00a') + '/sec');
            // Add script exp gain rate per second
            headers.push("HExp");
            values.push(ns.nFormat(ns.getScriptExpGain(),'0.00a') + '/sec');
            // Add total investment in stock market
            headers.push("StkI");
            values.push(ns.nFormat(investment,'$0.00a'));
            // Add total current position in stock market
            headers.push("StkP");
            values.push(ns.nFormat(position,'$0.00a'));
            // Add available home ram
            headers.push("HomeRam");
            values.push(ns.nFormat((homeRam - usedRam)* 1e9,'0.00b')+'/'+ns.nFormat(homeRam * 1e9,'0.00b'));
            // Add current servers.js ram target
            headers.push("ServerRam");
            values.push(ns.nFormat(Math.min(sRam,Math.pow(2,20)) * 1e9,'0.00b'));

            // Now drop it into the placeholder elements
            hook0.innerText = headers.join(" \n");
            hook1.innerText = values.join("\n");
        } catch (err) { // This might come in handy later
            ns.print("ERROR: Update Skipped: " + String(err));
        }
        await ns.sleep(1000);
    }
}