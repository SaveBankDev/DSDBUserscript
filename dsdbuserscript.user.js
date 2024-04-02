

// Install link:
// https://cdn.jsdelivr.net/gh/SaveBankDev/DSDBUserscript@main/dsdbuserscript.user.js


var sb_ALL_DATA;

// Create a loading bar
const loadingBar = document.createElement('div');
loadingBar.style.width = '0%';
loadingBar.style.height = '20px';
loadingBar.style.backgroundColor = 'green';

// Create a text node
const loadingText = document.createElement('div');
loadingText.textContent = 'Daten werden geladen';
loadingText.style.color = 'white';
loadingText.style.textAlign = 'center';

// Create a container for the loading text and bar
const loadingContainer = document.createElement('div');
loadingContainer.appendChild(loadingText);
loadingContainer.appendChild(loadingBar);

$("#All_Attacks_wrapper").prepend(loadingContainer);

async function getAllData(pageLink) {
    const data = [];
    const baseUrl = "https://diestaemmedb.de";
    let cache = getLocalStorage() || {};

    // Check if the cache is more than 5 hours old
    if (cache.timestamp && Date.now() - cache.timestamp > 900 * 60 * 1000) {
        cache = {}; // Clear the cache
    }

    // Fetch the page
    const response = await fetch(pageLink);
    const text = await response.text();

    // Process the page
    const rows = $(text).find("table#All_Attacks tbody tr");
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
            await new Promise(resolve => setTimeout(resolve, 200)); // Delay
            const response = await fetch(defender.profileUrl);
            const text = await response.text();
            const tribeName = $(text).find('#testServer').children('div').eq(1).find('table tr').eq(2).find('td').text().trim();
            defenderTribe = tribeName;
            cache[defender.profileUrl] = tribeName;
            cache.timestamp = Date.now(); // Update the timestamp
            saveLocalStorage(cache); // Save the cache to local storage
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

    return data;
}

async function fetchAllPages() {
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

    const allData = [];
    for (let i = 0; i < pageLinks.length; i++) {
        const data = await getAllData(pageLinks[i]);
        allData.push(...data);

        // Update the loading bar
        loadingBar.style.width = `${(i + 1) / pageLinks.length * 100}%`;

        await new Promise(resolve => setTimeout(resolve, 200)); // Delay of 200 ms
    }

    return allData;
}

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
    // createDailyIncomingsPieChart(chartDiv);
    createDailyIncomingsBarChart(chartDiv);

    // Button to toggle daily incommings
    const toggleDailyIncomingsButton = $("<button>").text('Incs nach Datum anzeigen/verstecken');

    // Create a new div and a table for "Verteidiger"
    const verteidigerTable = createPlayerDataTable("Verteidiger");
    const verteidigerDiv = $("<div>").append(verteidigerTable);

    // Create a new div and a table for "Angreifer"
    const angreiferTable = createPlayerDataTable("Angreifer");
    const angreiferDiv = $("<div>").append(angreiferTable);

    // Create a parent div with a flex layout for the "Verteidiger" and "Angreifer" tables
    const playerTablesDiv = $("<div>").css({
        display: 'flex', // Use Flexbox
        justifyContent: 'space-between', // Distribute items evenly
    }).append(
        $("<div>").css({ width: '50%' }).append(verteidigerDiv), // Wrap the "Verteidiger" table in a div and set its width to 50%
        $("<div>").css({ width: '50%' }).append(angreiferDiv), // Wrap the "Angreifer" table in a div and set its width to 50%
    );

    // Button to toggle the "Verteidiger" and "Angreifer" tables
    const togglePlayerTablesButton = $("<button>").text('Incs nach Verteidiger und Angreifer anzeigen/verstecken');

    // Button to toggle the incommings matrix
    const toggleMatrixButton = $("<button>").text('Angreifer/Verteidiger Matrix anzeigen/verstecken');

    // Create a container div and append the above divs to it
    const containerDiv = $("<div>");
    containerDiv.append(toggleDailyIncomingsButton);
    containerDiv.append(togglePlayerTablesButton);
    containerDiv.append(toggleMatrixButton);
    containerDiv.append(dailyIncomingsDiv);
    containerDiv.append(playerTablesDiv);

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
    playerTablesDiv.hide();


    // Define a CSS class for the toggled state
    const toggledClass = 'toggled';
    const toggledStyle = `
    .${toggledClass} {
        background-color: #BEBEBE; // Slightly darker grey
    }
`;
    $('<style>').text(toggledStyle).appendTo('head');
    // Add a click event listener to the buttons
    togglePlayerTablesButton.click(function (event) {
        event.preventDefault();
        playerTablesDiv.toggle();
        $(this).toggleClass(toggledClass); // Toggle the class
    });
    toggleDailyIncomingsButton.click(function (event) {
        event.preventDefault();
        dailyIncomingsDiv.toggle();
        $(this).toggleClass(toggledClass); // Toggle the class
    });
    toggleButton.click(function (event) {
        event.preventDefault();
        summaryDiv.children('div').toggle(); // Toggle the visibility of the divs inside the summaryDiv
        $(this).toggleClass(toggledClass); // Toggle the class
    });
    toggleMatrixButton.click(function (event) {
        event.preventDefault();
        incMatrixDiv.toggle();
        $(this).toggleClass(toggledClass); // Toggle the class
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
function createDailyIncomingsBarChart(parentElement) {
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

    // Prepare the data for the bar chart
    const labels = Object.keys(dailyIncomings).map(date => formatDate(parseInt(date, 10)));
    const counts = Object.values(dailyIncomings);

    // Define colors
    const colors = [
        '#B30000',
        '#00B300',
        '#0000B3',
        '#B3B300',
        '#00B3B3',
        '#B300B3',
        '#800000',
        '#008000',
        '#000080',
        '#808000',
        '#008080',
        '#800080',
        '#C04000',
        '#40C000',
        '#0040C0'
    ];

    // Create the canvas element and append it to the parent element
    const canvas = document.createElement('canvas');
    canvas.width = 450; // Set the width
    canvas.height = 450; // Set the height
    canvas.style.width = '450px'; // Set the CSS width
    canvas.style.height = '450px'; // Set the CSS height
    parentElement.append(canvas);

    // Create the bar chart
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors, // Set the color of the bars
                borderColor: '#000080', // Set the color of the bar borders
                borderWidth: 1 // Set the width of the bar borders
            }]
        },
        options: {
            responsive: false, // Set responsive to false
            plugins: {
                title: {
                    display: false // Hide the title
                },
                legend: {
                    display: false // Hide the legend
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
// unused for now
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
    canvas.width = 450; // Set the width
    canvas.height = 450; // Set the height
    canvas.style.width = '450px'; // Set the CSS width
    canvas.style.height = '450px'; // Set the CSS height
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
            responsive: false, // Set responsive to false
            plugins: {
                title: {
                    display: true,
                    text: 'Daily Incomings'
                }
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

fetchAllPages().then(data => {
    sb_ALL_DATA = data;
    console.log(sb_ALL_DATA);

    // Remove the loading bar
    loadingContainer.remove();

    createSummaryWindow();
});