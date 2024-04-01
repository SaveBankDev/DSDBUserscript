// ==UserScript==
// @name         Inc Zusammenfassung 5- beste Version bisher
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Fügt eine Zusammenfassung unterhalb der Headline ein
// @author       You
// @match        https://diestaemmedb.de/pages/attacks/attacks.php*
// @grant        none
// ==/UserScript==

// Event-Listener für die Taste "i" hinzufügen
document.addEventListener("keydown", function (event) {
    if (event.key === 'i') {
        console.log("Taste 'i' wurde gedrückt.");
        createSummaryWindow();
    } else if (event.key === 'Escape') {
        console.log("Taste 'Esc' wurde gedrückt.");
        const summaryDiv = document.getElementById("summaryDiv");
        if (summaryDiv) {
            document.body.removeChild(summaryDiv);
        }
    }
});

// Funktion zum Erstellen des Zusammenfassungsfensters
function createSummaryWindow() {
    const createTable = (header) => {
        const table = document.createElement("table");
        table.setAttribute("class", "summary-table");
        table.style.borderCollapse = "collapse";
        table.style.marginBottom = "100px"; // Abstand zur nächsten Tabelle
        table.style.width = "auto"; // Breite automatisch anpassen
        table.style.border = "1px solid white"; // Rahmen um die Tabelle
        table.style.color = "#ffffff"; // Textfarbe

        const tableHeader = table.createTHead();
        const headerRow = tableHeader.insertRow();
        const headerCell = headerRow.insertCell();
        headerCell.textContent = header;
        headerCell.style.fontWeight = "bold"; // Fetter Text für Überschrift
        headerCell.style.padding = "10px"; // Kleiner Abstand an den Tabellenrändern
        headerCell.style.border = "1px solid white"; // Innere Linien/Ränder

        const sumCell = headerRow.insertCell();
        sumCell.textContent = `Anzahl`;
        sumCell.style.fontWeight = "bold";
        sumCell.style.padding = "10px"; // Kleiner Abstand an den Tabellenrändern
        sumCell.style.border = "1px solid white"; // Innere Linien/Ränder

        const tableBody = table.createTBody();
        const namesCount = {};
        let totalCount = 0;
        document.querySelectorAll("table#All_Attacks tbody tr").forEach(row => {
            const name = header === "Verteidiger" ? row.cells[1].textContent.trim() : row.cells[3].textContent.trim();
            namesCount[name] = (namesCount[name] || 0) + 1;
            totalCount++;
        });

        // Sortiere die Zeilen absteigend nach den Werten in der Spalte Anzahl
        const sortedNames = Object.keys(namesCount).sort((a, b) => namesCount[b] - namesCount[a]);
        sortedNames.forEach(name => {
            const rowElement = tableBody.insertRow();
            const nameCell = rowElement.insertCell();
            nameCell.textContent = name;
            nameCell.style.padding = "10px"; // Kleiner Abstand an den Tabellenrändern
            nameCell.style.border = "1px solid white"; // Innere Linien/Ränder
            const countCell = rowElement.insertCell();
            countCell.textContent = namesCount[name];
            countCell.style.padding = "10px"; // Kleiner Abstand an den Tabellenrändern
            countCell.style.border = "1px solid white"; // Innere Linien/Ränder
        });

        const sumRow = tableBody.insertRow();
        sumRow.style.fontWeight = "bold";
        const sumCellName = sumRow.insertCell();
        sumCellName.textContent = "Incs Gesamt:";
        sumCellName.style.padding = "10px"; // Kleiner Abstand an den Tabellenrändern
        sumCellName.style.border = "1px solid white"; // Innere Linien/Ränder
        const sumCellCount = sumRow.insertCell();
        sumCellCount.textContent = totalCount;
        sumCellCount.style.padding = "10px"; // Kleiner Abstand an den Tabellenrändern
        sumCellCount.style.border = "1px solid white"; // Innere Linien/Ränder

        return table;
    };

    const summaryDiv = document.createElement("div");
    summaryDiv.setAttribute("id", "summaryDiv");
    summaryDiv.style.position = "fixed";
    summaryDiv.style.top = "50%";
    summaryDiv.style.left = "50%";
    summaryDiv.style.transform = "translate(-50%, -50%)"; // Zentrierung
    summaryDiv.style.backgroundColor = "#212428"; // Hintergrundfarbe
    summaryDiv.style.padding = "20px";
    summaryDiv.style.border = "1px solid white"; // Rahmen um den Container
    summaryDiv.style.zIndex = "9999";
    summaryDiv.style.color = "#ffffff"; // Textfarbe
    summaryDiv.style.width = "auto"; // Breite automatisch anpassen
    summaryDiv.style.boxSizing = "border-box";
    summaryDiv.style.marginLeft = "50px"; // Abstand zur linken Seite
    summaryDiv.style.marginRight = "50px"; // Abstand zur rechten Seite

    const closeButton = document.createElement("span");
    closeButton.textContent = "X";
    closeButton.style.position = "absolute";
    closeButton.style.top = "5px";
    closeButton.style.right = "5px";
    closeButton.style.cursor = "pointer";
    closeButton.style.fontWeight = "bold"; // Fetter Text für Schließen-Symbol
    closeButton.onclick = function () {
        document.body.removeChild(summaryDiv);
    };
    summaryDiv.appendChild(closeButton);

    const summaryHeading = document.createElement("h3");
    summaryHeading.innerHTML = "<div style='text-align: center; font-weight: bold; margin-bottom: 100px; border-bottom: 1px solid white;'>Inc Übersicht</div>";
    summaryDiv.appendChild(summaryHeading);

    const containerDiv = document.createElement("div");
    containerDiv.style.display = "flex";
    containerDiv.style.justifyContent = "space-between"; // Gleicher Platz zwischen den Tabellen
    containerDiv.appendChild(createTable("Verteidiger"));
    const spacer = document.createElement("div");
    spacer.style.width = "100px"; // Abstand zwischen den Tabellen
    containerDiv.appendChild(spacer);
    containerDiv.appendChild(createTable("Angreifer"));
    summaryDiv.appendChild(containerDiv);

    // Incs Gesamt unterhalb der Tabellen hinzufügen
    const totalIncDiv = document.createElement("div");
    totalIncDiv.textContent = "Incs Gesamt: " + getTotalIncCount();
    totalIncDiv.style.textAlign = "center";
    totalIncDiv.style.marginTop = "20px";
    totalIncDiv.style.fontWeight = "bold";
    summaryDiv.appendChild(totalIncDiv);

    document.body.appendChild(summaryDiv);
}

// Funktion zur Berechnung der Gesamtzahl der Incs
function getTotalIncCount() {
    let totalCount = 0;
    document.querySelectorAll("table#All_Attacks tbody tr").forEach(row => {
        totalCount++;
    });
    return totalCount;
}
