// ==UserScript==
// @name         Inc Zusammenfassung
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Fügt eine Zusammenfassung unterhalb der Headline ein
// @author       Canan, SaveBank
// @match        https://diestaemmedb.de/pages/attacks/attacks.php*
// @grant        none
// ==/UserScript==


function createSummaryWindow() {
    // Create the summary div with a heading
    const summaryDiv = $("<div>").append($("<h3>").text('Inc Übersicht'));
    summaryDiv.attr("id", "summaryDiv");
    summaryDiv.addClass("row");

    // Create a button
    const toggleButton = $("<button>").text('Übersicht anzeigen/verstecken');


    // Add a click event listener to the button
    toggleButton.click(function (event) {
        event.preventDefault();
        summaryDiv.children('div').toggle(); // Toggle the visibility of the divs inside the summaryDiv
    });

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

    // Append the container div to the summary div
    summaryDiv.append(containerDiv);

    // Hide the divs inside the summary div
    summaryDiv.children('div').hide();

    // Prepend the summary div to the wrapper div
    $("#All_Attacks_wrapper").prepend(summaryDiv);
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