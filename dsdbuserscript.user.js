// ==UserScript==
// @name         Inc Übersicht
// @namespace    https://diestaemmedb.de
// @version      0.2
// @description  Erstellt eine Übersicht für Incs auf der Angriffe-Seite
// @author       SaveBank, Canan
// @match        https://diestaemmedb.de/pages/attacks/attacks.php*
// @grant        none
// ==/UserScript==

// Install link:
// https://dl.dropboxusercontent.com/scl/fi/bad38r528gyv9bzsdkkff/dsdbuserscript.user.js?rlkey=9lrpcd2kmry1au6osvy3yfsel&dl=0


var sb_ALL_DATA;

async function getAllData() {
    const data = [];
    const baseUrl = "https://diestaemmedb.de";
    let cache = getLocalStorage() || {};
    let delay = 0;
    let counter = 0;

    // Check if the cache is more than an hour old
    if (cache.timestamp && Date.now() - cache.timestamp > 60 * 60 * 1000) {
        cache = {}; // Clear the cache
    }

    // Get all the page links
    let pageLinks = Array.from($('div#All_Attacks_wrapper').parent().parent().find('div').first().find('a'));
    const lastPageLink = pageLinks.find(a => a.textContent.includes('letzte'));

    if (lastPageLink) {
        const lastPageNumber = parseInt(new URLSearchParams(lastPageLink.href.split('?')[1]).get('seite'));
        const pageSize = new URLSearchParams(window.location.search).get('AnzahlproSeite');
        pageLinks = Array.from({ length: lastPageNumber }, (_, i) => `?seite=${i + 1}&AnzahlproSeite=${pageSize}`);
    } else {
        pageLinks = pageLinks.map(a => a.href);
        pageLinks.unshift(window.location.href);
    }

    // Fetch all the pages in parallel
    const pages = [];
    for (const link of pageLinks) {
        counter++;
        console.log(`Fetching page ${counter} of ${pageLinks.length}`)
        const response = await fetch(link);
        const text = await response.text();
        pages.push(text);
        await new Promise(resolve => setTimeout(resolve, 200)); // Delay of 150 ms
    }

    // Process each page
    for (const page of pages) {
        const rows = $(page).find("table#All_Attacks tbody tr");
        for (let i = 0; i < rows.length; i++) {
            const row = $(rows[i]);
            const cells = row.find('td');


            const attackType = cells.eq(0).text().trim();
            const defender = {
                name: cells.eq(1).text().trim(),
                profileUrl: baseUrl + cells.eq(1).find('a').attr('href')
            };
            const targetVillage = {
                coordinates: cells.eq(2).text().trim(),
                infoUrl: baseUrl + cells.eq(2).find('a').attr('href')
            };
            const attacker = {
                name: cells.eq(3).text().trim().substring(0, cells.eq(3).text().trim().lastIndexOf("(")).trim(),
                playerInfoUrl: baseUrl + cells.eq(3).find('a').first().attr('href'),
                tribeInfoUrl: baseUrl + cells.eq(3).find('a').last().attr('href')
            };
            const attackerTribe = cells.eq(3).text().trim().substring(cells.eq(3).text().trim().lastIndexOf("(") + 1, cells.eq(3).text().trim().lastIndexOf(")"));
            const originVillage = {
                coordinates: cells.eq(4).text().trim(),
                infoUrl: baseUrl + cells.eq(4).find('a').attr('href')
            };
            const analysisReason = cells.eq(5).text().trim();
            const loadedDateTime = parseGermanDate(cells.eq(6).text().trim(), false);
            const attackCount = {
                count: parseInt(cells.eq(7).text().trim(), 10),
                attacksUrl: baseUrl + cells.eq(7).find('a').attr('href')
            };
            const analysisResult = cells.eq(8).text().trim();
            const arrivalDateTime = parseGermanDate(cells.eq(9).text().trim(), true);

            let defenderTribe;

            if (cache[defender.profileUrl]) {
                defenderTribe = cache[defender.profileUrl];
            } else {
                console.log(`Fetching defender tribe for ${defender.name}`);
                await new Promise(resolve => setTimeout(resolve, delay)); // Delay
                const response = await fetch(defender.profileUrl);
                const text = await response.text();
                const tribeName = $(text).find('#testServer').children('div').eq(1).find('table tr').eq(2).find('td').text().trim();
                defenderTribe = tribeName;
                cache[defender.profileUrl] = tribeName;
                cache.timestamp = Date.now(); // Update the timestamp
                saveLocalStorage(cache); // Save the cache to local storage
                delay += 200; // Increase delay for each request by 200 ms
            }

            data.push({
                attackType,
                defender,
                defenderTribe,
                targetVillage,
                attacker,
                attackerTribe,
                originVillage,
                analysisReason,
                loadedDateTime,
                attackCount,
                analysisResult,
                arrivalDateTime
            });
        }
    }

    return data;
}

