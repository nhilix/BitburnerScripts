// Stock market bot for bitburner, written by steamid/Meng- https://danielyxie.github.io/bitburner/
// Runs infinitely - buys and sells stock, hopefully for a profit...
// version 1.21 - Added check for max stocks, cleaned things up a bit, cycle complete prints less frequently

/** @param {NS} ns **/
export async function main(ns) {
    ns.print("Starting script here");
    ns.disableLog('sleep');
    ns.disableLog('getServerMoneyAvailable');

    let stockSymbols = ns.stock.getSymbols(); // all symbols
    let portfolio = []; // init portfolio
    let cycle = 0;
    let cycleProfit = 0;
    // ~~~~~~~You can edit these~~~~~~~~
    const forecastThresh = 0.62; // Buy above this confidence level (forecast%)
    const minimumCash = 5e9; // Minimum cash to keep ($50b)
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    ns.print("Starting run - Do we own any stocks?"); //Finds and adds any stocks we already own
    for (const stock of stockSymbols) {
        let pos = ns.stock.getPosition(stock);
        if (pos[0] > 0) {
            portfolio.push({ sym: stock, value: pos[1], shares: pos[0] })
            ns.print('Detected: ' + stock + ' quant: ' + ns.nFormat(pos[0], '0.00a') + ' @ ' + ns.nFormat(pos[1], '$0.00a'));
        };
    };

    while (true) {
        for (const stock of stockSymbols) { // for each stock symbol
            if (portfolio.findIndex(obj => obj.sym === stock) !== -1) { //if we already have this stock
                let i = portfolio.findIndex(obj => obj.sym === stock); // log index of symbol as i
                if (ns.stock.getAskPrice(stock) >= portfolio.value * 1.1) { // if the price is higher than what we bought it at +10% then we SELL
                    sellStock(stock);
                }
                else if (ns.stock.getForecast(stock) < 0.47) {
                    sellStock(stock);
                }
            }

            else if (ns.stock.getForecast(stock) >= forecastThresh) { // if the forecast is better than threshold and we don't own then BUY
                buyStock(stock);
            }
        } // end of for loop (iterating stockSymbols)
        cycle++;
        if (cycle % 5 === 0) {
            if (cycleProfit !== 0) {
                ns.print('Cycle ' + cycle + ' Complete With ' + ns.nFormat(cycleProfit, '$0.00a') + ' Profit');
            }
            cycleProfit = 0;
        };
        await ns.sleep(6000);
    } // end of while true loop

    function buyStock(stock) {
        let stockPrice = ns.stock.getAskPrice(stock); // Get the stockprice
        let shares = stockBuyQuantCalc(stockPrice, stock); // calculate the shares to buy using StockBuyQuantCalc

        if (ns.stock.getVolatility(stock) <= 0.05 && shares > 0) { // if volatility is < 5%, buy the stock if there is a non-zero quantity
            ns.stock.buy(stock, shares);
            ns.print('Bought: ' + stock + ' quant: ' + ns.nFormat(shares, '0.00a') + ' @ ' + ns.nFormat(stockPrice, '$0.00a'));

            portfolio.push({ sym: stock, value: stockPrice, shares: shares }); //store the purchase info in portfolio
        }
    }

    function sellStock(stock) {
        let position = ns.stock.getPosition(stock);
        var forecast = ns.stock.getForecast(stock);
        var stockPrice = ns.stock.getAskPrice(stock);
        if (forecast < 0.55) { // forecast still looks profitable, keep holding DIAMOND HANDS
            let i = portfolio.findIndex(obj => obj.sym === stock); //Find the stock info in the portfolio
            ns.print('SOLD: ' + stock + 'quant: ' + ns.nFormat(position[0], '0.00a') + '@ ' + ns.nFormat(stockPrice, '$0.00a'));
            portfolio.splice(i, 1); // Remove the stock from portfolio
            ns.stock.sell(stock, position[0]);
            cycleProfit += (position[0] * (stockPrice - position[1])) - 200000; // 100k for the buy transaction, 100k for the sell transaction
        }
    };

    function stockBuyQuantCalc(stockPrice, stock) { // Calculates how many shares to buy
        let playerMoney = ns.getServerMoneyAvailable('home') - minimumCash;
        if (playerMoney < 0) { return 0 }; // I have no money!? 
        let maxSpend = playerMoney * 0.4;
        let calcShares = maxSpend / stockPrice;
        let maxShares = ns.stock.getMaxShares(stock);

        if (calcShares > maxShares) {
            return maxShares
        }
        else { return calcShares }
    }
}