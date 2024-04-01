// ==UserScript==
// @name         Inc Übersicht
// @namespace    https://diestaemmedb.de
// @version      0.2
// @description  Erstellt eine Übersicht für Incs auf der Angriffe-Seite
// @author       Canan, SaveBank
// @match        https://diestaemmedb.de/pages/attacks/attacks.php*
// @grant        none
// ==/UserScript==

// Install link:
// https://dl.dropboxusercontent.com/scl/fi/bad38r528gyv9bzsdkkff/dsdbuserscript.user.js?rlkey=9lrpcd2kmry1au6osvy3yfsel&dl=0

function createSummaryWindow() {
    // Create the summary div with a heading
    const summaryDiv = $("<div>").append($("<h3>").text('Inc Übersicht'));
    summaryDiv.attr("id", "summaryDiv");
    summaryDiv.addClass("row");

    // Create a button
    const toggleButton = $("<button>").text('Übersicht anzeigen/verstecken');

    summaryDiv.append(toggleButton);

    summaryDiv.attr("id", "summaryDiv");
    summaryDiv.addClass("row");

    // Create a new div and a table for "Verteidiger"
    const verteidigerTable = createTable("Verteidiger");
    const verteidigerDiv = $("<div>").append(verteidigerTable);

    // Create a new div and a table for "Angreifer"
    const angreiferTable = createTable("Angreifer");
    const angreiferDiv = $("<div>").append(angreiferTable);

    // Create a container div and append the above divs to it
    const containerDiv = $("<div>");
    containerDiv.append(verteidigerDiv);
    containerDiv.append(angreiferDiv);

    // Add a button to toggle the visibility of the incoming matrix table
    const toggleMatrixButton = $("<button>").text('Matrix anzeigen/verstecken');

    containerDiv.append(toggleMatrixButton);

    // Add a table for the incommings matrix
    const incMatrixTable = createIncMatrixTable(createIncMatrix());
    const incMatrixDiv = $("<div>").append(incMatrixTable);
    containerDiv.append(incMatrixDiv);

    // Append the container div to the summary div
    summaryDiv.append(containerDiv);

    // Hide the divs inside the summary div
    summaryDiv.children('div').hide();
    incMatrixDiv.hide();

    // Add a click event listener to the buttons
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

// Create an incomings matrix
function createIncMatrix() {
    const matrix = {};
    const verteidigers = new Set();
    const angreifers = new Set();
    const angreiferTotals = {};
    const verteidigerTotals = {};

    $("table#All_Attacks tbody tr").each(function () {
        const verteidiger = $(this).find('td').eq(1).text().trim();
        const angreifer = $(this).find('td').eq(3).text().trim();
        verteidigers.add(verteidiger);
        angreifers.add(angreifer);
        matrix[verteidiger] = matrix[verteidiger] || {};
        matrix[verteidiger][angreifer] = (matrix[verteidiger][angreifer] || 0) + 1;
        angreiferTotals[angreifer] = (angreiferTotals[angreifer] || 0) + 1;
        verteidigerTotals[verteidiger] = (verteidigerTotals[verteidiger] || 0) + 1;
    });

    // Ensure all angreifers are present for each verteidiger
    verteidigers.forEach(verteidiger => {
        angreifers.forEach(angreifer => {
            matrix[verteidiger][angreifer] = matrix[verteidiger][angreifer] || 0;
        });
    });

    return { matrix, angreiferTotals, verteidigerTotals };
}

// Creates a table displaying the incommings matrix
function createIncMatrixTable(data) {
    const { matrix, angreiferTotals, verteidigerTotals } = data;

    const table = $("<table>").addClass("summary-table table table-dark dataTable no-footer");

    // Create the table header
    const tableHeader = $("<thead>");
    const headerRow = $("<tr>");

    // Add a blank cell at the start of the header row for the "Verteidiger \ Angreifer" label
    const headerCell = $("<th>").text("Verteidiger \\ Angreifer");
    headerRow.append(headerCell);

    // Sort the angreifer names by total attacks sent and add a header cell for each "angreifer"
    const angreiferNames = Object.keys(angreiferTotals).sort((a, b) => angreiferTotals[b] - angreiferTotals[a]);
    angreiferNames.forEach(angreifer => {
        const angreiferHeaderCell = $("<th>").text(angreifer);
        headerRow.append(angreiferHeaderCell);
    });

    tableHeader.append(headerRow);
    table.append(tableHeader);

    // Create the table body
    const tableBody = $("<tbody>");

    // Sort the verteidiger names by total attacks received
    const verteidigerNames = Object.keys(verteidigerTotals).sort((a, b) => verteidigerTotals[b] - verteidigerTotals[a]);
    verteidigerNames.forEach(verteidiger => {
        const rowElement = $("<tr>");
        const nameCell = $("<td>").text(verteidiger);
        rowElement.append(nameCell);
        angreiferNames.forEach(angreifer => {
            const countCell = $("<td>").text(matrix[verteidiger][angreifer]);
            rowElement.append(countCell);
        });
        tableBody.append(rowElement);
    });

    table.append(tableBody);
    return table;
}

function createTable(header) {
    // Create the table and add classes
    const table = $("<table>").addClass("summary-table table table-dark dataTable no-footer");

    // Create the table header
    const tableHeader = $("<thead>");
    const headerRow = $("<tr>");
    const headerCell = $("<th>").text(header);
    const sumCell = $("<th>").text('Anzahl');
    headerRow.append(headerCell, sumCell);
    tableHeader.append(headerRow);
    table.append(tableHeader);

    // Create the table body
    const tableBody = $("<tbody>");
    const namesCount = {};
    let totalCount = 0;

    // Populate the table body
    $("table#All_Attacks tbody tr").each(function () {
        const name = header === "Verteidiger" ? $(this).find('td').eq(1).text().trim() : $(this).find('td').eq(3).text().trim();
        namesCount[name] = (namesCount[name] || 0) + 1;
        totalCount++;
    });

    // Sort the rows in descending order by the values in the 'Anzahl' column
    const sortedNames = Object.keys(namesCount).sort((a, b) => namesCount[b] - namesCount[a]);
    sortedNames.forEach(name => {
        const rowElement = $("<tr>");
        const nameCell = $("<td>").text(name);
        const countCell = $("<td>").text(namesCount[name]);
        rowElement.append(nameCell, countCell);
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
createSummaryWindow();