getAllData().then(data => {
    sb_ALL_DATA = data;
    console.log(sb_ALL_DATA);
    createSummaryWindow();
});

function createSummaryWindow() {
    // Create the summary div with a heading
    const summaryDiv = $("<div>").append($("<h3>").text('Inc Übersicht'));
    summaryDiv.attr("id", "summaryDiv");
    summaryDiv.addClass("row");

    // Create a button
    const toggleButton = $("<button>").text('Übersicht anzeigen/verstecken');

    summaryDiv.append(toggleButton);

    // Create a new div and a table for the daily incommings
    const dailyIncomingsTable = createDailyIncomingsTable();
    const dailyIncomingsDiv = $("<div>").css({
        display: 'flex', // Use Flexbox
        justifyContent: 'space-between', // Distribute items evenly
    }).append(
        $("<div>").css({ width: '50%' }).append(dailyIncomingsTable), // Wrap the table in a div and set its width to 50%
    );

    // Create and append a canvas with the id "myChart"
    const chartDiv = $("<div>").css({ width: '50%' }); // Create a div for the chart and set its width to 50%
    dailyIncomingsDiv.append(chartDiv);
    createDailyIncomingsPieChart(chartDiv);

    // Button to toggle daily incommings
    const toggleDailyIncomingsButton = $("<button>").text('Incs nach Datum anzeigen/verstecken');

    // Create a new div and a table for "Verteidiger"
    const verteidigerTable = createPlayerDataTable("Verteidiger");
    const verteidigerDiv = $("<div>").append(verteidigerTable);

    // Button to toggle the defender table
    const toggleDefenderButton = $("<button>").text('Incs nach Verteidiger anzeigen/verstecken');

    // Create a new div and a table for "Angreifer"
    const angreiferTable = createPlayerDataTable("Angreifer");
    const angreiferDiv = $("<div>").append(angreiferTable);

    // Button to toggle the attacker table
    const toggleAttackerButton = $("<button>").text('Incs nach Angreifer anzeigen/verstecken');

    // Button to toggle the incommings matrix
    const toggleMatrixButton = $("<button>").text('Angreifer/Verteidiger Matrix anzeigen/verstecken');

    // Create a container div and append the above divs to it
    const containerDiv = $("<div>");
    containerDiv.append(toggleDailyIncomingsButton);
    containerDiv.append(toggleAttackerButton);
    containerDiv.append(toggleDefenderButton);
    containerDiv.append(toggleMatrixButton);
    containerDiv.append(dailyIncomingsDiv);
    containerDiv.append(verteidigerDiv);
    containerDiv.append(angreiferDiv);

    // Add a table for the incommings matrix
    const incMatrixTable = createIncMatrixTable();
    const incMatrixDiv = $("<div>").append(incMatrixTable);
    containerDiv.append(incMatrixDiv);


    // Append the container div to the summary div
    summaryDiv.append(containerDiv);

    // Hide the divs inside the summary div
    summaryDiv.children('div').hide();
    incMatrixDiv.hide();
    dailyIncomingsDiv.hide();
    verteidigerDiv.hide();
    angreiferDiv.hide();

    // Add a click event listener to the buttons
    toggleDefenderButton.click(function (event) {
        event.preventDefault();
        verteidigerDiv.toggle();
    });
    toggleAttackerButton.click(function (event) {
        event.preventDefault();
        angreiferDiv.toggle();
    });
    toggleDailyIncomingsButton.click(function (event) {
        event.preventDefault();
        dailyIncomingsDiv.toggle();
    });
    toggleButton.click(function (event) {
        event.preventDefault();
        summaryDiv.children('div').toggle(); // Toggle the visibility of the divs inside the summaryDiv
    });
    toggleMatrixButton.click(function (event) {
        event.preventDefault();
        incMatrixDiv.toggle();
    });
    // Prepend the summary div to the wrapper div
    $("#All_Attacks_wrapper").prepend(summaryDiv);
}

function createIncMatrix() {
    const data = sb_ALL_DATA;
    const matrix = {};
    const defenders = new Set();
    const attackers = new Set();
    const attackerTotals = {};
    const defenderTotals = {};

    data.forEach(item => {
        const defender = `${item.defender.name} (${item.defenderTribe})`;
        const attacker = `${item.attacker.name} (${item.attackerTribe})`;
        defenders.add(defender);
        attackers.add(attacker);
        matrix[defender] = matrix[defender] || {};
        matrix[defender][attacker] = (matrix[defender][attacker] || 0) + 1;
        attackerTotals[attacker] = (attackerTotals[attacker] || 0) + 1;
        defenderTotals[defender] = (defenderTotals[defender] || 0) + 1;
    });

    // Ensure all attackers are present for each defender
    defenders.forEach(defender => {
        attackers.forEach(attacker => {
            matrix[defender][attacker] = matrix[defender][attacker] || 0;
        });
    });

    return { matrix, attackerTotals, defenderTotals };
}

function createIncMatrixTable() {
    const incMatrixData = createIncMatrix();
    const { matrix, attackerTotals, defenderTotals } = incMatrixData;

    const table = $("<table>").addClass("summary-table table table-dark dataTable no-footer");

    // Create the table header
    const tableHeader = $("<thead>");
    const headerRow = $("<tr>");

    // Add a blank cell at the start of the header row for the "Attacker \ Defender" cell
    const headerCell = $("<th>").text("Attacker \\ Defender").css("border-right", "1px solid white");
    headerRow.append(headerCell);

    // Sort the attacker names by total attacks sent and add a header cell for each "attacker"
    const attackerNames = Object.keys(attackerTotals).sort((a, b) => attackerTotals[b] - attackerTotals[a]);
    attackerNames.forEach(attacker => {
        const attackerHeaderCell = $("<th>").text(attacker);
        headerRow.append(attackerHeaderCell);
    });

    tableHeader.append(headerRow);
    table.append(tableHeader);

    // Create the table body
    const tableBody = $("<tbody>");

    // Sort the defender names by total attacks received
    const defenderNames = Object.keys(defenderTotals).sort((a, b) => defenderTotals[b] - defenderTotals[a]);
    defenderNames.forEach(defender => {
        const rowElement = $("<tr>");
        const nameCell = $("<td>").html(`<b>${defender}</b>`).css("border-right", "1px solid white"); // Make the defender names bold
        rowElement.append(nameCell);
        attackerNames.forEach(attacker => {
            const countCell = $("<td>").text(matrix[defender][attacker]);
            rowElement.append(countCell);
        });
        tableBody.append(rowElement);
    });

    table.append(tableBody);
    return table;
}

function createDailyIncomingsPieChart(parentElement) {
    const data = sb_ALL_DATA;
    const dailyIncomings = {};

    // Count the number of incommings for each day
    data.forEach(item => {
        const arrivalDate = item.arrivalDateTime;
        const arrivalDay = new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), arrivalDate.getDate()).getTime(); // Get the day of arrival (ignoring time)

        if (!dailyIncomings[arrivalDay]) {
            dailyIncomings[arrivalDay] = 0;
        }

        dailyIncomings[arrivalDay]++;
    });

    // Prepare the data for the pie chart
    const labels = Object.keys(dailyIncomings).map(date => formatDate(parseInt(date, 10)));
    const counts = Object.values(dailyIncomings);

    // Create the canvas element and append it to the parent element
    const canvas = document.createElement('canvas');
    canvas.width = 100; // Set the width
    canvas.height = 100; // Set the height
    parentElement.append(canvas);

    // Define 15 colors
    const colors = [
        '#B30000', // Darker Red
        '#00B300', // Darker Green
        '#0000B3', // Darker Blue
        '#B3B300', // Darker Yellow (Red + Green)
        '#00B3B3', // Darker Cyan (Green + Blue)
        '#B300B3', // Darker Magenta (Red + Blue)
        '#800000', // Even Darker Red
        '#008000', // Even Darker Green
        '#000080', // Even Darker Blue
        '#808000', // Even Darker Yellow
        '#008080', // Even Darker Cyan
        '#800080', // Even Darker Magenta
        '#C04000', // Mixture of Red and Yellow
        '#40C000', // Mixture of Green and Yellow
        '#0040C0'  // Mixture of Blue and Cyan
    ];

    // Create the pie chart
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: labels.map((_, i) => i < colors.length ? colors[i] : '#' + Math.floor(Math.random() * 16777215).toString(16)), // Use defined colors first, then generate random colors
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: 'Daily Incomings'
            }
        }
    });
}

function createDailyIncomingsTable() {
    const data = sb_ALL_DATA;
    const dailyIncomings = {};

    // Count the number of incommings for each day
    data.forEach(item => {
        const arrivalDate = item.arrivalDateTime;
        const arrivalDay = new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), arrivalDate.getDate()).getTime(); // Get the day of arrival (ignoring time)

        if (!dailyIncomings[arrivalDay]) {
            dailyIncomings[arrivalDay] = 0;
        }

        dailyIncomings[arrivalDay]++;
    });

    // Create the table
    const table = $("<table>").addClass("summary-table table table-dark dataTable no-footer");

    // Create the table header
    const tableHeader = $("<thead>");
    const headerRow = $("<tr>");
    const dateHeaderCell = $("<th>").text("Datum");
    const countHeaderCell = $("<th>").text("Anzahl der Angriffe");
    headerRow.append(dateHeaderCell, countHeaderCell);
    tableHeader.append(headerRow);
    table.append(tableHeader);

    // Create the table body
    const tableBody = $("<tbody>");

    // Sort the dates and add a row for each day
    const sortedDates = Object.keys(dailyIncomings).sort();
    sortedDates.forEach(date => {
        const rowElement = $("<tr>");
        const dateCell = $("<td>").text(formatDate(parseInt(date, 10)));
        const countCell = $("<td>").text(dailyIncomings[date]);
        rowElement.append(dateCell, countCell);
        tableBody.append(rowElement);
    });

    table.append(tableBody);
    return table;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const day = ('0' + date.getDate()).slice(-2); // Get the day with leading 0 if necessary
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // Get the month with leading 0 if necessary (months are 0-indexed in JavaScript)
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function parseGermanDate(dateString, hasMilliseconds) {
    const [datePart, timePart] = dateString.split(' ');
    const [day, month, year] = datePart.split('.').map(Number);
    const timeParts = timePart.split(':').map(Number);
    if (hasMilliseconds) {
        const milliseconds = timeParts.pop();
        return new Date(year >= 100 ? year : year + 2000, month - 1, day, ...timeParts, milliseconds);
    } else {
        return new Date(year >= 100 ? year : year + 2000, month - 1, day, ...timeParts);
    }
}
function createPlayerDataTable(header) {
    const namesCount = {};
    const tribesCount = {};
    let totalCount = 0;

    const allData = sb_ALL_DATA;

    allData.forEach(function (row) {
        let name, tribe;
        if (header === "Verteidiger") {
            name = row.defender.name;
            tribe = row.defenderTribe;
        } else {
            name = row.attacker.name;
            tribe = row.attackerTribe;
        }
        namesCount[name] = (namesCount[name] || 0) + 1;
        tribesCount[name] = tribe;
        totalCount++;
    });

    // Create the table and add classes
    const table = $("<table>").addClass("summary-table table table-dark dataTable no-footer");

    // Create the table header
    const tableHeader = $("<thead>");
    const headerRow = $("<tr>");
    const headerCell = $("<th>").text(header);
    const tribeCell = $("<th>").text('Stamm');
    const sumCell = $("<th>").text('Anzahl');
    headerRow.append(headerCell, tribeCell, sumCell);
    tableHeader.append(headerRow);
    table.append(tableHeader);

    // Create the table body
    const tableBody = $("<tbody>");

    // Sort the rows in descending order by the values in the 'Anzahl' column
    const sortedNames = Object.keys(namesCount).sort((a, b) => namesCount[b] - namesCount[a]);
    sortedNames.forEach(name => {
        const rowElement = $("<tr>");
        const nameCell = $("<td>").text(name);
        const tribeCell = $("<td>").text(tribesCount[name]);
        const countCell = $("<td>").text(namesCount[name]);
        rowElement.append(nameCell, tribeCell, countCell);
        tableBody.append(rowElement);
    });

    // Add a row for the total count
    const sumRow = $("<tr>").css("font-weight", "bold");
    const sumCellName = $("<td>").text("Incs Gesamt:");
    const sumCellCount = $("<td>").text(totalCount);
    sumRow.append(sumCellName, sumCellCount);
    tableBody.append(sumRow);

    // Append the table body to the table
    table.append(tableBody);

    return table;
}

function getLocalStorage() {
    const data = localStorage.getItem("sbDSDBData");
    return data ? JSON.parse(data) : null;
}

function saveLocalStorage(data) {
    localStorage.setItem("sbDSDBData", JSON.stringify(data));
}
